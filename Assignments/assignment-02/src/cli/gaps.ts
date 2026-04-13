#!/usr/bin/env node

import { generateGapAnalysis, gapOutputPaths } from '../analysis/gaps.js';
import { loadMarketAnalysis } from '../analysis/market.js';
import { extractResumeFromFile, saveResumeExtraction } from '../extract/resume.js';
import { createAppContext } from '../shared/llm.js';
import { isVerboseFlag, UserFacingError } from '../shared/runtime.js';

function usage(): string {
  return [
    'Usage:',
    '  npm run gaps -- --resume <resume-file> [--verbose]',
    '',
    'Example:',
    '  npm run gaps -- --resume "C:\\resume.pdf"',
  ].join('\n');
}

function parseArgs(argv: string[]): { resumePath: string; verbose: boolean } {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    throw new UserFacingError(usage());
  }

  const resumeIndex = args.findIndex((arg) => arg === '--resume' || arg === '-r');
  if (resumeIndex === -1 || !args[resumeIndex + 1]) {
    throw new UserFacingError(`Missing --resume\n\n${usage()}`);
  }

  return {
    resumePath: args[resumeIndex + 1]!,
    verbose: isVerboseFlag(args),
  };
}

async function main() {
  const { resumePath, verbose } = parseArgs(process.argv);
  const context = createAppContext(verbose);
  const marketAnalysis = await loadMarketAnalysis();
  const resume = await extractResumeFromFile(context, resumePath);
  await saveResumeExtraction(resume);
  await generateGapAnalysis(context, resume, marketAnalysis);

  const cost = context.costTracker.summary();
  process.stdout.write(
    [
      'Phase 2 complete.',
      `Resume data: Assignments/assignment-02/data/resume/resume.json`,
      `Gap report: ${gapOutputPaths.markdown}`,
      `Gap data: ${gapOutputPaths.json}`,
      `Estimated cost: $${cost.totalEstimatedCostUsd.toFixed(4)}`,
    ].join('\n') + '\n'
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
