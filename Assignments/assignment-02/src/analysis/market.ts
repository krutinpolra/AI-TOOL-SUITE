import { join } from 'path';

import { computeMarketAggregate } from '../shared/analysis.js';
import { readJsonFile, writeJsonFile, writeTextFile } from '../shared/io.js';
import { callStructuredModel, type AppContext } from '../shared/llm.js';
import { buildMarketInsightsUserPrompt, marketInsightsSystemPrompt } from '../shared/prompts.js';
import { renderMarketAnalysisHtml, renderMarketAnalysisMarkdown } from '../shared/reporting.js';
import {
  MarketAnalysisSchema,
  MarketInsightsSchema,
  ProcessingFailureSchema,
  type JobPosting,
  type MarketAnalysis,
  type ProcessingFailure,
} from '../shared/schemas.js';
import { projectRoot } from '../shared/runtime.js';

const MARKET_ANALYSIS_JSON = join(projectRoot, 'data', 'analysis', 'market-analysis.json');
const MARKET_ANALYSIS_MD = join(projectRoot, 'reports', 'market-analysis.md');
const MARKET_ANALYSIS_HTML = join(projectRoot, 'reports', 'market-analysis.html');
const FAILURES_PATH = join(projectRoot, 'data', 'jobs', 'failures.json');

async function loadFailures(): Promise<ProcessingFailure[]> {
  try {
    return ProcessingFailureSchema.array().parse(await readJsonFile(FAILURES_PATH));
  } catch {
    return [];
  }
}

export async function generateMarketAnalysis(
  context: AppContext,
  postings: JobPosting[]
): Promise<MarketAnalysis> {
  const aggregate = computeMarketAggregate(postings);
  const insights = await callStructuredModel({
    context,
    schema: MarketInsightsSchema,
    schemaName: 'market_insights',
    model: context.config.models.analysis,
    systemPrompt: marketInsightsSystemPrompt(),
    userPrompt: buildMarketInsightsUserPrompt(aggregate, postings),
    label: 'market-insights',
  });

  const analysis = MarketAnalysisSchema.parse({
    aggregate,
    insights,
  });

  const failures = await loadFailures();
  await writeJsonFile(MARKET_ANALYSIS_JSON, analysis);
  await writeTextFile(MARKET_ANALYSIS_MD, renderMarketAnalysisMarkdown(analysis, failures));
  await writeTextFile(MARKET_ANALYSIS_HTML, renderMarketAnalysisHtml(analysis, failures));
  return analysis;
}

export async function loadMarketAnalysis(): Promise<MarketAnalysis> {
  return MarketAnalysisSchema.parse(await readJsonFile(MARKET_ANALYSIS_JSON));
}

export const marketOutputPaths = {
  json: MARKET_ANALYSIS_JSON,
  markdown: MARKET_ANALYSIS_MD,
  html: MARKET_ANALYSIS_HTML,
};
