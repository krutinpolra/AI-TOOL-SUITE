import { config as loadEnv } from 'dotenv';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const projectRoot = resolve(__dirname, '../..');
export const repoRoot = resolve(projectRoot, '../..');

loadEnv({ path: join(repoRoot, '.env'), override: false, quiet: true });
loadEnv({ path: join(projectRoot, '.env'), override: false, quiet: true });

export type RemoteStatus = 'remote' | 'hybrid' | 'onsite' | 'flexible' | 'not_listed';
export type GapLevel = 'quick_win' | 'short_term' | 'medium_term' | 'long_term';
export type FitBand = 'strong_fit' | 'good_fit' | 'stretch' | 'growth_target';

export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

export class Logger {
  constructor(private readonly verbose: boolean) {}

  debug(message: string, detail?: unknown): void {
    if (!this.verbose) {
      return;
    }

    if (detail === undefined) {
      console.error(`[DEBUG] ${message}`);
      return;
    }

    if (typeof detail === 'string') {
      console.error(`[DEBUG] ${message}: ${detail}`);
      return;
    }

    console.error(`[DEBUG] ${message}: ${JSON.stringify(detail, null, 2)}`);
  }

  info(message: string): void {
    console.error(`[INFO] ${message}`);
  }

  warn(message: string, detail?: unknown): void {
    if (detail === undefined) {
      console.error(`[WARN] ${message}`);
      return;
    }

    if (typeof detail === 'string') {
      console.error(`[WARN] ${message}: ${detail}`);
      return;
    }

    console.error(`[WARN] ${message}: ${JSON.stringify(detail, null, 2)}`);
  }

  error(message: string, detail?: unknown): void {
    if (detail === undefined) {
      console.error(`[ERROR] ${message}`);
      return;
    }

    if (typeof detail === 'string') {
      console.error(`[ERROR] ${message}: ${detail}`);
      return;
    }

    console.error(`[ERROR] ${message}: ${JSON.stringify(detail, null, 2)}`);
  }
}

export function isVerboseFlag(args: string[]): boolean {
  return (
    args.includes('--verbose') ||
    args.includes('-v') ||
    process.env.LOG_LEVEL?.toLowerCase() === 'debug'
  );
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new UserFacingError(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function optionalEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

export function parsePositiveNumber(value: string | null | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function clipText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n\n[truncated ${text.length - maxChars} characters]`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

export function formatJsonForPrompt(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export type RuntimeConfig = {
  openRouterApiKey: string;
  tavilyApiKey: string | null;
  httpReferer: string;
  appTitle: string;
  models: {
    extraction: string;
    analysis: string;
    research: string;
    advisor: string;
  };
  runBudgetUsd: number | null;
  maxToolSteps: number;
  tavilyMaxResults: number;
};

export function loadRuntimeConfig(): RuntimeConfig {
  const defaultModel = process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini';

  return {
    openRouterApiKey: requireEnv('OPENROUTER_API_KEY'),
    tavilyApiKey: optionalEnv('TAVILY_API_KEY'),
    httpReferer: optionalEnv('OPENROUTER_HTTP_REFERER') || 'http://localhost:3000',
    appTitle:
      optionalEnv('OPENROUTER_APP_TITLE') || 'AIP444 Assignment 2 Job Search Assistant',
    models: {
      extraction: optionalEnv('OPENROUTER_MODEL_EXTRACTION') || defaultModel,
      analysis: optionalEnv('OPENROUTER_MODEL_ANALYSIS') || defaultModel,
      research: optionalEnv('OPENROUTER_MODEL_RESEARCH') || defaultModel,
      advisor: optionalEnv('OPENROUTER_MODEL_ADVISOR') || defaultModel,
    },
    runBudgetUsd: optionalEnv('RUN_COST_BUDGET_USD')
      ? parsePositiveNumber(process.env.RUN_COST_BUDGET_USD, 0)
      : null,
    maxToolSteps: Math.max(1, Math.floor(parsePositiveNumber(process.env.MAX_TOOL_STEPS, 4))),
    tavilyMaxResults: Math.max(
      1,
      Math.floor(parsePositiveNumber(process.env.TAVILY_MAX_RESULTS, 5))
    ),
  };
}
