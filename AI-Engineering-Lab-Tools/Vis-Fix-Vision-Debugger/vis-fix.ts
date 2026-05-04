#!/usr/bin/env node

import OpenAI from 'openai';
import sharp from 'sharp';
import { tavily } from '@tavily/core';
import { z } from 'zod';
import { zodFunction } from 'openai/helpers/zod';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { stat } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
loadEnv({ path: join(__dirname, '../../.env') });

const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

const WebSearchArgsSchema = z.object({
  query: z.string().min(1).describe('The search query to use based on the screenshot'),
});

type WebSearchArgs = z.infer<typeof WebSearchArgsSchema>;

const webSearchTool = zodFunction({
  name: 'web_search',
  description:
    'Searches the web for technical documentation, coding errors, and other details to help with debugging.',
  parameters: WebSearchArgsSchema,
});

const SYSTEM_PROMPT = `You are vis-fix, a visual debugging assistant for developers.

You will be given:
- A screenshot of a developer environment (terminal, IDE, browser devtools, etc.)
- A short user prompt describing what they want

Follow this process:
1) Describe: Carefully describe what you see in the image. Extract exact error messages, error codes, filenames, and line numbers.
2) Verify: If the issue depends on a library/framework/version OR looks new/unknown, call the web_search tool to find up-to-date (2026) documentation or release notes.
3) Analyze: Explain the likely root cause, tying it directly to the extracted error text and any web_search results.
4) Fix: Provide concrete steps (commands, config changes, and/or code snippets). Prefer the smallest safe change.

Tool usage:
- Use web_search when the error references a specific library/framework/version, or when you are uncertain.
- Your web_search query should include the key error text AND the relevant library/framework name.

Output format:
- Start with a short summary.
- Then provide: Observations, Likely Cause, Fix Steps.
- If you used web_search, include a short References section listing the URLs.

If the screenshot is not a developer error (e.g., an animal photo) or is unreadable, say so and ask for a clearer screenshot or the text error.`;

function usage(): string {
  return [
    'Usage:',
    '  vis-fix <screenshotPath> [--prompt "..."]',
    '',
    'Examples:',
    '  vis-fix ./error.png --prompt "Fix this build error"',
    '  npm run dev -- ./error.png --prompt "What is causing this?"',
  ].join('\n');
}

function parseArgs(argv: string[]): { screenshotPath: string; prompt: string } {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    throw new Error(usage());
  }

  const screenshotPath = resolve(args[0]);

  let prompt = 'Analyze this screenshot and propose a fix.';
  const promptFlagIndex = args.findIndex((a) => a === '--prompt' || a === '-p');
  if (promptFlagIndex !== -1) {
    const value = args[promptFlagIndex + 1];
    if (!value) {
      throw new Error('Missing value for --prompt\n\n' + usage());
    }
    prompt = value;
  }

  return { screenshotPath, prompt };
}

async function processImage(
  path: string
): Promise<{ dataUrl: string; beforeBytes: number; afterBytes: number; base64Chars: number }> {
  const original = await stat(path);
  const beforeBytes = original.size;

  const buffer = await sharp(path)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const afterBytes = buffer.byteLength;
  const base64 = buffer.toString('base64');
  const base64Chars = base64.length;
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  return { dataUrl, beforeBytes, afterBytes, base64Chars };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function trimTavilyResponse(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const anyRaw = raw as any;

  const results = Array.isArray(anyRaw.results) ? anyRaw.results.slice(0, 5) : undefined;
  const trimmedResults = results
    ? results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: typeof r.content === 'string' ? r.content.slice(0, 800) : r.content,
        score: r.score,
      }))
    : undefined;

  return {
    query: anyRaw.query,
    answer: anyRaw.answer,
    results: trimmedResults,
  };
}

async function main() {
  const { screenshotPath, prompt } = parseArgs(process.argv);

  const openRouterApiKey = requireEnv('OPENROUTER_API_KEY');
  const tavilyApiKey = requireEnv('TAVILY_API_KEY');
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const { dataUrl, beforeBytes, afterBytes, base64Chars } = await processImage(screenshotPath);
  console.error(
    `[vis-fix] Optimization stats: original=${beforeBytes} bytes, jpeg=${afterBytes} bytes, base64=${base64Chars} chars (~${base64Chars} bytes)`
  );

  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: openRouterApiKey,
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'vis-fix',
    },
  });

  const tvly = tavily({ apiKey: tavilyApiKey });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    },
  ];

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [webSearchTool];

  for (let i = 0; i < 3; i++) {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.2,
    });

    const message = completion.choices[0]?.message;
    if (!message) throw new Error('No response message from model');

    messages.push(message);

    const toolCalls = message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      const content = message.content;
      if (typeof content === 'string') {
        process.stdout.write(content.trim() + '\n');
        return;
      }

      // Some providers may return structured content arrays; fallback to JSON.
      process.stdout.write(JSON.stringify(content, null, 2) + '\n');
      return;
    }

    for (const toolCall of toolCalls) {
      if (toolCall.type !== 'function') continue;
      if (toolCall.function.name !== 'web_search') continue;

      let args: WebSearchArgs;
      try {
        const parsed = JSON.parse(toolCall.function.arguments || '{}');
        args = WebSearchArgsSchema.parse(parsed);
      } catch (err) {
        console.error('[vis-fix] Failed to parse tool args:', err);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: 'Invalid tool arguments' }),
        });
        continue;
      }

      console.error(`[vis-fix] web_search: ${args.query}`);
      const searchResponse = await tvly.search(args.query);
      const trimmed = trimTavilyResponse(searchResponse);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(trimmed),
      });
    }
  }

  throw new Error('Too many tool-calling iterations; aborting.');
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exitCode = 1;
});
