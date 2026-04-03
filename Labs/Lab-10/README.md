# Data URI Media Utils

`Lab-10` is a small TypeScript utility library for encoding media files and raw bytes as Base64 Data URIs, then parsing or decoding those URIs back into bytes or files. It is designed for multimodal LLM workflows where malformed Data URIs, bad MIME types, or broken Base64 often cause frustrating bugs.

## Supported Media Types

| Category | MIME Types |
| --- | --- |
| Images | `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/svg+xml` |
| Audio | `audio/mpeg`, `audio/wav`, `audio/ogg` |
| Video | `video/mp4`, `video/webm` |

## Installation

```bash
npm install
```

## Usage

### Encode a file

```ts
import { encodeFile } from './src';

const dataURI = await encodeFile('tests/fixtures/test.png');

console.log(dataURI.mediaType);
console.log(dataURI.raw);
```

### Encode raw bytes

```ts
import { encodeBuffer } from './src';

const dataURI = encodeBuffer(Buffer.from('hello world'), 'image/png');

console.log(dataURI.base64);
```

### Parse and decode a Data URI

```ts
import { decodeToBuffer, decodeToFile, parseDataURI } from './src';

const uri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const parsed = parseDataURI(uri);
const bytes = decodeToBuffer(uri);

await decodeToFile(uri, 'decoded/output.png');

console.log(parsed.category);
console.log(bytes.length);
```

## Development

```bash
npm test
npm run typecheck
```

## Notes

- All public results are validated with Zod schemas.
- Errors are explicit for missing files, unsupported extensions or MIME types, empty data, and invalid Base64.
- The test suite covers binary media, SVG text content, round-trips, and common edge cases such as whitespace in Base64 payloads.
