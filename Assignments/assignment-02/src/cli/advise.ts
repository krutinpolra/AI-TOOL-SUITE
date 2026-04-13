#!/usr/bin/env node

import { generateApplicationReport } from '../advisor/application.js';
import { loadGapAnalysis } from '../analysis/gaps.js';
import { loadMarketAnalysis } from '../analysis/market.js';
import { extractJobPostingFromFile } from '../extract/jobs.js';
import { loadSavedResume } from '../extract/resume.js';
import { createAppContext } from '../shared/llm.js';
import { isVerboseFlag, UserFacingError } from '../shared/runtime.js';

function usage(): string {
  return [
    'Usage:',
    '  npm run advise -- --posting <job-file> [--verbose]',
    '',
    'Example:',
    '  npm run advise -- --posting "C:\\new-posting.pdf"',
  ].join('\n');
}

function parseArgs(argv: string[]): { postingPath: string; verbose: boolean } {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    throw new UserFacingError(usage());
  }

  const postingIndex = args.findIndex((arg) => arg === '--posting' || arg === '-p');
  if (postingIndex === -1 || !args[postingIndex + 1]) {
    throw new UserFacingError(`Missing --posting\n\n${usage()}`);
  }

  return {
    postingPath: args[postingIndex + 1]!,
    verbose: isVerboseFlag(args),
  };
}

async function main() {
  const { postingPath, verbose } = parseArgs(process.argv);
  const context = createAppContext(verbose);
  const posting = await extractJobPostingFromFile(context, postingPath);
  const resume = await loadSavedResume();
  const marketAnalysis = await loadMarketAnalysis();
  const gapAnalysis = await loadGapAnalysis();
  const result = await generateApplicationReport(
    context,
    posting,
    resume,
    marketAnalysis,
    gapAnalysis
  );

  const cost = context.costTracker.summary();
  process.stdout.write(
    [
      'Phase 3 complete.',
      `Fit score: ${result.report.fitScore}%`,
      `Fit band: ${result.report.fitBand}`,
      `Markdown report: ${result.markdownPath}`,
      `HTML report: ${result.htmlPath}`,
      `JSON report: ${result.jsonPath}`,
      `Estimated cost: $${cost.totalEstimatedCostUsd.toFixed(4)}`,
    ].join('\n') + '\n'
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
