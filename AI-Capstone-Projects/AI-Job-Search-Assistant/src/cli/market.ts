#!/usr/bin/env node

import { generateMarketAnalysis, marketOutputPaths } from '../analysis/market.js';
import { processJobPostingDirectory } from '../extract/jobs.js';
import { createAppContext } from '../shared/llm.js';
import { isVerboseFlag, UserFacingError } from '../shared/runtime.js';

function usage(): string {
  return [
    'Usage:',
    '  npm run market -- --input-dir <folder> [--verbose]',
    '',
    'Example:',
    '  npm run market -- --input-dir "C:\\job-postings"',
  ].join('\n');
}

function parseArgs(argv: string[]): { inputDir: string; verbose: boolean } {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    throw new UserFacingError(usage());
  }

  const inputIndex = args.findIndex((arg) => arg === '--input-dir' || arg === '-i');
  if (inputIndex === -1 || !args[inputIndex + 1]) {
    throw new UserFacingError(`Missing --input-dir\n\n${usage()}`);
  }

  return {
    inputDir: args[inputIndex + 1]!,
    verbose: isVerboseFlag(args),
  };
}

async function main() {
  const { inputDir, verbose } = parseArgs(process.argv);
  const context = createAppContext(verbose);
  const result = await processJobPostingDirectory(context, inputDir);
  if (result.allPostings.length === 0) {
    throw new UserFacingError('No job postings were successfully processed.');
  }

  await generateMarketAnalysis(context, result.allPostings);
  if (result.allPostings.length < 8) {
    context.logger.warn(
      'Minimum posting target not reached',
      `You currently have ${result.allPostings.length} saved postings; assignment minimum is 8.`
    );
  }

  const cost = context.costTracker.summary();
  process.stdout.write(
    [
      'Phase 1 complete.',
      `Processed this run: ${result.processed.length}`,
      `Skipped from cache: ${result.skipped.length}`,
      `Saved postings total: ${result.allPostings.length}`,
      `Market report: ${marketOutputPaths.markdown}`,
      `Market HTML: ${marketOutputPaths.html}`,
      `Market data: ${marketOutputPaths.json}`,
      `Estimated cost: $${cost.totalEstimatedCostUsd.toFixed(4)}`,
    ].join('\n') + '\n'
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
