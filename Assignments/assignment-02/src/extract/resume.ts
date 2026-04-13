import { join } from 'path';

import { fileExists, loadDocumentText, readJsonFile, writeJsonFile } from '../shared/io.js';
import { callStructuredModel, type AppContext } from '../shared/llm.js';
import { buildResumeExtractionUserPrompt, resumeExtractionSystemPrompt } from '../shared/prompts.js';
import { ResumeSchema, type ResumeData } from '../shared/schemas.js';
import { projectRoot } from '../shared/runtime.js';

const RESUME_JSON_PATH = join(projectRoot, 'data', 'resume', 'resume.json');

export async function extractResumeFromFile(
  context: AppContext,
  inputPath: string
): Promise<ResumeData> {
  const document = await loadDocumentText(inputPath, context.logger);
  context.logger.debug('Extracting resume', document.fileName);

  const extracted = await callStructuredModel({
    context,
    schema: ResumeSchema.omit({ source: true }),
    schemaName: 'resume',
    model: context.config.models.extraction,
    systemPrompt: resumeExtractionSystemPrompt(),
    userPrompt: buildResumeExtractionUserPrompt(document.text, document.fileName),
    label: `resume-extraction-${document.fileName}`,
  });

  return ResumeSchema.parse({
    ...extracted,
    source: {
      sourcePath: document.absolutePath,
      sourceFileName: document.fileName,
      sourceSha256: document.sourceSha256,
      extractedAt: new Date().toISOString(),
      parser: document.parser,
      charCount: document.charCount,
      pageCount: document.pageCount,
    },
  });
}

export async function saveResumeExtraction(resume: ResumeData): Promise<string> {
  await writeJsonFile(RESUME_JSON_PATH, resume);
  return RESUME_JSON_PATH;
}

export async function loadSavedResume(): Promise<ResumeData> {
  return ResumeSchema.parse(await readJsonFile(RESUME_JSON_PATH));
}

export async function hasSavedResume(): Promise<boolean> {
  return fileExists(RESUME_JSON_PATH);
}
