#!/usr/bin/env node

import {
  Agent,
  OpenAIChatCompletionsModel,
  Runner,
  setTracingDisabled,
  type Model,
  type ModelProvider,
  type RunItem,
  tool,
} from '@openai/agents';
import { tavily } from '@tavily/core';
import { config as loadEnv } from 'dotenv';
import { mkdir, writeFile } from 'fs/promises';
import { basename, dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = resolve(__dirname, '../..');
loadEnv({ path: join(workspaceRoot, '.env'), quiet: true });
setTracingDisabled(true);

const REPORTS_DIR = join(__dirname, 'reports');
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-5.4';
const DEFAULT_MAX_TURNS = 18;
const READ_URL_MAX_CHARS = Number.parseInt(process.env.JINA_READ_CHAR_LIMIT ?? '14000', 10);
const TRACE_PREVIEW_CHARS = 240;

const SourceTypeSchema = z.enum([
  'peer_reviewed_journal',
  'news_organization',
  'government_agency',
  'nonprofit_organization',
  'corporate_blog',
  'personal_blog',
  'social_media',
  'wiki',
  'unknown',
]);

const EditorialProcessSchema = z.enum(['peer_reviewed', 'editor_reviewed', 'self_published', 'unknown']);
const OverallCredibilitySchema = z.enum(['high', 'medium', 'low', 'very_low']);

const ReadUrlArgsSchema = z.object({
  url: z
    .string()
    .min(1)
    .describe('The absolute URL to read with the Jina Reader, including https://.'),
});

const WebSearchArgsSchema = z.object({
  query: z
    .string()
    .min(3)
    .describe(
      'A focused search query used to investigate the author, publication, corroboration, contradictions, fact checks, or primary sources.'
    ),
});

const WriteFileArgsSchema = z.object({
  filename: z
    .string()
    .min(1)
    .describe('Markdown filename for the final report, such as source-credibility-report.md.'),
  content: z
    .string()
    .min(1)
    .describe('Complete Markdown report content. Include the structured evaluation and the references you used.'),
});

const CredibilityEvaluationSchema = z.object({
  source_url: z
    .string()
    .min(1)
    .describe('The exact URL being evaluated. Use the original full URL string.'),
  source_type: SourceTypeSchema.describe(
    'Choose the best fit for the source based on your investigation of the site and publication context.'
  ),
  author: z.object({
    name: z
      .string()
      .describe(
        'Author name. If you cannot identify an author after investigating the page, about pages, and search results, write "Unknown".'
      ),
    credentials: z
      .string()
      .describe(
        'The author\'s qualifications, affiliations, or expertise. If you could not find any, describe what you searched for.'
      ),
    credibility_assessment: z
      .string()
      .describe(
        'Your credibility assessment of the author, including how missing information affects the overall trust level.'
      ),
  }),
  publication: z.object({
    name: z
      .string()
      .describe('Publication or website name. If the outlet is unclear, use the domain name.'),
    reputation: z
      .string()
      .describe(
        'What your research revealed about this publication, its ownership, reputation, standards, or lack of transparency.'
      ),
    editorial_process: EditorialProcessSchema.describe(
      'Whether the publication appears peer reviewed, editor reviewed, self published, or unknown.'
    ),
  }),
  content_analysis: z.object({
    claims_supported_by_evidence: z
      .boolean()
      .describe('True only if the main claims are backed by data, citations, documents, or primary sources.'),
    sources_cited: z
      .boolean()
      .describe('True if the article itself cites sources, links to evidence, or references supporting material.'),
    corroborated_by_other_sources: z
      .boolean()
      .describe('True if other credible sources independently support the main claims.'),
    contradicted_by_other_sources: z
      .boolean()
      .describe('True if credible sources materially contradict the claims in the source.'),
    language_is_objective: z
      .boolean()
      .describe('True if the tone is mostly neutral, factual, and informational rather than emotionally persuasive.'),
    date_published: z
      .string()
      .describe('The publication date if known. If not known, write "Unknown".'),
    currency_assessment: z
      .string()
      .describe('Explain whether the information appears current, outdated, timeless, or impossible to date.'),
    key_claims_checked: z
      .array(z.string().min(1))
      .min(1)
      .describe('The main claims you actively tried to verify.'),
    corroboration_notes: z
      .string()
      .describe(
        'Summarize what corroborating or contradicting evidence you found, and mention any important claims that remained unverified.'
      ),
  }),
  overall_credibility: OverallCredibilitySchema.describe(
    'Overall credibility rating after considering authorship, publication quality, evidence, corroboration, bias, and currency.'
  ),
  reasoning: z
    .string()
    .describe(
      'Explain the overall rating using concrete evidence from your investigation. Mention both strengths and red flags, and be explicit about unknowns.'
    ),
});

type CredibilityEvaluation = z.infer<typeof CredibilityEvaluationSchema>;

type ParsedArgs = {
  sourceUrl: string;
  outputFilename: string;
  modelName: string;
  maxTurns: number;
};

let lastEvaluation: CredibilityEvaluation | null = null;
let lastReportPath: string | null = null;

class OpenRouterModelProvider implements ModelProvider {
  constructor(
    private readonly client: OpenAI,
    private readonly fallbackModel: string
  ) {}

  async getModel(modelName?: string): Promise<Model> {
    return new OpenAIChatCompletionsModel(this.client as any, modelName || this.fallbackModel);
  }
}

function usage(): string {
  return [
    'Usage:',
    '  credibility-analyzer <sourceUrl> [--output report.md] [--turns 18] [--model openai/gpt-5.4-mini]',
    '',
    'Examples:',
    '  npm run dev -- https://www.canada.ca/en/public-health/services/diseases/coronavirus-disease-covid-19.html',
    '  npm run dev -- https://www.reuters.com/ --output reuters-check.md --turns 20',
  ].join('\n');
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    throw new Error(usage());
  }

  let sourceUrl = '';
  let outputFilename = '';
  let modelName = DEFAULT_MODEL;
  let maxTurns = DEFAULT_MAX_TURNS;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--output' || arg === '-o') {
      const value = args[i + 1];
      if (!value) {
        throw new Error('Missing value for --output\n\n' + usage());
      }
      outputFilename = sanitizeReportFilename(value);
      i += 1;
      continue;
    }

    if (arg === '--model' || arg === '-m') {
      const value = args[i + 1];
      if (!value) {
        throw new Error('Missing value for --model\n\n' + usage());
      }
      modelName = value;
      i += 1;
      continue;
    }

    if (arg === '--turns' || arg === '-t') {
      const value = args[i + 1];
      if (!value) {
        throw new Error('Missing value for --turns\n\n' + usage());
      }

      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error(`Invalid --turns value: ${value}`);
      }

      maxTurns = parsed;
      i += 1;
      continue;
    }

    if (!sourceUrl) {
      sourceUrl = arg;
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}\n\n${usage()}`);
  }

  if (!sourceUrl) {
    throw new Error('Missing source URL\n\n' + usage());
  }

  try {
    const parsedUrl = new URL(sourceUrl);
    if (!/^https?:$/.test(parsedUrl.protocol)) {
      throw new Error('URL must use http:// or https://');
    }
  } catch (error) {
    throw new Error(`Invalid source URL: ${sourceUrl} (${formatError(error)})`);
  }

  if (!outputFilename) {
    outputFilename = deriveDefaultReportFilename(sourceUrl);
  }

  return { sourceUrl, outputFilename, modelName, maxTurns };
}

function sanitizeReportFilename(filename: string): string {
  const fileOnly = basename(filename.replace(/\\/g, '/'));
  const withoutExtension = fileOnly.replace(/\.md$/i, '');
  const sanitized = withoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
    .slice(0, 120);

  return `${sanitized || 'credibility-report'}.md`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function deriveDefaultReportFilename(sourceUrl: string): string {
  const parsed = new URL(sourceUrl);
  const host = slugify(parsed.hostname.replace(/^www\./, '')) || 'source';
  const leaf = slugify(parsed.pathname.split('/').filter(Boolean).pop() || 'article') || 'article';
  return sanitizeReportFilename(`${host}-${leaf}-credibility-report.md`);
}

function truncateText(text: string, maxChars: number): string {
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

function preview(value: unknown, maxChars = TRACE_PREVIEW_CHARS): string {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  const normalized = (raw || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars - 3)}...`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function trimTavilyResponse(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    return { status: 'ok', raw };
  }

  const response = raw as Record<string, any>;
  const results = Array.isArray(response.results)
    ? response.results.slice(0, 5).map((result: Record<string, any>) => ({
        title: result.title,
        url: result.url,
        content: typeof result.content === 'string' ? truncateText(result.content, 900) : result.content,
        score: result.score,
      }))
    : [];

  return {
    status: 'ok',
    query: response.query,
    answer: typeof response.answer === 'string' ? truncateText(response.answer, 1000) : response.answer,
    results,
  };
}

function buildSystemPrompt(preferredFilename: string): string {
  return `You are a Research Source Credibility Analyzer Agent.

Your mission is to investigate the credibility of exactly one source URL and produce a careful evidence-based report.

You must follow this workflow:
1. Read the target source with read_url.
2. Identify the article's main claims, the author, the publication, and the publication date.
3. Investigate the author. Search for their credentials, affiliations, and relevant expertise. If needed, read author bio pages, about pages, team pages, or contact pages on the same domain.
4. Investigate the publication. Search for the outlet's reputation, ownership, editorial standards, peer review or editor review process, and read the site's About or editorial policy pages when available.
5. Verify important claims. Search for corroborating coverage, fact checks, contradictions, and primary sources.
6. Assess bias, tone, and currency. Determine whether the language is neutral or persuasive, and whether the information is current or outdated.
7. Write the final Markdown report with write_file after you have investigated the source carefully.
8. Then respond briefly with the file path and the overall verdict.

Hard rules:
- Never guess or fabricate missing facts.
- If something remains unknown after investigation, say so explicitly.
- Missing authorship, unclear publication standards, weak citations, lack of corroboration, or contradictions are all meaningful findings.
- Distinguish between "I found contradictory evidence" and "I could not verify the claim".
- If read_url fails because the page is blocked, missing, or unreadable, record the failure, use web_search to investigate the source from other pages, and make only a limited assessment.
- If a tool errors or rate limits, explain what failed, retry with a more focused query when reasonable, and continue with the best available evidence.

Tool expectations:
- Use read_url for the source itself and for relevant about pages, author bios, editorial policy pages, or primary sources.
- Use web_search to investigate the author, publication, corroboration, contradictions, and fact checks.
- Use write_file only for the final Markdown report.

Final report requirements:
- A clear title
- The source URL
- An executive summary
- Findings for authorship, publication, evidence and citations, corroboration, bias and tone, and currency
- The structured evaluation rendered as pretty JSON in a fenced code block
- A final verdict with reasoning
- A references section listing the URLs you actually used

When calling write_file, you must use this exact filename unless the tool reports a filename issue: ${preferredFilename}`;
}

function createTools(tvly: ReturnType<typeof tavily>) {
  const readUrlTool = tool({
    name: 'read_url',
    description:
      'Fetch a web page through the Jina Reader and return readable markdown so you can inspect the target article, author bios, about pages, editorial policies, and corroborating sources.',
    parameters: ReadUrlArgsSchema,
    async execute({ url }) {
      try {
        const parsed = new URL(url);
        if (!/^https?:$/.test(parsed.protocol)) {
          throw new Error('Only http:// and https:// URLs are supported.');
        }
      } catch (error) {
        return {
          status: 'error',
          url,
          error: `Invalid URL: ${formatError(error)}`,
        };
      }

      try {
        console.error(`[credibility-analyzer] read_url -> ${url}`);
        const response = await fetch(`https://r.jina.ai/${url}`, {
          headers: {
            Accept: 'text/plain',
            'User-Agent': 'source-credibility-analyzer-agent/1.0',
          },
          signal: AbortSignal.timeout(30000),
        });

        const text = await response.text();
        const content = truncateText(text, READ_URL_MAX_CHARS);

        return {
          status: response.ok ? 'ok' : 'warning',
          url,
          reader_status: response.status,
          truncated: text.length > READ_URL_MAX_CHARS,
          original_characters: text.length,
          content,
          note: response.ok
            ? undefined
            : `Reader returned HTTP ${response.status}. Use the content cautiously and verify with search if needed.`,
        };
      } catch (error) {
        return {
          status: 'error',
          url,
          error: formatError(error),
        };
      }
    },
  });

  const webSearchTool = tool({
    name: 'web_search',
    description:
      'Search the web using Tavily to investigate authors, publications, corroboration, contradictions, fact checks, and primary sources.',
    parameters: WebSearchArgsSchema,
    async execute({ query }) {
      try {
        console.error(`[credibility-analyzer] web_search -> ${query}`);
        const searchResponse = await tvly.search(query);
        return trimTavilyResponse(searchResponse);
      } catch (error) {
        return {
          status: 'error',
          query,
          error: formatError(error),
        };
      }
    },
  });


  const writeFileTool = tool({
    name: 'write_file',
    description:
      'Write the final Markdown credibility report to disk inside the local reports directory.',
    parameters: WriteFileArgsSchema,
    async execute({ filename, content }) {
      const safeFilename = sanitizeReportFilename(filename);
      const outputPath = join(REPORTS_DIR, safeFilename);

      await mkdir(REPORTS_DIR, { recursive: true });
      await writeFile(outputPath, content, 'utf8');
      lastReportPath = outputPath;

      return {
        status: 'file_written',
        path: outputPath,
        bytes: Buffer.byteLength(content, 'utf8'),
      };
    },
  });

  return [readUrlTool, webSearchTool, writeFileTool] as const;
}

function formatTraceItem(item: RunItem, index: number): string {
  const prefix = `${String(index + 1).padStart(2, '0')}. ${item.type}`;

  if (item.type === 'message_output_item') {
    return `${prefix} ${preview(item.content)}`;
  }

  if (item.type === 'tool_call_item') {
    const raw = item.rawItem as any;
    if (raw?.type === 'function_call') {
      return `${prefix} ${raw.name}(${preview(raw.arguments)})`;
    }
    return `${prefix} ${preview(raw)}`;
  }

  if (item.type === 'tool_call_output_item') {
    const raw = item.rawItem as any;
    const name = raw?.name || 'tool_output';
    return `${prefix} ${name} -> ${preview(item.output)}`;
  }

  if (item.type === 'reasoning_item') {
    const raw = item.rawItem as any;
    return `${prefix} ${preview(raw)}`;
  }

  if (item.type === 'handoff_call_item' || item.type === 'handoff_output_item' || item.type === 'tool_approval_item') {
    return `${prefix} ${preview(item.rawItem)}`;
  }

  return `${prefix} ${preview(item)}`;
}

function printTrace(items: RunItem[]): void {
  console.error('');
  console.error('[credibility-analyzer] Agent trace');
  for (const [index, item] of items.entries()) {
    console.error(formatTraceItem(item, index));
  }
}

async function writeTraceFile(reportFilename: string, items: RunItem[]): Promise<string> {
  const base = reportFilename.replace(/\.md$/i, '');
  const tracePath = join(REPORTS_DIR, `${base}-trace.json`);
  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(tracePath, JSON.stringify(items.map((item) => item.toJSON()), null, 2), 'utf8');
  return tracePath;
}

async function main() {
  const { sourceUrl, outputFilename, modelName, maxTurns } = parseArgs(process.argv);
  const openRouterApiKey = requireEnv('OPENROUTER_API_KEY');
  const tavilyApiKey = requireEnv('TAVILY_API_KEY');

  lastEvaluation = null;
  lastReportPath = null;

  const openRouterClient = new OpenAI({
    apiKey: openRouterApiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_TITLE || 'source-credibility-analyzer-agent',
    },
  });

  const provider = new OpenRouterModelProvider(openRouterClient, modelName);
  const tvly = tavily({ apiKey: tavilyApiKey });
  const tools = createTools(tvly);

  const agent = new Agent({
    name: 'Research Source Credibility Analyzer',
    instructions: buildSystemPrompt(outputFilename),
    model: modelName,
    modelSettings: {
      temperature: 0.2,
      parallelToolCalls: false,
      toolChoice: 'auto',
      maxTokens: 4000,
    },
    tools: [...tools],
  });

  const runner = new Runner({
    modelProvider: provider,
    tracingDisabled: true,
    workflowName: 'Source Credibility Analyzer Agent',
  });

  const userPrompt = [
    `Evaluate the credibility of this source: ${sourceUrl}`,
    `You must write the final Markdown report to the filename \"${outputFilename}\" using the write_file tool.`,
    'Be explicit about unknowns and do not fabricate missing information.',
  ].join('\n');

  console.error(`[credibility-analyzer] Model -> ${modelName}`);
  console.error(`[credibility-analyzer] Source -> ${sourceUrl}`);
  console.error(`[credibility-analyzer] Max turns -> ${maxTurns}`);

  const result = await runner.run(agent, userPrompt, { maxTurns });

  const reportPath = lastReportPath as string | null;
  if (!reportPath) {
    throw new Error('The run finished without calling write_file.');
  }

  printTrace(result.newItems);
  const tracePath = await writeTraceFile(outputFilename, result.newItems);

  const finalOutput =
    typeof result.finalOutput === 'string'
      ? result.finalOutput.trim()
      : JSON.stringify(result.finalOutput, null, 2);

  const summaryLines = [
    `Report: ${reportPath}`,
    `Trace: ${tracePath}`,

  ];

  process.stdout.write(summaryLines.join('\n') + '\n');
  if (finalOutput) {
    process.stdout.write(`\n${finalOutput}\n`);
  }
}

main().catch((error) => {
  console.error(formatError(error));
  process.exitCode = 1;
});


