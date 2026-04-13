import { join } from 'path';

import { readJsonFile, writeJsonFile, writeTextFile } from '../shared/io.js';
import { callStructuredModel, type AppContext } from '../shared/llm.js';
import { buildGapAnalysisUserPrompt, gapAnalysisSystemPrompt } from '../shared/prompts.js';
import { renderGapAnalysisMarkdown } from '../shared/reporting.js';
import { GapAnalysisSchema, type GapAnalysis, type MarketAnalysis, type ResumeData } from '../shared/schemas.js';
import { projectRoot } from '../shared/runtime.js';

const GAP_ANALYSIS_JSON = join(projectRoot, 'data', 'analysis', 'gap-analysis.json');
const GAP_ANALYSIS_MD = join(projectRoot, 'reports', 'gap-analysis.md');

export async function generateGapAnalysis(
  context: AppContext,
  resume: ResumeData,
  marketAnalysis: MarketAnalysis
): Promise<GapAnalysis> {
  const gapAnalysis = GapAnalysisSchema.parse({
    ...(await callStructuredModel({
      context,
      schema: GapAnalysisSchema.omit({ generatedAt: true }),
      schemaName: 'gap_analysis',
      model: context.config.models.analysis,
      systemPrompt: gapAnalysisSystemPrompt(),
      userPrompt: buildGapAnalysisUserPrompt(resume, marketAnalysis),
      label: 'gap-analysis',
    })),
    generatedAt: new Date().toISOString(),
  });

  await writeJsonFile(GAP_ANALYSIS_JSON, gapAnalysis);
  await writeTextFile(GAP_ANALYSIS_MD, renderGapAnalysisMarkdown(gapAnalysis));
  return gapAnalysis;
}

export async function loadGapAnalysis(): Promise<GapAnalysis> {
  return GapAnalysisSchema.parse(await readJsonFile(GAP_ANALYSIS_JSON));
}

export const gapOutputPaths = {
  json: GAP_ANALYSIS_JSON,
  markdown: GAP_ANALYSIS_MD,
};
