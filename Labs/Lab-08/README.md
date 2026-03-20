# Lab 8 — vis-fix

`vis-fix` is a CLI that analyzes a screenshot of a developer error using a vision-capable LLM (via OpenRouter) and performs a web search (via Tavily) when needed to provide an up-to-date fix.

## Requirements

- Node.js + npm
- A root `.env` file at the workspace root (AIP444/) containing:
  - `OPENROUTER_API_KEY=...`
  - `TAVILY_API_KEY=...`

Optional:
- `OPENROUTER_MODEL=google/gemini-3-flash-preview`

## Install

```bash
cd Labs/Lab-08
npm install
```

## Run

### Dev (TypeScript)

```bash
npm run dev -- path/to/screenshot.png --prompt "Help me fix this error"
```

### Build + Run (compiled JS)

```bash
npm run build
node dist/vis-fix.js path/to/screenshot.png
```

## Capturing a Transcript (for submission)

In Git Bash / bash, capture both stdout + stderr into a file:

```bash
npm run dev -- "/c/path/to/screenshot.png" --prompt "You MUST call web_search and cite URLs" 2>&1 | tee transcript.txt
```

## Optimization Stats

On each run, the tool logs a line like:

```
[vis-fix] Optimization stats: original=..., jpeg=..., base64=... chars
```

- `original` = original screenshot file size (bytes)
- `jpeg` = processed JPEG size before Base64 encoding (bytes)
- `base64` = Base64 string length (characters; roughly bytes)

## Notes

- The image pipeline resizes to max 1024px on the longest side and converts to JPEG quality 85.
- Debug logs (optimization stats and web_search queries) print to stderr.
