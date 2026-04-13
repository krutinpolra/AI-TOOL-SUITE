import { join } from 'path';

import { computeFitScore } from '../shared/analysis.js';
import { slugify, writeJsonFile, writeTextFile } from '../shared/io.js';
import { callStructuredModel, type AppContext } from '../shared/llm.js';
import {
  applicationAnalysisSystemPrompt,
  buildApplicationAnalysisUserPrompt,
  buildCoverLetterDraftsUserPrompt,
  coverLetterDraftsSystemPrompt,
} from '../shared/prompts.js';
import { renderApplicationHtml, renderApplicationMarkdown } from '../shared/reporting.js';
import {
  ApplicationAnalysisSchema,
  ApplicationReportSchema,
  CoverLetterDraftsSchema,
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
  gapAnalysis: GapAnalysis,
  options?: {
    writeOutputs?: boolean;
    generateCoverLetterDrafts?: boolean;
  }
): Promise<{
  report: ApplicationReport;
  jsonPath: string;
  markdownPath: string;
  htmlPath: string;
  coverLetterVariantPaths: string[];
}> {
  const writeOutputs = options?.writeOutputs ?? true;
  const generateCoverLetterDrafts = options?.generateCoverLetterDrafts ?? true;
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

  const coverLetterDrafts = generateCoverLetterDrafts
    ? await callStructuredModel({
        context,
        schema: CoverLetterDraftsSchema,
        schemaName: 'cover_letter_drafts',
        model: context.config.models.advisor,
        systemPrompt: coverLetterDraftsSystemPrompt(),
        userPrompt: buildCoverLetterDraftsUserPrompt(
          posting,
          resume,
          marketAnalysis,
          gapAnalysis,
          analysis
        ),
        label: `cover-letter-drafts-${posting.companyName}`,
        temperature: 0.45,
      })
    : {
        drafts: [
          {
            variantLabel: 'Variant 1',
            tone: 'not generated during automatic evaluation',
            emphasis: 'automatic evaluation mode skipped full draft generation',
            draft:
              'Automatic evaluation mode skips full cover-letter generation to control cost and keep batch evaluation practical. This placeholder exists only so the application-report schema remains valid during automated scoring runs. Run the normal Phase 3 advisor command for this posting when you want a complete, human-readable tailored cover letter draft based on the fit analysis, resume evidence, and company research.',
          },
          {
            variantLabel: 'Variant 2',
            tone: 'not generated during automatic evaluation',
            emphasis: 'automatic evaluation mode skipped full draft generation',
            draft:
              'Automatic evaluation mode skips full cover-letter generation to control cost and keep batch evaluation practical. This placeholder exists only so the application-report schema remains valid during automated scoring runs. Run the normal Phase 3 advisor command for this posting when you want a complete, human-readable tailored cover letter draft based on the fit analysis, resume evidence, and company research.',
          },
        ],
      };

  const postingSlug = `${slugify(posting.jobTitle)}-${slugify(posting.companyName)}-${posting.source.sourceSha256.slice(0, 8)}`;
  const report = ApplicationReportSchema.parse({
    generatedAt: new Date().toISOString(),
    postingSlug,
    fitScore: score.fitScore,
    fitBand: score.fitBand,
    scoreExplanation: score.explanation,
    analysis,
    coverLetterDrafts: coverLetterDrafts.drafts,
    scoringBreakdown: score.breakdown,
  });

  const jsonPath = join(projectRoot, 'data', 'analysis', `${postingSlug}.json`);
  const markdownPath = join(projectRoot, 'reports', `${postingSlug}.md`);
  const htmlPath = join(projectRoot, 'reports', `${postingSlug}.html`);
  const coverLetterVariantPaths: string[] = [];

  if (writeOutputs) {
    await writeJsonFile(jsonPath, report);
    await writeTextFile(markdownPath, renderApplicationMarkdown(report, posting));
    await writeTextFile(htmlPath, renderApplicationHtml(report, posting, marketAnalysis, resume));
    for (const [index, draft] of report.coverLetterDrafts.entries()) {
      const variantPath = join(
        projectRoot,
        'reports',
        `${postingSlug}-cover-letter-variant-${index + 1}.md`
      );
      coverLetterVariantPaths.push(variantPath);
      await writeTextFile(
        variantPath,
        `# Cover Letter ${draft.variantLabel}\n\nTone: ${draft.tone}\n\nEmphasis: ${draft.emphasis}\n\n${draft.draft}`
      );
    }
  }

  return {
    report,
    jsonPath,
    markdownPath,
    htmlPath,
    coverLetterVariantPaths,
  };
}
