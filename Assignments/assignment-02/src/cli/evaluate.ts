#!/usr/bin/env node

import { runEvaluation } from '../eval/run-eval.js';
import { createAppContext } from '../shared/llm.js';
import { isVerboseFlag, UserFacingError } from '../shared/runtime.js';

function usage(): string {
  return [
    'Usage:',
    '  npm run evaluate -- --config <eval-config.json> [--verbose]',
    '',
    'Example:',
    '  npm run evaluate -- --config eval/eval-config.json',
  ].join('\n');
}

function parseArgs(argv: string[]): { configPath: string; verbose: boolean } {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    throw new UserFacingError(usage());
  }

  const configIndex = args.findIndex((arg) => arg === '--config' || arg === '-c');
  if (configIndex === -1 || !args[configIndex + 1]) {
    throw new UserFacingError(`Missing --config\n\n${usage()}`);
  }

  return {
    configPath: args[configIndex + 1]!,
    verbose: isVerboseFlag(args),
  };
}

async function main() {
  const { configPath, verbose } = parseArgs(process.argv);
  const context = createAppContext(verbose);
  const reportPath = await runEvaluation(context, configPath);
  const cost = context.costTracker.summary();
  process.stdout.write(
    [
      'Evaluation complete.',
      `Evaluation report: ${reportPath}`,
      `Estimated cost: $${cost.totalEstimatedCostUsd.toFixed(4)}`,
    ].join('\n') + '\n'
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
