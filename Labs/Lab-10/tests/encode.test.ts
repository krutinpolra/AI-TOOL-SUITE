import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, test } from 'vitest';
import { decodeToBuffer, encodeBuffer, encodeFile } from '../src';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');

function fixturePath(fileName: string): string {
  return resolve(FIXTURES_DIR, fileName);
}

async function readFixture(fileName: string): Promise<Buffer> {
  return readFile(fixturePath(fileName));
}

describe('encodeFile', () => {
  it('encodes a PNG file as a Data URI with the correct MIME type', async () => {
    const bytes = await readFixture('test.png');
    const base64 = bytes.toString('base64');

    const result = await encodeFile(fixturePath('test.png'));

    expect(result.mediaType).toBe('image/png');
    expect(result.category).toBe('image');
    expect(result.base64).toBe(base64);
    expect(result.raw).toBe(`data:image/png;base64,${base64}`);
  });

  it('encodes a JPEG file as a Data URI with the correct MIME type', async () => {
    const bytes = await readFixture('test.jpg');
    const base64 = bytes.toString('base64');

    const result = await encodeFile(fixturePath('test.jpg'));

    expect(result.mediaType).toBe('image/jpeg');
    expect(result.category).toBe('image');
    expect(result.base64).toBe(base64);
    expect(result.raw).toBe(`data:image/jpeg;base64,${base64}`);
  });

  it('encodes an SVG file without corrupting the XML text', async () => {
    const svgText = await readFile(fixturePath('test.svg'), 'utf8');

    const result = await encodeFile(fixturePath('test.svg'));

    expect(result.mediaType).toBe('image/svg+xml');
    expect(result.category).toBe('image');
    expect(Buffer.from(result.base64, 'base64').toString('utf8')).toBe(svgText);
    expect(result.raw.startsWith('data:image/svg+xml;base64,')).toBe(true);
  });

  it('encodes an MP3 file as a Data URI with the correct MIME type', async () => {
    const bytes = await readFixture('test.mp3');
    const base64 = bytes.toString('base64');

    const result = await encodeFile(fixturePath('test.mp3'));

    expect(result.mediaType).toBe('audio/mpeg');
    expect(result.category).toBe('audio');
    expect(result.base64).toBe(base64);
    expect(result.raw).toBe(`data:audio/mpeg;base64,${base64}`);
  });

  it('round-trips file bytes through encodeFile and decodeToBuffer', async () => {
    const original = await readFixture('test.png');
    const encoded = await encodeFile(fixturePath('test.png'));

    const decoded = decodeToBuffer(encoded.raw);

    expect(decoded).toEqual(original);
  });

  it('throws when the file does not exist', async () => {
    await expect(encodeFile(fixturePath('missing.png'))).rejects.toThrow(/does not exist/i);
  });

  it('throws when the file extension is unsupported', async () => {
    await expect(encodeFile(fixturePath('test.bmp'))).rejects.toThrow(/unsupported file extension.*bmp/i);
  });

  it('throws when the file is empty', async () => {
    await expect(encodeFile(fixturePath('empty.png'))).rejects.toThrow(/empty/i);
  });
});

describe('encodeBuffer', () => {
  test.each([
    ['image/png', 'image'],
    ['image/jpeg', 'image'],
    ['image/gif', 'image'],
    ['image/webp', 'image'],
    ['image/svg+xml', 'image'],
    ['audio/mpeg', 'audio'],
    ['audio/wav', 'audio'],
    ['audio/ogg', 'audio'],
    ['video/mp4', 'video'],
    ['video/webm', 'video'],
  ])('encodes buffers for %s', (mimeType, category) => {
    const bytes = Buffer.from('hello world');
    const base64 = bytes.toString('base64');

    const result = encodeBuffer(bytes, mimeType);

    expect(result.mediaType).toBe(mimeType);
    expect(result.category).toBe(category);
    expect(result.base64).toBe(base64);
    expect(result.raw).toBe(`data:${mimeType};base64,${base64}`);
  });

  it('throws when the MIME type is unsupported', () => {
    expect(() => encodeBuffer(Buffer.from('hello world'), 'text/plain')).toThrow(/unsupported mime type/i);
  });

  it('throws when the input data is empty', () => {
    expect(() => encodeBuffer(Buffer.alloc(0), 'image/png')).toThrow(/empty/i);
  });
});
