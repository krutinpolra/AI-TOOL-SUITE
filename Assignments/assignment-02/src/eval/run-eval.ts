import { join, resolve } from 'path';

import { generateApplicationReport } from '../advisor/application.js';
import { loadGapAnalysis } from '../analysis/gaps.js';
import { loadMarketAnalysis } from '../analysis/market.js';
import { extractJobPostingFromFile, loadSavedJobPostings } from '../extract/jobs.js';
import { loadSavedResume } from '../extract/resume.js';
import { readJsonFile, relativeToProject, writeTextFile } from '../shared/io.js';
import type { AppContext } from '../shared/llm.js';
import { canonicalizeTerm, computePostingVsResumeSkillOverlap } from '../shared/analysis.js';
import { renderEvaluationHtml } from '../shared/reporting.js';
import { EvaluationConfigSchema, type EvaluationConfig, type JobPosting } from '../shared/schemas.js';
import { projectRoot } from '../shared/runtime.js';

const EVAL_REPORT_PATH = join(projectRoot, 'eval', 'evaluation-report.md');
const EVAL_REPORT_HTML_PATH = join(projectRoot, 'eval', 'evaluation-report.html');
const AUTO_EVAL_REPORT_PATH = join(projectRoot, 'eval', 'automatic-evaluation-report.md');
const AUTO_EVAL_REPORT_HTML_PATH = join(projectRoot, 'eval', 'automatic-evaluation-report.html');

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

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function overlapPercent(expected: string[], actual: string[]): number {
  if (expected.length === 0) {
    return 100;
  }

  const actualTerms = new Set(actual.map((item) => canonicalizeTerm(item)));
  const hits = expected.filter((item) => actualTerms.has(canonicalizeTerm(item))).length;
  return Number(((hits / expected.length) * 100).toFixed(2));
}

function heuristicFitBand(posting: JobPosting, resume: Awaited<ReturnType<typeof loadSavedResume>>) {
  const overlap = computePostingVsResumeSkillOverlap(posting, resume);
  const requiredTotal = Math.max(1, posting.requiredSkills.length);
  const preferredTotal = Math.max(1, posting.preferredSkills.length || 1);
  const requiredRatio = overlap.matchedRequiredSkills.length / requiredTotal;
  const preferredRatio = posting.preferredSkills.length
    ? overlap.matchedPreferredSkills.length / preferredTotal
    : 0.5;

  let score = requiredRatio * 75 + preferredRatio * 15;
  if (
    posting.experienceLevel.seniority === 'entry' ||
    posting.experienceLevel.seniority === 'new_grad' ||
    posting.experienceLevel.minimumYears === null
  ) {
    score += 10;
  }

  const rounded = Math.max(0, Math.min(100, Math.round(score)));
  const band =
    rounded >= 80
      ? 'strong_fit'
      : rounded >= 50
        ? 'good_fit'
        : rounded >= 30
          ? 'stretch'
          : 'growth_target';

  return {
    score: rounded,
    band,
    overlap,
  };
}

async function writeEvaluationOutputs(
  markdown: string,
  markdownPath: string,
  htmlPath: string
): Promise<string> {
  await writeTextFile(markdownPath, markdown);
  await writeTextFile(htmlPath, renderEvaluationHtml(markdown));
  return markdownPath;
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

  return writeEvaluationOutputs(lines.join('\n'), EVAL_REPORT_PATH, EVAL_REPORT_HTML_PATH);
}

export async function runAutomaticEvaluation(
  context: AppContext,
  options?: {
    extractionLimit?: number;
    scoringLimit?: number;
  }
): Promise<string> {
  const savedPostings = await loadSavedJobPostings();
  const marketAnalysis = await loadMarketAnalysis();
  const gapAnalysis = await loadGapAnalysis();
  const resume = await loadSavedResume();

  const extractionTargets = savedPostings.slice(
    0,
    Math.max(1, options?.extractionLimit ?? savedPostings.length)
  );
  const scoringTargets = savedPostings.slice(
    0,
    Math.max(1, options?.scoringLimit ?? savedPostings.length)
  );

  const extractionRows: Array<{
    posting: JobPosting;
    scalarAccuracy: number;
    requiredRecall: number;
    preferredRecall: number;
    titleMatch: boolean;
    companyMatch: boolean;
    remoteMatch: boolean;
    minYearsMatch: boolean;
  }> = [];

  for (const posting of extractionTargets) {
    const rerun = await extractJobPostingFromFile(context, posting.source.sourcePath, {
      skipCompanyResearch: true,
    });

    const scalarMatches = [
      posting.jobTitle.trim().toLowerCase() === rerun.jobTitle.trim().toLowerCase(),
      posting.companyName.trim().toLowerCase() === rerun.companyName.trim().toLowerCase(),
      posting.remoteStatus === rerun.remoteStatus,
      posting.experienceLevel.minimumYears === rerun.experienceLevel.minimumYears,
    ];

    extractionRows.push({
      posting,
      scalarAccuracy: Number(
        ((scalarMatches.filter(Boolean).length / scalarMatches.length) * 100).toFixed(2)
      ),
      requiredRecall: overlapPercent(posting.requiredSkills, rerun.requiredSkills),
      preferredRecall: overlapPercent(posting.preferredSkills, rerun.preferredSkills),
      titleMatch: scalarMatches[0] ?? false,
      companyMatch: scalarMatches[1] ?? false,
      remoteMatch: scalarMatches[2] ?? false,
      minYearsMatch: scalarMatches[3] ?? false,
    });
  }

  const scoringRows: Array<{
    posting: JobPosting;
    actualBand: string;
    actualScore: number;
    heuristicBand: string;
    heuristicScore: number;
    matchedRequired: number;
    requiredTotal: number;
  }> = [];

  for (const posting of scoringTargets) {
    const generated = await generateApplicationReport(context, posting, resume, marketAnalysis, gapAnalysis, {
      writeOutputs: false,
      generateCoverLetterDrafts: false,
    });
    const heuristic = heuristicFitBand(posting, resume);
    scoringRows.push({
      posting,
      actualBand: generated.report.fitBand,
      actualScore: generated.report.fitScore,
      heuristicBand: heuristic.band,
      heuristicScore: heuristic.score,
      matchedRequired: heuristic.overlap.matchedRequiredSkills.length,
      requiredTotal: Math.max(1, posting.requiredSkills.length),
    });
  }

  const lines: string[] = [];
  lines.push('# Automatic Evaluation Results');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(
    `This automatic evaluation reruns extraction against saved posting baselines and scores saved postings against the current resume without requiring manual expectations in eval-config.json.`
  );
  lines.push('');
  lines.push('## Automatic Extraction Consistency');
  lines.push('');
  lines.push(`- Postings checked: ${extractionRows.length}`);
  lines.push(`- Average scalar field accuracy: ${average(extractionRows.map((row) => row.scalarAccuracy))}%`);
  lines.push(`- Average required skill recall: ${average(extractionRows.map((row) => row.requiredRecall))}%`);
  lines.push(`- Average preferred skill recall: ${average(extractionRows.map((row) => row.preferredRecall))}%`);
  lines.push('');
  lines.push('| Posting | Scalar Accuracy | Required Recall | Preferred Recall |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of extractionRows) {
    lines.push(
      `| ${row.posting.jobTitle} at ${row.posting.companyName} | ${row.scalarAccuracy}% | ${row.requiredRecall}% | ${row.preferredRecall}% |`
    );
  }
  lines.push('');

  lines.push('## Automatic Fit Scoring Review');
  lines.push('');
  lines.push(`- Postings scored: ${scoringRows.length}`);
  lines.push(`- Average fit score: ${average(scoringRows.map((row) => row.actualScore))}%`);
  lines.push(
    `- Average required-skill match: ${average(
      scoringRows.map((row) => Number(((row.matchedRequired / row.requiredTotal) * 100).toFixed(2)))
    )}%`
  );
  lines.push('');
  lines.push('| Posting | Actual Score | Actual Band | Heuristic Score | Heuristic Band | Required Match |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const row of scoringRows) {
    lines.push(
      `| ${row.posting.jobTitle} at ${row.posting.companyName} | ${row.actualScore}% | ${row.actualBand} | ${row.heuristicScore}% | ${row.heuristicBand} | ${row.matchedRequired}/${row.requiredTotal} |`
    );
  }
  lines.push('');

  const sortedByScore = [...scoringRows].sort((left, right) => right.actualScore - left.actualScore);
  const best = sortedByScore[0];
  const weakest = sortedByScore[sortedByScore.length - 1];
  const middle = sortedByScore[Math.floor(sortedByScore.length / 2)];

  lines.push('## Representative Cases');
  lines.push('');
  if (best) {
    lines.push(
      `- Strongest current match: ${best.posting.jobTitle} at ${best.posting.companyName} (${best.actualScore}%, ${best.actualBand})`
    );
  }
  if (middle) {
    lines.push(
      `- Middle-range match: ${middle.posting.jobTitle} at ${middle.posting.companyName} (${middle.actualScore}%, ${middle.actualBand})`
    );
  }
  if (weakest) {
    lines.push(
      `- Weakest current match: ${weakest.posting.jobTitle} at ${weakest.posting.companyName} (${weakest.actualScore}%, ${weakest.actualBand})`
    );
  }
  lines.push('');

  lines.push('## Automatic Observations');
  lines.push('');
  lines.push(
    '- This mode is dynamic because it discovers saved postings automatically and evaluates them against the current pipeline outputs.'
  );
  lines.push(
    '- Extraction consistency here measures agreement with saved structured baselines, so it is useful for regression detection rather than human-ground-truth accuracy.'
  );
  lines.push(
    '- The heuristic fit comparison is a lightweight calibration check based on skill overlap and entry-level adjustments.'
  );
  lines.push(
    '- Run the manual config-driven evaluation as well when you want explicit human expectations and narrative failure analysis.'
  );
  lines.push('');

  return writeEvaluationOutputs(
    lines.join('\n'),
    AUTO_EVAL_REPORT_PATH,
    AUTO_EVAL_REPORT_HTML_PATH
  );
}
