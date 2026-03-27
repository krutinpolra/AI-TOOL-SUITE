# Lab 09 - Research Source Credibility Analyzer Agent

`credibility-analyzer` is a TypeScript CLI that uses the OpenAI Agents SDK with an OpenRouter-backed custom model provider, Tavily search, and the Jina Reader to investigate how credible a source URL is.

The agent is designed to:
- read the target source and related pages
- investigate authorship and publication reputation
- verify claims against other sources
- force a structured rubric-based evaluation through an `evaluate_credibility` think tool
- write a final Markdown credibility report to disk
- print and save a trace of the agent's steps for debugging

## Stack

- OpenAI Agents SDK (`@openai/agents`)
- OpenRouter via a custom `ModelProvider`
- Tavily for web search
- Jina Reader for readable page content
- TypeScript + Zod

## Requirements

- Node.js + npm
- A root `.env` file at `AIP444/.env` containing:
  - `OPENROUTER_API_KEY=...`
  - `TAVILY_API_KEY=...`

Optional:
- `OPENROUTER_MODEL=...`
- `JINA_READ_CHAR_LIMIT=14000`
- `OPENROUTER_HTTP_REFERER=...`
- `OPENROUTER_APP_TITLE=...`

## Install

```bash
cd Labs/Lab-09
npm install
```

## Run

### Dev

```bash
npm run dev -- <URL>
```

Example:

```bash
npm run dev -- https://www.canada.ca/en/public-health/services/diseases/coronavirus-disease-covid-19.html
```

### Build + Run

```bash
npm run build
node dist/credibility-analyzer.js <URL>
```

## Options

- `--output`, `-o`: preferred Markdown filename for the final report
- `--turns`, `-t`: max agent turns (default: `18`)
- `--model`, `-m`: override the model name passed through OpenRouter

Example:

```bash
npm run dev -- https://www.reuters.com/ --output reuters-report.md --turns 20 --model openai/gpt-5.4
```

## Output

Each run will:
- save the final Markdown report in `Labs/Lab-09/reports/`
- print a human-readable trace to `stderr`
- save the full structured trace as `*-trace.json` beside the report

The CLI prints:
- report path
- trace path
- final credibility verdict
- the agent's short completion message

## Required Tools Implemented

- `read_url`: reads URLs through the Jina Reader and returns truncated readable content
- `web_search`: searches the web with Tavily for author, publication, corroboration, and fact-check research
- `evaluate_credibility`: records a structured credibility rubric in the agent context
- `write_file`: writes the final Markdown report to disk

## Notes

- The current `@openai/agents` release expects `zod` 3, so this lab uses `zod@^3.25.x` even though some earlier labs in the repo used Zod 4.
- Tracing to OpenAI is disabled in code because this lab routes model calls through OpenRouter, but a local saved trace is still generated for the lab requirement.
- The `write_file` tool refuses to run until the agent has already called `evaluate_credibility`, which helps enforce the intended think-tool workflow.

## Suggested Testing Matrix

To satisfy the lab prompt, run the CLI against one URL from each category:

- Government or institutional source
- Major news organization
- Organizational or corporate blog
- Personal blog or opinion site
- A tricky source that looks credible but has credibility issues

You can reuse the same command shape for each source:

```bash
npm run dev -- <URL> --output some-report-name.md
```
