import { join, resolve } from 'path';

import { generateApplicationReport } from '../advisor/application.js';
import { loadGapAnalysis } from '../analysis/gaps.js';
import { loadMarketAnalysis } from '../analysis/market.js';
import { extractJobPostingFromFile, loadSavedJobPostings } from '../extract/jobs.js';
import { loadSavedResume } from '../extract/resume.js';
import { readJsonFile, relativeToProject, writeTextFile } from '../shared/io.js';
import type { AppContext } from '../shared/llm.js';
import { canonicalizeTerm } from '../shared/analysis.js';
import { EvaluationConfigSchema, type EvaluationConfig, type JobPosting } from '../shared/schemas.js';
import { projectRoot } from '../shared/runtime.js';

const EVAL_REPORT_PATH = join(projectRoot, 'eval', 'evaluation-report.md');

function compareString(expected: string | undefined, actual: string | null | undefined): string {
  if (!expected) {
    return 'not specified';
  }

  if ((actual ?? '').trim().toLowerCase() === expected.trim().toLowerCase()) {
    return 'match';
  }

  return `expected "${expected}", got "${actual ?? 'null'}"`;
}

function compareNumber(expected: number | null | undefined, actual: number | null | undefined): string {
  if (expected === undefined) {
    return 'not specified';
  }

  if (expected === actual) {
    return 'match';
  }

  return `expected "${expected}", got "${actual ?? 'null'}"`;
}

function compareArray(expected: string[] | undefined, actual: string[]): string {
  if (!expected || expected.length === 0) {
    return 'not specified';
  }

  const actualSet = new Set(actual.map((item) => canonicalizeTerm(item)));
  const missing = expected.filter((item) => !actualSet.has(canonicalizeTerm(item)));
  if (missing.length === 0) {
    return 'match';
  }

  return `missing expected items: ${missing.join(', ')}`;
}

async function findOrExtractPosting(
  context: AppContext,
  postingPath: string,
  savedPostings: JobPosting[]
): Promise<JobPosting> {
  const absolutePath = resolve(postingPath);
  const existing = savedPostings.find((posting) => resolve(posting.source.sourcePath) === absolutePath);
  if (existing) {
    return existing;
  }

  return extractJobPostingFromFile(context, absolutePath, { skipCompanyResearch: true });
}

export async function runEvaluation(context: AppContext, configPath: string): Promise<string> {
  const evaluationConfig = EvaluationConfigSchema.parse(
    await readJsonFile<EvaluationConfig>(resolve(configPath))
  );
  const savedPostings = await loadSavedJobPostings();
  const marketAnalysis = await loadMarketAnalysis();
  const gapAnalysis = await loadGapAnalysis();
  const resume = await loadSavedResume();

  const lines: string[] = [];
  lines.push('# Evaluation Results');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Extraction Spot-Check');
  lines.push('');

  for (const check of evaluationConfig.extractionSpotChecks) {
    const posting = await findOrExtractPosting(context, check.postingPath, savedPostings);
    lines.push(`### ${relativeToProject(resolve(check.postingPath))}`);
    lines.push('');
    lines.push('| Field | Result |');
    lines.push('| --- | --- |');
    lines.push(`| jobTitle | ${compareString(check.expected.jobTitle, posting.jobTitle)} |`);
    lines.push(`| companyName | ${compareString(check.expected.companyName, posting.companyName)} |`);
    lines.push(
      `| remoteStatus | ${compareString(check.expected.remoteStatus, posting.remoteStatus)} |`
    );
    lines.push(
      `| requiredSkills | ${compareArray(check.expected.requiredSkills, posting.requiredSkills)} |`
    );
    lines.push(
      `| preferredSkills | ${compareArray(check.expected.preferredSkills, posting.preferredSkills)} |`
    );
    lines.push(
      `| minimumYears | ${compareNumber(
        check.expected.minimumYears,
        posting.experienceLevel.minimumYears
      )} |`
    );
    lines.push(
      `| educationRequired | ${compareString(
        check.expected.educationRequired ?? undefined,
        posting.educationRequirements.required
      )} |`
    );
    lines.push('');
  }

  lines.push('## Scoring Check');
  lines.push('');
  for (const check of evaluationConfig.scoringChecks) {
    const posting = await extractJobPostingFromFile(context, resolve(check.postingPath));
    const generated = await generateApplicationReport(
      context,
      posting,
      resume,
      marketAnalysis,
      gapAnalysis
    );

    lines.push(`### ${relativeToProject(resolve(check.postingPath))}`);
    lines.push('');
    lines.push(`- Expected band: ${check.expectedBand}`);
    lines.push(`- Actual band: ${generated.report.fitBand}`);
    lines.push(`- Actual score: ${generated.report.fitScore}%`);
    lines.push(`- Agreement: ${generated.report.fitBand === check.expectedBand ? 'yes' : 'no'}`);
    if (check.notes) {
      lines.push(`- Manual note: ${check.notes}`);
    }
    lines.push('');
  }

  lines.push('## Failure Analysis');
  lines.push('');
  if (evaluationConfig.failureAnalysis.length === 0) {
    lines.push('- Add at least three failure-analysis items in your eval config.');
    lines.push('');
  } else {
    for (const failure of evaluationConfig.failureAnalysis) {
      lines.push(`### ${failure.title}`);
      lines.push('');
      lines.push(`- What happened: ${failure.whatHappened}`);
      lines.push(`- Why it happened: ${failure.whyItHappened}`);
      lines.push(`- Proposed fix: ${failure.proposedFix}`);
      lines.push('');
    }
  }

  lines.push('## Overall Observations');
  lines.push('');
  lines.push(
    evaluationConfig.overallObservations ??
      'Add a short summary here after reviewing the automated checks.'
  );
  lines.push('');

  await writeTextFile(EVAL_REPORT_PATH, lines.join('\n'));
  return EVAL_REPORT_PATH;
}
