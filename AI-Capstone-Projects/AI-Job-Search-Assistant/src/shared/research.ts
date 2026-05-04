import { tavily } from '@tavily/core';
import { z } from 'zod';

import { callStructuredModel, zodFunction, type AppContext } from './llm.js';
import {
  buildCompanyResearchUserPrompt,
  companyResearchStructuringPrompt,
  companyResearchSystemPrompt,
} from './prompts.js';
import { CompanyResearchSchema, type JobPosting } from './schemas.js';
import { UserFacingError } from './runtime.js';

const WebSearchArgsSchema = z.object({
  query: z.string().min(3),
});

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
};

function trimTavilyResponse(raw: unknown): {
  query: string | null;
  answer: string | null;
  results: Array<{ title: string; url: string; content: string; score: number | null }>;
} {
  if (!raw || typeof raw !== 'object') {
    return {
      query: null,
      answer: null,
      results: [],
    };
  }

  const value = raw as {
    query?: string;
    answer?: string;
    results?: TavilyResult[];
  };

  return {
    query: value.query ?? null,
    answer: value.answer ?? null,
    results: (value.results ?? []).slice(0, 5).map((result) => ({
      title: result.title ?? 'Untitled',
      url: result.url ?? '',
      content: typeof result.content === 'string' ? result.content.slice(0, 700) : '',
      score: typeof result.score === 'number' ? result.score : null,
    })),
  };
}

function toolResultToLines(result: ReturnType<typeof trimTavilyResponse>): string {
  const parts: string[] = [];
  if (result.answer) {
    parts.push(`Answer: ${result.answer}`);
  }

  for (const item of result.results) {
    parts.push(`${item.title} | ${item.url}\n${item.content}`);
  }

  return parts.join('\n\n').trim();
}

function extractMessageTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return '';
      }

      const value = item as { text?: string };
      return typeof value.text === 'string' ? value.text : '';
    })
    .join('\n')
    .trim();
}

export async function runCompanyResearch(
  context: AppContext,
  posting: JobPosting
): Promise<z.infer<typeof CompanyResearchSchema>> {
  if (!context.config.tavilyApiKey) {
    context.logger.warn('Company research skipped', 'TAVILY_API_KEY not configured');
    return {
      status: 'skipped',
      summary: null,
      sizeAndStage: null,
      industry: null,
      recentDevelopments: [],
      cultureSignals: [],
      applicationAngles: [],
      searchQueries: [],
      sources: [],
      failureReason: 'TAVILY_API_KEY not configured',
    };
  }

  const tvly = tavily({ apiKey: context.config.tavilyApiKey });
  const webSearchTool = zodFunction({
    name: 'web_search',
    description: 'Search the web for company context, recent news, industry details, and culture signals.',
    parameters: WebSearchArgsSchema,
  });

  const searchQueries: string[] = [];
  const gatheredNotes: string[] = [];
  const gatheredSources = new Map<string, { title: string; url: string; snippet: string | null }>();

  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: companyResearchSystemPrompt() },
    { role: 'user', content: buildCompanyResearchUserPrompt(posting) },
  ];

  for (let step = 0; step < context.config.maxToolSteps; step += 1) {
    const completion = await context.openai.chat.completions.create({
      model: context.config.models.research,
      temperature: 0.2,
      messages: messages as never,
      tools: [webSearchTool],
      tool_choice: 'auto',
    });

    context.costTracker.add(
      `company-research-${posting.companyName}`,
      context.config.models.research,
      completion.usage
    );

    const message = completion.choices[0]?.message;
    if (!message) {
      throw new UserFacingError('Research model returned an empty message.');
    }

    messages.push(message as unknown as Record<string, unknown>);
    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      const content = extractMessageTextContent(message.content);

      const structured = await callStructuredModel({
        context,
        schema: CompanyResearchSchema,
        schemaName: 'company_research',
        model: context.config.models.analysis,
        systemPrompt:
          'Convert company research notes into structured data. If facts are unclear, use null or empty arrays.',
        userPrompt: companyResearchStructuringPrompt(posting, content, searchQueries),
        label: `company-research-structure-${posting.companyName}`,
      });

      return {
        ...structured,
        status: searchQueries.length > 0 ? 'completed' : structured.status,
        searchQueries,
        sources: structured.sources.length > 0 ? structured.sources : [...gatheredSources.values()],
        failureReason: structured.failureReason,
      };
    }

    for (const toolCall of toolCalls) {
      if (toolCall.type !== 'function' || toolCall.function.name !== 'web_search') {
        continue;
      }

      try {
        const parsedArgs = WebSearchArgsSchema.parse(
          JSON.parse(toolCall.function.arguments || '{}')
        );
        searchQueries.push(parsedArgs.query);
        context.logger.debug('Tool call: web_search', parsedArgs);
        const rawSearchResponse = await tvly.search(parsedArgs.query);
        const trimmed = trimTavilyResponse(rawSearchResponse);
        gatheredNotes.push(toolResultToLines(trimmed));

        for (const result of trimmed.results) {
          if (!result.url) {
            continue;
          }

          gatheredSources.set(result.url, {
            title: result.title,
            url: result.url,
            snippet: result.content || null,
          });
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(trimmed),
        });
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        context.logger.warn('Company research tool call failed', messageText);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: messageText }),
        });
      }
    }
  }

  context.logger.warn(
    'Company research hit step limit',
    `${context.config.maxToolSteps} tool steps reached`
  );

  try {
    const structured = await callStructuredModel({
      context,
      schema: CompanyResearchSchema,
      schemaName: 'company_research',
      model: context.config.models.analysis,
      systemPrompt:
        'Convert company research notes into structured data. If facts are unclear, use null or empty arrays.',
      userPrompt: companyResearchStructuringPrompt(posting, gatheredNotes.join('\n\n'), searchQueries),
      label: `company-research-fallback-${posting.companyName}`,
    });

    return {
      ...structured,
      status: searchQueries.length > 0 ? 'completed' : 'failed',
      searchQueries,
      sources: structured.sources.length > 0 ? structured.sources : [...gatheredSources.values()],
      failureReason:
        searchQueries.length > 0
          ? structured.failureReason
          : 'Research loop ended before meaningful evidence was gathered.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'failed',
      summary: null,
      sizeAndStage: null,
      industry: null,
      recentDevelopments: [],
      cultureSignals: [],
      applicationAngles: [],
      searchQueries,
      sources: [...gatheredSources.values()],
      failureReason: message,
    };
  }
}
