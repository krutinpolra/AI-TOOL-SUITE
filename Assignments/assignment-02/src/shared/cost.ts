import type OpenAI from 'openai';

import { Logger, UserFacingError } from './runtime.js';

type UsageLike = OpenAI.Completions.CompletionUsage | OpenAI.Responses.ResponseUsage | null | undefined;

type CostEntry = {
  label: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number | null;
};

const PRICE_TABLE: Record<string, { input: number; output: number }> = {
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai/gpt-4o': { input: 2.5, output: 10 },
};

export class CostTracker {
  private readonly entries: CostEntry[] = [];

  constructor(
    private readonly logger: Logger,
    private readonly runBudgetUsd: number | null
  ) {}

  add(label: string, model: string, usage: UsageLike): void {
    const promptTokens =
      usage && 'input_tokens' in usage
        ? usage.input_tokens ?? 0
        : usage && 'prompt_tokens' in usage
          ? usage.prompt_tokens ?? 0
          : 0;

    const completionTokens =
      usage && 'output_tokens' in usage
        ? usage.output_tokens ?? 0
        : usage && 'completion_tokens' in usage
          ? usage.completion_tokens ?? 0
          : 0;

    const totalTokens =
      usage && 'total_tokens' in usage
        ? usage.total_tokens ?? promptTokens + completionTokens
        : promptTokens + completionTokens;

    const pricing = PRICE_TABLE[model];
    const estimatedCostUsd = pricing
      ? (promptTokens / 1_000_000) * pricing.input +
        (completionTokens / 1_000_000) * pricing.output
      : null;

    this.entries.push({
      label,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd,
    });

    this.logger.debug(`LLM call: ${model}`, {
      label,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd,
    });

    if (this.runBudgetUsd !== null && this.totalEstimatedCostUsd() > this.runBudgetUsd) {
      throw new UserFacingError(
        `Estimated run cost $${this.totalEstimatedCostUsd().toFixed(
          4
        )} exceeded budget $${this.runBudgetUsd.toFixed(4)}.`
      );
    }
  }

  totalEstimatedCostUsd(): number {
    return this.entries.reduce((sum, entry) => sum + (entry.estimatedCostUsd ?? 0), 0);
  }

  summary(): {
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalEstimatedCostUsd: number;
    entries: CostEntry[];
  } {
    return {
      totalPromptTokens: this.entries.reduce((sum, entry) => sum + entry.promptTokens, 0),
      totalCompletionTokens: this.entries.reduce((sum, entry) => sum + entry.completionTokens, 0),
      totalTokens: this.entries.reduce((sum, entry) => sum + entry.totalTokens, 0),
      totalEstimatedCostUsd: this.totalEstimatedCostUsd(),
      entries: [...this.entries],
    };
  }
}
