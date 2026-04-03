import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { DataURISchema, EXTENSION_TO_MIME, MediaTypeSchema, getCategory } from './types';
import type { DataURI, MediaType } from './types';

function parseSupportedMediaType(mimeType: string): MediaType {
  const result = MediaTypeSchema.safeParse(mimeType);

  if (!result.success) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }

  return result.data;
}

function encodeBytes(data: Buffer | Uint8Array): { bytes: Buffer; base64: string } {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);

  if (bytes.length === 0) {
    throw new Error('Cannot encode empty data');
  }

  return {
    bytes,
    base64: bytes.toString('base64'),
  };
}

/**
 * Reads a media file from disk and returns it as a Data URI.
 *
 * @param filePath - Path to the media file
 * @returns A DataURI object with the encoded content
 * @throws Error if the file doesn't exist
 * @throws Error if the file extension is unsupported
 * @throws Error if the file is empty (0 bytes)
 */
export async function encodeFile(filePath: string): Promise<DataURI> {
  const extension = extname(filePath).slice(1).toLowerCase();
  const mimeType = EXTENSION_TO_MIME[extension];

  if (!mimeType) {
    const label = extension ? `.${extension}` : '(none)';
    throw new Error(`Unsupported file extension: ${label}`);
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(filePath);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`File does not exist: ${filePath}`);
    }

    throw error;
  }

  return encodeBuffer(bytes, mimeType);
}

/**
 * Encodes a raw Buffer/Uint8Array as a Data URI with
 * the given MIME type.
 *
 * @param data - The raw binary data
 * @param mimeType - A valid MIME type string
 * @returns A DataURI object
 * @throws Error if the MIME type is unsupported
 * @throws Error if the data is empty
 */
export function encodeBuffer(data: Buffer | Uint8Array, mimeType: string): DataURI {
  const supportedMimeType = parseSupportedMediaType(mimeType);
  const { base64 } = encodeBytes(data);

  return DataURISchema.parse({
    mediaType: supportedMimeType,
    category: getCategory(supportedMimeType),
    base64,
    raw: `data:${supportedMimeType};base64,${base64}`,
  });
}
