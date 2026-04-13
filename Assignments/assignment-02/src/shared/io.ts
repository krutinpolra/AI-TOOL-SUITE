import { createHash } from 'crypto';
import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { basename, extname, relative, resolve } from 'path';
import pdfParse from 'pdf-parse';

import { Logger, UserFacingError, projectRoot } from './runtime.js';

export type LoadedDocument = {
  absolutePath: string;
  fileName: string;
  extension: string;
  text: string;
  charCount: number;
  pageCount: number | null;
  sourceSha256: string;
  parser: string;
};

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.txt', '.md', '.markdown', '.html', '.htm']);

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf-8');
}

export async function readJsonFile<T>(path: string): Promise<T> {
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw) as T;
}

export async function writeTextFile(path: string, value: string): Promise<void> {
  await writeFile(path, value.endsWith('\n') ? value : value + '\n', 'utf-8');
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

export function relativeToProject(path: string): string {
  return relative(projectRoot, path).replace(/\\/g, '/');
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function sha256File(path: string): Promise<string> {
  const buffer = await readFile(path);
  return createHash('sha256').update(buffer).digest('hex');
}

export async function listSupportedFiles(inputDir: string): Promise<string[]> {
  const resolvedDir = resolve(inputDir);
  const entries = await readdir(resolvedDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry) => resolve(resolvedDir, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

export async function listJsonFiles(inputDir: string): Promise<string[]> {
  const resolvedDir = resolve(inputDir);
  const entries = await readdir(resolvedDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.json')
    .map((entry) => resolve(resolvedDir, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

function stripHtml(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function loadDocumentText(
  inputPath: string,
  logger: Logger
): Promise<LoadedDocument> {
  const absolutePath = resolve(inputPath);
  const extension = extname(absolutePath).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new UserFacingError(
      `Unsupported file type for ${basename(absolutePath)}. Supported types: ${[
        ...SUPPORTED_EXTENSIONS,
      ].join(', ')}`
    );
  }

  const sourceSha256 = await sha256File(absolutePath);

  if (extension === '.pdf') {
    try {
      const buffer = await readFile(absolutePath);
      const parsed = await pdfParse(buffer);
      const text = parsed.text.replace(/\u0000/g, ' ').replace(/\s+\n/g, '\n').trim();

      if (!text) {
        throw new Error('The PDF parser returned no text.');
      }

      logger.debug('Loaded PDF document', {
        file: basename(absolutePath),
        pages: parsed.numpages,
        chars: text.length,
      });

      return {
        absolutePath,
        fileName: basename(absolutePath),
        extension,
        text,
        charCount: text.length,
        pageCount: parsed.numpages ?? null,
        sourceSha256,
        parser: 'pdf-parse',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new UserFacingError(
        `Could not parse PDF ${basename(absolutePath)}. ${message} Try re-exporting it or using a text/HTML version.`
      );
    }
  }

  const rawText = await readFile(absolutePath, 'utf-8');
  const text =
    extension === '.html' || extension === '.htm'
      ? stripHtml(rawText)
      : rawText.replace(/\u0000/g, ' ').trim();

  if (!text) {
    throw new UserFacingError(`The input file ${basename(absolutePath)} is empty after parsing.`);
  }

  logger.debug('Loaded text document', {
    file: basename(absolutePath),
    extension,
    chars: text.length,
  });

  return {
    absolutePath,
    fileName: basename(absolutePath),
    extension,
    text,
    charCount: text.length,
    pageCount: null,
    sourceSha256,
    parser: extension,
  };
}
