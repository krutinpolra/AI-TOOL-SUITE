# Assignment 02: Job Search Assistant

This project is an end-to-end AI job-search assistant built for `AIP444` Assignment 2. It ingests job postings and a resume, extracts structured data with OpenRouter models, researches companies with Tavily, compares the resume against the market, and generates targeted application advice for a new posting.

The repo path in this workspace is `Assignments/assignment-02/`. The assignment handout uses `assignments/assignment-02/`; on this Windows repo the existing top-level folder is `Assignments/`.

## Features

- Phase 1 CLI for job market analysis across `8+` postings
- Phase 2 CLI for resume gap analysis with triaged actions
- Phase 3 CLI advisor that reuses earlier artifacts and generates:
  - fit assessment
  - resume adaptation suggestions
  - cover letter guidance
  - interview prep
- Phase 3 cover letter generator that writes 2 full tailored draft variants
- Tavily-backed company research with graceful degradation if research fails
- Structured extraction with `Zod` validation
- Estimated token/cost tracking per run
- Verbose diagnostics to `stderr`
- Self-contained HTML reports for market analysis, gap analysis, advisor output, and evaluation
- Evaluation harness for extraction checks, scoring checks, and failure analysis write-up

## Stack

- TypeScript
- OpenAI SDK pointed at `OpenRouter`
- `Zod` for structured outputs and validation
- `@tavily/core` for web search
- `pdf-parse` for local PDF text extraction

## Setup

1. From the assignment folder:

```bash
cd Assignments/assignment-02
```

2. Install dependencies:

```bash
npm install
```

3. Create environment variables.

Copy `.env.example` values into your root repo `.env` or a local `Assignments/assignment-02/.env`.

Required:

- `OPENROUTER_API_KEY`
- `TAVILY_API_KEY`

Optional:

- `OPENROUTER_MODEL`
- `OPENROUTER_MODEL_EXTRACTION`
- `OPENROUTER_MODEL_ANALYSIS`
- `OPENROUTER_MODEL_RESEARCH`
- `OPENROUTER_MODEL_ADVISOR`
- `OPENROUTER_HTTP_REFERER`
- `OPENROUTER_APP_TITLE`
- `RUN_COST_BUDGET_USD`
- `MAX_TOOL_STEPS`
- `TAVILY_MAX_RESULTS`
- `LOG_LEVEL`

## Input Data

Do not commit your raw job-posting PDFs or resume to git.

Suggested local setup outside the repo:

```text
C:\private-job-search\
  jobs\
    posting-01.pdf
    posting-02.pdf
    ...
  resume\
    resume.pdf
  advisor\
    new-posting.pdf
```

Supported input formats:

- `.pdf`
- `.txt`
- `.md`
- `.html`

## Project Layout

```text
Assignments/assignment-02/
├── README.md
├── .env.example
├── src/
│   ├── extract/
│   ├── analysis/
│   ├── advisor/
│   ├── eval/
│   └── shared/
├── data/
│   ├── jobs/
│   ├── resume/
│   └── analysis/
├── reports/
├── eval/
└── docs/
```

## Phase 1: Job Market Analysis

Run:

```bash
npm run market -- --input-dir "C:\private-job-search\jobs" --verbose
```

What it does:

- processes all supported job files in the folder
- skips files already processed into JSON using a manifest cache
- extracts structured posting data
- researches each company with Tavily
- writes one JSON file per posting into `data/jobs/`
- writes:
  - `data/analysis/market-analysis.json`
  - `reports/market-analysis.md`
  - `reports/market-analysis.html`

## Phase 2: Resume Gap Analysis

Run:

```bash
npm run gaps -- --resume "C:\private-job-search\resume\resume.pdf" --verbose
```

What it does:

- extracts structured resume data into `data/resume/resume.json`
- loads the saved Phase 1 market analysis
- generates a triaged gap analysis
- writes:
  - `data/analysis/gap-analysis.json`
  - `reports/gap-analysis.md`
  - `reports/gap-analysis.html`

## Phase 3: Application Advisor

Run:

```bash
npm run advise -- --posting "C:\private-job-search\advisor\new-posting.pdf" --verbose
```

What it does:

- reuses Phase 1 posting extraction logic
- researches the target company
- loads:
  - saved resume extraction
  - market analysis
  - gap analysis
- generates:
  - fit assessment
  - resume adaptation
  - cover letter guidance
  - interview prep
- writes:
  - `data/analysis/<posting-slug>.json`
  - `reports/<posting-slug>.md`
  - `reports/<posting-slug>.html`
  - `reports/<posting-slug>-cover-letter-variant-1.md`
  - `reports/<posting-slug>-cover-letter-variant-2.md`

The HTML reports are self-contained and open directly in a browser.

## Evaluation

1. Copy the example config and fill in real paths/expectations:

```bash
copy eval\eval-config.example.json eval\eval-config.json
```

2. Run evaluation:

```bash
npm run evaluate -- --config eval/eval-config.json --verbose
```

Automatic mode without manual config:

```bash
npm run evaluate -- --auto --scoring-limit 10 --verbose
```

Outputs:

- `eval/evaluation-report.md`
- `eval/evaluation-report.html`
- `eval/automatic-evaluation-report.md`
- `eval/automatic-evaluation-report.html`

The harness supports:

- extraction spot-checks
- scoring checks
- manual failure-analysis entries
- overall observations
- automatic regression-style extraction consistency checks
- automatic multi-posting fit-score review without a manual config file

## Safety and Reliability

This project explicitly handles:

- malformed input: bad/empty PDFs raise user-facing errors
- schema mismatch: structured outputs are validated with `Zod`
- retry behavior: model calls retry on transient failures
- graceful degradation: company research failure does not block report generation
- secret handling: `.env`-based keys, no hardcoded secrets
- loop guardrails: Tavily tool loop capped by `MAX_TOOL_STEPS`
- budget guardrails: estimated run cost tracked against `RUN_COST_BUDGET_USD`

## Observability

Use `--verbose` or `LOG_LEVEL=debug`.

Verbose mode logs to `stderr`:

- extraction start and document stats
- tool calls and search queries
- structured validation passes/failures
- fit-scoring breakdown
- estimated token/cost data

## Extras Implemented

- Extra 1: Cover Letter Generator
  - Phase 3 now generates 2 full tailored cover letter drafts
  - The drafts are based on fit analysis, resume strengths, and company research
  - Each variant uses a different tone or emphasis and is saved as its own markdown file
- Extra 3: Rich Visual Reports
  - Market analysis, gap analysis, application advisor, and evaluation all write styled self-contained HTML reports
  - Phase 3 includes visual fit breakdown and market skill alignment charts

## Notes

- Phase 3 in this submission was built primarily using a coding agent and should be documented honestly in `docs/reflection.md`.
- You still need to run the project with your real inputs and complete the reflection/evaluation content before submission.
