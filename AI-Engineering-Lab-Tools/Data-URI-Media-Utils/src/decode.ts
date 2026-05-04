import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { DataURISchema, MediaTypeSchema, getCategory } from './types';
import type { DataURI, MediaType } from './types';

const DATA_URI_PREFIX = 'data:';
const BASE64_SEPARATOR = ';base64,';

function parseSupportedMediaType(mimeType: string): MediaType {
  const result = MediaTypeSchema.safeParse(mimeType);

  if (!result.success) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }

  return result.data;
}

function normalizeBase64Payload(base64: string): string {
  const compact = base64.replace(/\s+/g, '');

  if (compact.length === 0) {
    throw new Error('Invalid Base64 payload: payload is empty');
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
    throw new Error('Invalid Base64 payload: invalid characters or padding');
  }

  const remainder = compact.length % 4;
  if (remainder === 1) {
    throw new Error('Invalid Base64 payload: incorrect length');
  }

  return compact.padEnd(compact.length + ((4 - remainder) % 4), '=');
}

function decodeBase64(base64: string): Buffer {
  const normalized = normalizeBase64Payload(base64);
  const decoded = Buffer.from(normalized, 'base64');

  if (decoded.length === 0) {
    throw new Error('Invalid Base64 payload: decoded data is empty');
  }

  if (decoded.toString('base64') !== normalized) {
    throw new Error('Invalid Base64 payload: content is corrupted or truncated');
  }

  return decoded;
}

/**
 * Parses a Data URI string into its components.
 *
 * @param uri - A complete Data URI string
 *   (e.g. "data:image/png;base64,iVBOR...")
 * @returns A DataURI object with parsed components
 * @throws Error if the string is not a valid Data URI
 * @throws Error if the MIME type is unsupported
 * @throws Error if the Base64 content is invalid
 */
export function parseDataURI(uri: string): DataURI {
  if (!uri.startsWith(DATA_URI_PREFIX)) {
    throw new Error("Invalid Data URI: missing 'data:' prefix");
  }

  const separatorIndex = uri.indexOf(BASE64_SEPARATOR);
  if (separatorIndex === -1) {
    throw new Error("Invalid Data URI: missing ';base64,' separator");
  }

  const mimeType = parseSupportedMediaType(uri.slice(DATA_URI_PREFIX.length, separatorIndex));
  const base64 = normalizeBase64Payload(uri.slice(separatorIndex + BASE64_SEPARATOR.length));

  decodeBase64(base64);

  return DataURISchema.parse({
    mediaType: mimeType,
    category: getCategory(mimeType),
    base64,
    raw: uri,
  });
}

/**
 * Decodes a Data URI string back into raw binary data.
 *
 * @param uri - A complete Data URI string
 * @returns A Buffer containing the decoded binary data
 * @throws Error if the URI is invalid
 */
export function decodeToBuffer(uri: string): Buffer {
  const parsed = parseDataURI(uri);

  return decodeBase64(parsed.base64);
}

/**
 * Decodes a Data URI and writes the result to a file.
 *
 * @param uri - A complete Data URI string
 * @param outputPath - Where to write the decoded file
 * @throws Error if the URI is invalid
 */
export async function decodeToFile(uri: string, outputPath: string): Promise<void> {
  const bytes = decodeToBuffer(uri);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, bytes);
}
