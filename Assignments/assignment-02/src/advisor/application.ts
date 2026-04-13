import { join } from 'path';

import { computeFitScore } from '../shared/analysis.js';
import { slugify, writeJsonFile, writeTextFile } from '../shared/io.js';
import { callStructuredModel, type AppContext } from '../shared/llm.js';
import { buildApplicationAnalysisUserPrompt, applicationAnalysisSystemPrompt } from '../shared/prompts.js';
import { renderApplicationHtml, renderApplicationMarkdown } from '../shared/reporting.js';
import {
  ApplicationAnalysisSchema,
  ApplicationReportSchema,
  type ApplicationReport,
  type GapAnalysis,
  type JobPosting,
  type MarketAnalysis,
  type ResumeData,
} from '../shared/schemas.js';
import { projectRoot } from '../shared/runtime.js';

export async function generateApplicationReport(
  context: AppContext,
  posting: JobPosting,
  resume: ResumeData,
  marketAnalysis: MarketAnalysis,
  gapAnalysis: GapAnalysis
): Promise<{
  report: ApplicationReport;
  jsonPath: string;
  markdownPath: string;
  htmlPath: string;
}> {
  const analysis = await callStructuredModel({
    context,
    schema: ApplicationAnalysisSchema,
    schemaName: 'application_analysis',
    model: context.config.models.advisor,
    systemPrompt: applicationAnalysisSystemPrompt(),
    userPrompt: buildApplicationAnalysisUserPrompt(posting, resume, marketAnalysis, gapAnalysis),
    label: `application-analysis-${posting.companyName}`,
  });

  const score = computeFitScore({ analysis });
  context.logger.debug('Fit scoring', {
    met: score.breakdown.met,
    partial: score.breakdown.partial,
    gap: score.breakdown.gap,
    weightedScore: score.breakdown.weightedScore,
  });

  const postingSlug = `${slugify(posting.jobTitle)}-${slugify(posting.companyName)}-${posting.source.sourceSha256.slice(0, 8)}`;
  const report = ApplicationReportSchema.parse({
    generatedAt: new Date().toISOString(),
    postingSlug,
    fitScore: score.fitScore,
    fitBand: score.fitBand,
    scoreExplanation: score.explanation,
    analysis,
    scoringBreakdown: score.breakdown,
  });

  const jsonPath = join(projectRoot, 'data', 'analysis', `${postingSlug}.json`);
  const markdownPath = join(projectRoot, 'reports', `${postingSlug}.md`);
  const htmlPath = join(projectRoot, 'reports', `${postingSlug}.html`);

  await writeJsonFile(jsonPath, report);
  await writeTextFile(markdownPath, renderApplicationMarkdown(report, posting));
  await writeTextFile(htmlPath, renderApplicationHtml(report, posting, marketAnalysis, resume));

  return {
    report,
    jsonPath,
    markdownPath,
    htmlPath,
  };
}
