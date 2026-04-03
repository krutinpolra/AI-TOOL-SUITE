import { mkdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decodeToBuffer, decodeToFile, parseDataURI } from '../src';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');
const OUTPUT_DIR = resolve(__dirname, '.tmp');
const OUTPUT_FILE = resolve(OUTPUT_DIR, 'decoded-test.png');

function fixturePath(fileName: string): string {
  return resolve(FIXTURES_DIR, fileName);
}

async function pngDataURI(): Promise<{ bytes: Buffer; base64: string; uri: string }> {
  const bytes = await readFile(fixturePath('test.png'));
  const base64 = bytes.toString('base64');

  return {
    bytes,
    base64,
    uri: `data:image/png;base64,${base64}`,
  };
}

beforeEach(async () => {
  await mkdir(OUTPUT_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(OUTPUT_DIR, { recursive: true, force: true });
});

describe('parseDataURI', () => {
  it('parses a valid Data URI into its components', async () => {
    const { base64, uri } = await pngDataURI();

    const parsed = parseDataURI(uri);

    expect(parsed).toEqual({
      mediaType: 'image/png',
      category: 'image',
      base64,
      raw: uri,
    });
  });

  it('throws when the data prefix is missing', async () => {
    const { base64 } = await pngDataURI();

    expect(() => parseDataURI(`image/png;base64,${base64}`)).toThrow(/data:/i);
  });

  it('throws when the base64 separator is missing', async () => {
    const { base64 } = await pngDataURI();

    expect(() => parseDataURI(`data:image/png,${base64}`)).toThrow(/;base64,/i);
  });

  it('throws when the MIME type is unsupported', () => {
    expect(() => parseDataURI('data:text/plain;base64,SGVsbG8=')).toThrow(/unsupported mime type/i);
  });

  it('throws when the Base64 payload is invalid', () => {
    expect(() => parseDataURI('data:image/png;base64,%%%not-base64%%%')).toThrow(/invalid base64/i);
  });
});

describe('decodeToBuffer', () => {
  it('decodes a known Data URI back to the original bytes', async () => {
    const { bytes, uri } = await pngDataURI();

    const decoded = decodeToBuffer(uri);

    expect(decoded).toEqual(bytes);
  });

  it('throws when the URI is invalid', () => {
    expect(() => decodeToBuffer('data:image/png;base64,%%%not-base64%%%')).toThrow(/invalid base64/i);
  });
});

describe('decodeToFile', () => {
  it('writes decoded bytes to a file', async () => {
    const { bytes, uri } = await pngDataURI();

    await decodeToFile(uri, OUTPUT_FILE);
    const written = await readFile(OUTPUT_FILE);

    expect(written).toEqual(bytes);
  });
});
