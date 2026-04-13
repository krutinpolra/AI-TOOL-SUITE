import OpenAI from 'openai';
import { zodFunction, zodResponseFormat } from 'openai/helpers/zod';
import type { ZodTypeAny, output } from 'zod';

import { CostTracker } from './cost.js';
import {
  Logger,
  RuntimeConfig,
  UserFacingError,
  loadRuntimeConfig,
  sleep,
} from './runtime.js';

export type AppContext = {
  config: RuntimeConfig;
  logger: Logger;
  openai: OpenAI;
  costTracker: CostTracker;
};

export function createOpenRouterClient(config: RuntimeConfig): OpenAI {
  return new OpenAI({
    apiKey: config.openRouterApiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': config.httpReferer,
      'X-Title': config.appTitle,
    },
  });
}

export function createAppContext(verbose: boolean): AppContext {
  const config = loadRuntimeConfig();
  const logger = new Logger(verbose);
  return {
    config,
    logger,
    openai: createOpenRouterClient(config),
    costTracker: new CostTracker(logger, config.runBudgetUsd),
  };
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return '';
        }

        const maybeText = (item as { text?: string }).text;
        return typeof maybeText === 'string' ? maybeText : '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

async function withRetry<T>(
  operation: () => Promise<T>,
  logger: Logger,
  label: string,
  maxAttempts = 2
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      logger.warn(`${label} attempt ${attempt} failed`, error instanceof Error ? error.message : error);
      if (attempt < maxAttempts) {
        await sleep(600 * attempt);
      }
    }
  }

  throw lastError;
}

export async function callStructuredModel<TSchema extends ZodTypeAny>(options: {
  context: AppContext;
  schema: TSchema;
  schemaName: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  label: string;
  maxAttempts?: number;
}): Promise<output<TSchema>> {
  const {
    context,
    schema,
    schemaName,
    model,
    systemPrompt,
    userPrompt,
    temperature = 0.1,
    label,
    maxAttempts = 2,
  } = options;

  return withRetry(
    async () => {
      const response = await context.openai.chat.completions.create({
        model,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: zodResponseFormat(schema, schemaName),
      });

      context.costTracker.add(label, model, response.usage);
      const content = response.choices[0]?.message?.content;
      const parsed = schema.parse(JSON.parse(extractTextContent(content) || '{}')) as output<TSchema>;
      context.logger.debug('Structured output validation', {
        label,
        model,
        status: 'passed',
      });
      return parsed;
    },
    context.logger,
    label,
    maxAttempts
  );
}

export async function callTextModel(options: {
  context: AppContext;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  label: string;
  maxAttempts?: number;
}): Promise<string> {
  const {
    context,
    model,
    systemPrompt,
    userPrompt,
    temperature = 0.2,
    label,
    maxAttempts = 2,
  } = options;

  return withRetry(
    async () => {
      const response = await context.openai.chat.completions.create({
        model,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      context.costTracker.add(label, model, response.usage);
      const content = extractTextContent(response.choices[0]?.message?.content);
      if (!content) {
        throw new UserFacingError(`Model returned an empty text response for ${label}.`);
      }

      return content.trim();
    },
    context.logger,
    label,
    maxAttempts
  );
}

export { zodFunction };
