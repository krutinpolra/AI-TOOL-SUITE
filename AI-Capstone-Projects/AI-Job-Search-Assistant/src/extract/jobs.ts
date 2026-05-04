import { join, resolve } from 'path';

import { computeMarketAggregate } from '../shared/analysis.js';
import {
  loadDocumentText,
  fileExists,
  listJsonFiles,
  listSupportedFiles,
  readJsonFile,
  relativeToProject,
  sha256File,
  slugify,
  writeJsonFile,
} from '../shared/io.js';
import { callStructuredModel, type AppContext } from '../shared/llm.js';
import { buildJobExtractionUserPrompt, jobExtractionSystemPrompt } from '../shared/prompts.js';
import {
  JobManifestSchema,
  JobPostingSchema,
  ProcessingFailureSchema,
  type JobManifest,
  type JobPosting,
  type ProcessingFailure,
} from '../shared/schemas.js';
import { runCompanyResearch } from '../shared/research.js';
import { projectRoot } from '../shared/runtime.js';

const JOBS_DIR = join(projectRoot, 'data', 'jobs');
const MANIFEST_PATH = join(JOBS_DIR, 'manifest.json');
const FAILURES_PATH = join(JOBS_DIR, 'failures.json');

function createSourceMetadata(document: Awaited<ReturnType<typeof loadDocumentText>>) {
  return {
    sourcePath: document.absolutePath,
    sourceFileName: document.fileName,
    sourceSha256: document.sourceSha256,
    extractedAt: new Date().toISOString(),
    parser: document.parser,
    charCount: document.charCount,
    pageCount: document.pageCount,
  };
}

export async function extractJobPostingFromFile(
  context: AppContext,
  inputPath: string,
  options?: { skipCompanyResearch?: boolean }
): Promise<JobPosting> {
  const document = await loadDocumentText(inputPath, context.logger);
  context.logger.debug('Extracting posting', document.fileName);

  const extracted = await callStructuredModel({
    context,
    schema: JobPostingSchema.omit({ source: true, companyResearch: true }),
    schemaName: 'job_posting',
    model: context.config.models.extraction,
    systemPrompt: jobExtractionSystemPrompt(),
    userPrompt: buildJobExtractionUserPrompt(document.text, document.fileName),
    label: `job-extraction-${document.fileName}`,
  });

  let companyResearch = null;
  if (!options?.skipCompanyResearch) {
    try {
      companyResearch = await runCompanyResearch(context, {
        ...extracted,
        source: createSourceMetadata(document),
        companyResearch: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      context.logger.warn('Company research failed; continuing without it', message);
      companyResearch = {
        status: 'failed' as const,
        summary: null,
        sizeAndStage: null,
        industry: null,
        recentDevelopments: [],
        cultureSignals: [],
        applicationAngles: [],
        searchQueries: [],
        sources: [],
        failureReason: message,
      };
    }
  }

  return JobPostingSchema.parse({
    ...extracted,
    source: createSourceMetadata(document),
    companyResearch,
  });
}

async function loadManifest(): Promise<JobManifest> {
  if (!(await fileExists(MANIFEST_PATH))) {
    return JobManifestSchema.parse({ version: 1, entries: [] });
  }

  return JobManifestSchema.parse(await readJsonFile(MANIFEST_PATH));
}

async function loadFailures(): Promise<ProcessingFailure[]> {
  if (!(await fileExists(FAILURES_PATH))) {
    return [];
  }

  return ProcessingFailureSchema.array().parse(await readJsonFile(FAILURES_PATH));
}

export async function loadSavedJobPostings(): Promise<JobPosting[]> {
  const jsonFiles = await listJsonFiles(JOBS_DIR).catch(() => []);
  const postings: JobPosting[] = [];

  for (const file of jsonFiles) {
    if (file.endsWith('manifest.json') || file.endsWith('failures.json')) {
      continue;
    }

    try {
      postings.push(JobPostingSchema.parse(await readJsonFile(file)));
    } catch {
      continue;
    }
  }

  return postings.sort((left, right) => left.jobTitle.localeCompare(right.jobTitle));
}

export async function processJobPostingDirectory(
  context: AppContext,
  inputDir: string
): Promise<{
  processed: string[];
  skipped: string[];
  failures: ProcessingFailure[];
  allPostings: JobPosting[];
}> {
  const files = await listSupportedFiles(inputDir);
  const manifest = await loadManifest();
  const failures = await loadFailures();
  const processed: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const absolutePath = resolve(file);
    const existingEntry = manifest.entries.find((entry) => entry.sourcePath === absolutePath);
    const currentSha = await sha256File(absolutePath);
    if (
      existingEntry &&
      existingEntry.sourceSha256 === currentSha &&
      (await fileExists(existingEntry.outputPath))
    ) {
      skipped.push(absolutePath);
      continue;
    }

    try {
      const posting = await extractJobPostingFromFile(context, absolutePath);
      const outputFileName = `${slugify(posting.jobTitle)}-${slugify(posting.companyName)}-${posting.source.sourceSha256.slice(0, 8)}.json`;
      const outputPath = join(JOBS_DIR, outputFileName);
      await writeJsonFile(outputPath, posting);

      manifest.entries = manifest.entries.filter((entry) => entry.sourcePath !== absolutePath);
      manifest.entries.push({
        sourcePath: absolutePath,
        sourceSha256: posting.source.sourceSha256,
        outputPath,
        processedAt: new Date().toISOString(),
      });

      processed.push(absolutePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({
        sourcePath: absolutePath,
        failedAt: new Date().toISOString(),
        stage: 'job_extraction',
        message,
      });
      context.logger.warn('Job posting failed', { file: absolutePath, message });
    }
  }

  await writeJsonFile(MANIFEST_PATH, manifest);
  await writeJsonFile(FAILURES_PATH, failures);
  const allPostings = await loadSavedJobPostings();
  context.logger.debug('Job posting run summary', {
    processed: processed.length,
    skipped: skipped.length,
    failures: failures.length,
    totalSaved: allPostings.length,
    aggregatePreview: computeMarketAggregate(allPostings),
  });

  return {
    processed: processed.map(relativeToProject),
    skipped: skipped.map(relativeToProject),
    failures,
    allPostings,
  };
}
