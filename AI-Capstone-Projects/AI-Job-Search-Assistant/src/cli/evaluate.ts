#!/usr/bin/env node

import { runEvaluation } from '../eval/run-eval.js';
import { runAutomaticEvaluation } from '../eval/run-eval.js';
import { createAppContext } from '../shared/llm.js';
import { isVerboseFlag, projectRoot, UserFacingError } from '../shared/runtime.js';
import { join } from 'path';

function usage(): string {
  return [
    'Usage:',
    '  npm run evaluate -- --config <eval-config.json> [--verbose]',
    '  npm run evaluate -- --auto [--extraction-limit 5] [--scoring-limit 10] [--verbose]',
    '',
    'Example:',
    '  npm run evaluate -- --config eval/eval-config.json',
    '  npm run evaluate -- --auto --scoring-limit 10',
  ].join('\n');
}

function parseArgs(argv: string[]): {
  configPath: string | null;
  verbose: boolean;
  auto: boolean;
  extractionLimit: number | null;
  scoringLimit: number | null;
} {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    throw new UserFacingError(usage());
  }

  const auto = args.includes('--auto');
  const configIndex = args.findIndex((arg) => arg === '--config' || arg === '-c');
  const extractionLimitIndex = args.findIndex(
    (arg) => arg === '--extraction-limit' || arg === '--extract-limit'
  );
  const scoringLimitIndex = args.findIndex(
    (arg) => arg === '--scoring-limit' || arg === '--score-limit'
  );

  if (!auto && (configIndex === -1 || !args[configIndex + 1])) {
    throw new UserFacingError(`Missing --config or use --auto\n\n${usage()}`);
  }

  return {
    configPath: configIndex !== -1 ? args[configIndex + 1] ?? null : null,
    verbose: isVerboseFlag(args),
    auto,
    extractionLimit:
      extractionLimitIndex !== -1 && args[extractionLimitIndex + 1]
        ? Number.parseInt(args[extractionLimitIndex + 1]!, 10)
        : null,
    scoringLimit:
      scoringLimitIndex !== -1 && args[scoringLimitIndex + 1]
        ? Number.parseInt(args[scoringLimitIndex + 1]!, 10)
        : null,
  };
}

async function main() {
  const { configPath, verbose, auto, extractionLimit, scoringLimit } = parseArgs(process.argv);
  const context = createAppContext(verbose);
  const reportPath = auto
    ? await runAutomaticEvaluation(context, {
        extractionLimit: extractionLimit ?? undefined,
        scoringLimit: scoringLimit ?? undefined,
      })
    : await runEvaluation(context, configPath!);
  const cost = context.costTracker.summary();
  process.stdout.write(
    [
      auto ? 'Automatic evaluation complete.' : 'Evaluation complete.',
      `Evaluation report: ${reportPath}`,
      `Evaluation HTML: ${
        auto
          ? join(projectRoot, 'eval', 'automatic-evaluation-report.html')
          : join(projectRoot, 'eval', 'evaluation-report.html')
      }`,
      `Estimated cost: $${cost.totalEstimatedCostUsd.toFixed(4)}`,
    ].join('\n') + '\n'
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
