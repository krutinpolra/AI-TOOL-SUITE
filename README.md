# AI Tool Suite Recruiter Knowledge Base

## Purpose

This knowledge-base file explains the AI Tool Suite in a recruiter-friendly way. It is written so a chatbot, portfolio assistant, or recruiter screening system can answer detailed questions about the tools, technical stack, architecture, engineering decisions, and skills demonstrated.

The suite contains practical AI-powered developer, research, learning, media, and career tools. Each tool is designed around a real workflow, not just a single prompt.

## Executive Summary

The AI Tool Suite demonstrates hands-on AI application engineering across command-line tools, APIs, structured-output systems, agentic workflows, multimodal debugging, semantic search, source credibility research, media encoding utilities, code review automation, and job-search intelligence.

The strongest signal for recruiters is that these tools wrap LLMs in real software architecture:

- validated inputs and outputs
- typed schemas
- prompt guardrails
- tool calling
- web search integration
- vector embeddings
- multimodal image handling
- cost tracking
- diagnostics and tracing
- report generation
- reusable CLI and API workflows
- evaluation and testing

## High-Level Technical Profile

### Primary Languages

- JavaScript
- TypeScript
- Markdown

### AI and LLM Capabilities

- OpenRouter-compatible OpenAI SDK usage
- Chat Completions style model calls
- Structured model outputs
- Zod-validated schemas
- Vision-capable model workflows
- Embedding-based semantic search
- Tool-using agent workflows
- Web-search-augmented reasoning
- AI-generated Markdown and HTML reports

### Supporting Libraries and Services

- Hono for lightweight HTTP APIs
- Zod for runtime validation and typed structured outputs
- Tavily for web search
- Jina Reader for readable web-page extraction
- Sharp for screenshot resizing and image optimization
- pdf-parse for document text extraction
- markdown-it for HTML report rendering
- Vitest for utility-library tests
- Node.js CLI, file system, child process, and readline APIs

## Suite Elevator Pitch

This AI Tool Suite shows the ability to build complete AI products around practical workflows. It includes developer tools that automate Git commits and code reviews, research tools that analyze source credibility, learning tools that generate flashcards, multimodal tools that debug screenshots, search tools that use embeddings, and career tools that analyze job postings and produce targeted application advice.

The suite demonstrates not only LLM prompting, but also the engineering needed to make AI useful: validation, retries, cost controls, file handling, tool access, structured data, reports, diagnostics, and human-readable outputs.

## Tool Inventory

| Tool | Purpose | Key Skills Demonstrated |
| --- | --- | --- |
| Git Scribe | Generates Conventional Commit messages from staged Git changes | Git automation, CLI design, prompt engineering |
| Flashcard Generator CLI | Converts notes into structured study flashcards | educational AI, JSON output, cost tracking |
| GitHub PR Explainer | Explains GitHub pull requests using diffs and comments | GitHub API, technical summarization, PR analysis |
| Flashcard Generator API | Exposes flashcard generation through a typed HTTP API | TypeScript, Hono, Zod, structured outputs |
| Semantic Product Search | Searches products by meaning using embeddings | vector search, embeddings, ranking |
| vis-fix Vision Debugger | Analyzes screenshots of developer errors and suggests fixes | multimodal AI, image processing, web search |
| Source Credibility Analyzer | Investigates how trustworthy a URL or source is | AI agents, web research, credibility scoring |
| Data URI Media Utils | Encodes and decodes media files as Base64 Data URIs | library design, validation, tests, media handling |
| AI Code Review CLI | Reviews code with parallel AI reviewers and final synthesis | tool calling, code analysis, structured findings |
| AI Job Search Assistant | Analyzes jobs, resumes, market gaps, and application strategy | extraction, research, reporting, evaluation |

## Git Scribe

### Summary

Git Scribe is an AI-powered command-line tool that reads staged Git changes and generates a meaningful commit message. It is designed to help developers write clearer commit history with less manual effort.

### What It Does

- Reads the current staged Git diff.
- Sends the diff to an LLM through OpenRouter.
- Generates a concise Conventional Commit style message.
- Supports a creative mode for alternate message style.
- Asks for user confirmation before committing.
- Runs the Git commit only after approval.

### Technical Design

Important implementation pieces:

- `getStagedDiff()` collects staged changes with Git.
- `generateCommitMessage()` prompts the model with the diff.
- `promptUser()` handles CLI confirmation.
- `executeCommit()` performs the commit.
- Environment variables are loaded securely from `.env`.
- The OpenAI SDK is configured to use OpenRouter.

### Recruiter-Relevant Value

This tool demonstrates practical developer automation. It uses AI to produce a useful developer artifact while keeping the human in control before any repository-changing action happens.

### Interview Talking Point

"Git Scribe treats the model as an assistant inside a safe workflow. It can suggest a commit message from the staged diff, but it still asks the developer before committing."

## Flashcard Generator CLI

### Summary

The Flashcard Generator CLI turns raw notes into structured study flashcards. It is designed for high-quality learning output, not generic summaries.

### What It Does

- Accepts a notes file and desired flashcard count.
- Loads a detailed system prompt.
- Wraps source notes with clear delimiters.
- Generates scenario-based flashcards.
- Requires each card to include a source-grounded reference.
- Extracts structured JSON output.
- Tracks estimated model usage cost.
- Handles empty or minimal note files.

### Flashcard Fields

Each generated flashcard can include:

- scenario
- question
- response
- direct reference
- why it matters
- common mistake

### Engineering Choices

The tool is built around prompt guardrails such as:

- do not hallucinate facts
- use only the supplied notes
- return valid JSON
- avoid repeated concepts
- prefer understanding over memorization
- include realistic learner misconceptions

### Recruiter-Relevant Value

This tool shows the ability to transform unstructured educational content into validated, useful structured data. It also demonstrates awareness of cost and model-output reliability.

## GitHub PR Explainer

### Summary

The GitHub PR Explainer helps developers understand pull requests quickly. It combines code changes with PR discussion context and produces a structured explanation from a senior engineering perspective.

### What It Does

- Accepts a full GitHub PR URL or shorthand format like `owner/repo#123`.
- Validates that the input points to a GitHub pull request.
- Fetches the pull request patch.
- Fetches general PR conversation comments.
- Truncates very large diffs to stay within model context limits.
- Sends the diff and comments to an LLM.
- Produces a structured Markdown explanation.

### Report Output

The report can include:

- summary of the PR goal
- explanation of the discussion
- technical assessment
- potential bugs or assumptions
- Socratic questions to test understanding

### Technical Design

Important implementation pieces:

- Uses `.patch` output because it includes useful commit metadata.
- Uses GitHub REST API endpoints for PR discussion context.
- Wraps diffs and comments with clear delimiters.
- Handles invalid URLs, missing PRs, network errors, API rate limits, and missing API keys.
- Uses model fallback behavior for rate-limit scenarios.

### Recruiter-Relevant Value

This tool demonstrates API integration, prompt packaging, context management, and technical summarization for software collaboration workflows.

## Flashcard Generator API

### Summary

The Flashcard Generator API exposes AI flashcard generation through a typed HTTP endpoint. It turns the flashcard workflow into a reusable service that other applications can call.

### What It Does

- Runs a local HTTP server.
- Provides `POST /api/generate`.
- Accepts JSON containing notes and an optional card count.
- Validates incoming requests with Zod.
- Calls the AI flashcard generator.
- Returns flashcards as JSON.
- Uses logging, timing, and CORS middleware.

### Technical Design

Important implementation pieces:

- Hono is used as the API framework.
- `@hono/zod-validator` validates request bodies.
- Zod schemas define the shape of flashcards and full responses.
- TypeScript types are inferred from schemas.
- Middleware adds request logging and server timing.
- CORS support allows frontend applications to call the API.

### Recruiter-Relevant Value

This tool shows how to turn an AI capability into a service-oriented feature with validation, typed contracts, and a clean API boundary.

## Semantic Product Search

### Summary

Semantic Product Search is an embedding-powered product search engine. Instead of matching only exact keywords, it matches products based on the meaning of the user's query.

### What It Does

- Fetches product data from a product API.
- Serializes product title, category, description, tags, and brand into searchable text.
- Generates embeddings for product records.
- Saves product data and vector data locally.
- Accepts natural-language search queries.
- Embeds the query.
- Scores products by vector similarity.
- Returns the most relevant matches.

### Technical Design

Important implementation pieces:

- `serializeProduct()` converts product data into embedding-friendly text.
- `embedTexts()` creates embeddings through OpenRouter/OpenAI-compatible APIs.
- `dotProduct()` computes similarity scores.
- `loadDatabase()` aligns product records with saved embedding rows.
- `searchProducts()` embeds the query, ranks results, applies a minimum similarity threshold, and returns top matches.

### Engineering Choices

- Product records are stored as JSON.
- Embeddings are stored as TSV for easy inspection and reuse.
- Metadata is saved separately for embedding visualization.
- Weak matches are filtered with a tuned minimum similarity threshold.
- The CLI gives a friendly fallback when no good match is found.

### Recruiter-Relevant Value

This tool demonstrates foundational retrieval and vector-search skills used in modern AI systems, including retrieval-augmented generation applications.

## vis-fix Vision Debugger

### Summary

vis-fix is a multimodal debugging assistant. It analyzes screenshots of developer errors using a vision-capable model and can perform web search when current information is needed.

### What It Does

- Accepts a screenshot path.
- Accepts an optional debugging prompt.
- Optimizes the screenshot before sending it to the model.
- Resizes images to keep payloads efficient.
- Converts screenshots to JPEG.
- Sends the image to a vision-capable model.
- Provides a Tavily-backed `web_search` tool.
- Logs optimization stats and search activity to stderr.
- Returns practical debugging guidance.

### Technical Design

Important implementation pieces:

- `parseArgs()` handles CLI inputs.
- `processImage()` resizes and converts the screenshot.
- Sharp handles image optimization.
- Zod defines the web search tool schema.
- Tavily search results are trimmed before being returned to the model.
- The model can be configured through environment variables.

### Recruiter-Relevant Value

This tool demonstrates multimodal AI engineering. It handles real image input, prepares it efficiently, gives the model access to search, and returns actionable technical advice.

## Source Credibility Analyzer

### Summary

The Source Credibility Analyzer is an AI research agent that evaluates how trustworthy a source URL is. It reads the target page, researches the source across the web, checks authorship and reputation, looks for corroborating evidence, and generates a structured credibility report.

### What It Does

- Accepts a source URL from the command line.
- Reads the page content through Jina Reader.
- Searches the web with Tavily for related credibility evidence.
- Investigates authorship, publication reputation, editorial process, evidence quality, conflicts of interest, and recency.
- Compares important claims against other sources when possible.
- Uses a structured credibility rubric before writing the final report.
- Saves a Markdown credibility report.
- Saves a local trace of the agent's steps for debugging and review.

### Technical Design

Important implementation pieces:

- A custom OpenRouter model provider adapts the OpenAI Agents SDK workflow.
- `read_url` retrieves readable source content.
- `web_search` searches for author, publication, reputation, corroboration, and fact-check context.
- `evaluate_credibility` records a structured rubric evaluation.
- `write_file` saves the final report.
- The file-writing tool is guarded so the agent must complete the credibility evaluation first.
- The tool saves both a human-readable report and a structured trace.

### Credibility Rubric

The analyzer can evaluate:

- source type
- author identity and qualifications
- publication or organization reputation
- editorial process
- evidence and citation quality
- corroboration from other sources
- conflicts of interest
- freshness and recency
- claim reliability
- overall credibility level
- practical recommendation for whether to trust or use the source

### Output

Each run produces:

- a final Markdown report
- a structured trace JSON file
- a short terminal completion summary
- a credibility verdict such as high, medium, low, or very low

### Recruiter-Relevant Value

This tool demonstrates agentic AI design, tool calling, web research automation, source evaluation, structured reasoning, and report generation. It is especially relevant for roles involving AI research tools, trust and safety workflows, content analysis, or research automation.

### Interview Talking Point

"The Source Credibility Analyzer is built as a tool-using agent. It cannot simply jump to a final answer; it has to read the source, search for supporting context, complete a structured credibility evaluation, and only then write the final report."

## Data URI Media Utils

### Summary

Data URI Media Utils is a TypeScript utility library for encoding media files and raw bytes as Base64 Data URIs, then parsing or decoding those URIs back into bytes or files.

It is useful for multimodal LLM workflows where images, audio, or video need to be passed around in a strict Data URI format.

### What It Does

- Encodes supported media files into Data URIs.
- Encodes raw buffers into Data URIs.
- Parses Data URI strings.
- Decodes Data URIs into buffers.
- Writes decoded media back to files.
- Validates media types with Zod.
- Includes tests for edge cases and round trips.

### Supported Media

Images:

- `image/png`
- `image/jpeg`
- `image/gif`
- `image/webp`
- `image/svg+xml`

Audio:

- `audio/mpeg`
- `audio/wav`
- `audio/ogg`

Video:

- `video/mp4`
- `video/webm`

### Public API

- `encodeFile(filePath)`
- `encodeBuffer(data, mimeType)`
- `parseDataURI(uri)`
- `decodeToBuffer(uri)`
- `decodeToFile(uri, outputPath)`
- `getCategory(mimeType)`

### Reliability Features

- Explicit errors for missing files.
- Explicit errors for unsupported extensions.
- Explicit errors for unsupported MIME types.
- Empty data rejection.
- Invalid Base64 detection.
- Whitespace normalization in Base64 payloads.
- Tests for binary media, SVG content, and round trips.

### Recruiter-Relevant Value

This tool demonstrates reusable library design, binary-data handling, schema validation, and test coverage around a real AI integration problem.

## AI Code Review CLI

### Summary

The AI Code Review CLI reviews code using multiple AI reviewer personas. Two specialist reviewers analyze the code in parallel, then a Lead Developer model synthesizes the findings into a final Markdown review.

### What It Does

- Reviews staged Git changes.
- Reviews a specific file through a file argument.
- Supports verbose diagnostic mode.
- Runs a Security Auditor reviewer.
- Runs a Maintainability Critic reviewer.
- Gives reviewers tools to inspect the codebase.
- Requires reviewers to return structured JSON findings.
- Sends findings to a Lead Developer model for synthesis.
- Outputs a final human-readable Markdown review.
- Tracks estimated cost.

### Review Architecture

```text
Input code or staged diff
  -> Security-focused reviewer
  -> Maintainability-focused reviewer
  -> Structured JSON findings
  -> Lead Developer synthesis
  -> Final Markdown report
```

### Available Reviewer Tools

The reviewers can request:

- `read_file` for source context
- `grep_codebase` for searching patterns and references
- `get_file_history` for recent Git history

### Technical Design

Important implementation pieces:

- `read_file(file_path, start_line, end_line)` reads file context.
- `grep_codebase(search_pattern)` searches the project.
- `get_file_history(file_path)` wraps Git history and safely handles new or untracked files.
- Tool schemas describe callable functions to the model.
- Reviewer prompts define distinct priorities and behavior.
- A final synthesis prompt deduplicates, filters, and clarifies reviewer findings.

### Test Data

The tool includes intentionally flawed JavaScript files containing examples such as:

- hardcoded credentials
- SQL injection risk
- no input validation
- unused variables
- global variable pollution
- callback nesting
- swallowed errors
- sensitive logging
- deeply nested conditionals
- weak naming

### Recruiter-Relevant Value

This tool demonstrates AI-assisted software engineering, code review automation, tool calling, structured intermediate outputs, parallel model calls, and final report synthesis.

## AI Job Search Assistant

### Summary

The AI Job Search Assistant is an end-to-end career intelligence system. It ingests job postings and a resume, extracts structured data, researches companies, analyzes market trends, identifies resume gaps, generates application advice, creates cover-letter drafts, and evaluates pipeline quality.

### What It Does

The assistant has four major workflows:

1. Job Market Analysis
2. Resume Gap Analysis
3. Targeted Application Advisor
4. Evaluation

### Job Market Analysis

This workflow:

- processes multiple job postings
- supports PDF, TXT, Markdown, and HTML files
- extracts structured job data
- researches companies with Tavily
- caches processed postings
- generates market analysis JSON
- writes Markdown and HTML reports

### Resume Gap Analysis

This workflow:

- extracts structured resume data
- loads saved market analysis
- compares the resume against market demand
- identifies strengths and gaps
- triages improvement actions
- writes Markdown and HTML reports

### Targeted Application Advisor

This workflow:

- processes a target job posting
- researches the target company
- loads saved resume, market, and gap artifacts
- generates a fit assessment
- suggests resume adaptations
- creates cover letter guidance
- prepares interview talking points
- writes targeted reports
- generates two tailored cover-letter variants

### Evaluation

The evaluation workflow:

- checks extraction consistency
- compares saved posting baselines
- reviews fit-score behavior
- supports manual configuration
- supports automatic evaluation
- writes Markdown and HTML evaluation reports

### Technical Design

Major modules:

- CLI entry points for market analysis, gap analysis, advice, and evaluation
- job extraction module
- resume extraction module
- market analysis module
- gap analysis module
- application advisor module
- evaluation module
- shared schemas
- shared prompts
- shared LLM runtime
- shared company research tools
- shared reporting utilities
- shared deterministic analysis functions
- shared file and document IO
- shared cost tracker

### Data Model and Validation

Zod schemas validate:

- job postings
- company research
- market analysis
- resume data
- gap analysis
- application reports
- cover letter variants
- processing manifests
- processing failures
- evaluation configuration

### Reliability and Safety

The assistant handles:

- malformed or empty PDFs
- unsupported file types
- schema mismatch from model output
- transient model failures
- company research failures
- missing environment variables
- secret handling through `.env`
- tool-loop limits
- estimated cost budgets
- verbose diagnostics

### Reporting

The assistant writes both Markdown and self-contained HTML reports for:

- market analysis
- gap analysis
- targeted application advice
- evaluation results

The HTML reports include visual presentation elements such as fit breakdowns and market skill alignment summaries.

### Example Generated Results

The saved outputs show a run across 10 job postings.

Market analysis examples:

- 10 total postings analyzed.
- Common required skills included Communication, Java, Problem Solving, React, AI tools, C++, JavaScript, Python, and Software Engineering.
- The analysis identified remote/hybrid flexibility and AI/automation emphasis as important market patterns.

Gap analysis examples:

- Strengths included diverse technical skills, project experience, and soft skills.
- Improvement areas included professional experience, AI/automation emphasis, resume headline/summary, and keyword alignment.
- Recommendations focused on clearer resume positioning and stronger market-aligned keywords.

Evaluation examples:

- 10 postings checked.
- Average scalar field extraction accuracy: 95%.
- Average required skill recall: 96%.
- Average preferred skill recall: 80%.
- Average fit score across postings: 59.7%.

### Recruiter-Relevant Value

This assistant is the most complete product-style system in the suite. It combines LLM extraction, deterministic analytics, web research, persistent artifacts, reporting, cover-letter generation, evaluation, and operational safeguards.

### Interview Talking Point

"The Job Search Assistant is built like a real pipeline. It extracts structured data, validates it, saves artifacts, reuses previous analysis, researches companies, generates reports, and evaluates its own extraction consistency."

## Skills Matrix

| Skill Area | Evidence in the Suite |
| --- | --- |
| CLI development | Git Scribe, Flashcard Generator CLI, GitHub PR Explainer, Semantic Product Search, vis-fix, Source Credibility Analyzer, AI Code Review CLI, Job Search Assistant |
| API development | Flashcard Generator API |
| TypeScript | Flashcard Generator API, Semantic Product Search, vis-fix, Source Credibility Analyzer, Data URI Media Utils, Job Search Assistant |
| JavaScript | Git Scribe, Flashcard Generator CLI, GitHub PR Explainer, AI Code Review CLI |
| Structured outputs | Flashcard tools, Source Credibility Analyzer, AI Code Review CLI, Job Search Assistant |
| Runtime validation | Zod schemas across API, agent, media, and job-search tools |
| Tool calling | vis-fix, Source Credibility Analyzer, AI Code Review CLI, Job Search Assistant |
| Agents | Source Credibility Analyzer |
| Embeddings | Semantic Product Search |
| Multimodal AI | vis-fix and Data URI Media Utils |
| Git automation | Git Scribe and AI Code Review CLI |
| GitHub integration | GitHub PR Explainer |
| Web search | vis-fix, Source Credibility Analyzer, Job Search Assistant |
| PDF/document processing | Job Search Assistant |
| Report generation | GitHub PR Explainer, Source Credibility Analyzer, AI Code Review CLI, Job Search Assistant |
| HTML reporting | Job Search Assistant |
| Testing | Data URI Media Utils and Job Search Assistant evaluation |
| Cost awareness | Flashcard Generator CLI, AI Code Review CLI, Job Search Assistant |
| Observability | API logging, verbose CLIs, traces, diagnostics, evaluation reports |

## Strongest Recruiter-Facing Tools

1. AI Job Search Assistant
2. AI Code Review CLI
3. Source Credibility Analyzer
4. vis-fix Vision Debugger
5. Data URI Media Utils
6. Semantic Product Search

## Why These Tools Stand Out

The AI Job Search Assistant stands out because it is a full pipeline with extraction, research, analysis, reporting, cover-letter generation, and evaluation.

The AI Code Review CLI stands out because it uses multiple reviewer agents, tool access, structured findings, and final synthesis.

The Source Credibility Analyzer stands out because it shows agentic research, enforced evaluation steps, and traceable report generation.

vis-fix stands out because it combines image input, model reasoning, and web search.

Data URI Media Utils stands out because it is reusable, tested, and directly useful in multimodal AI development.

Semantic Product Search stands out because it demonstrates embeddings and vector similarity, which are core building blocks for AI retrieval systems.

## Suggested Recruiter Questions and Answers

### What kind of AI development experience does this suite show?

It shows practical AI application development across developer tools, research tools, learning tools, media utilities, search tools, and career intelligence workflows. It demonstrates how to build reliable software around LLMs using validation, tools, retrieval, reports, and evaluation.

### What is the most complete system in the suite?

The AI Job Search Assistant is the most complete system. It has document ingestion, structured extraction, company research, market analysis, resume gap analysis, targeted application advice, cover-letter generation, Markdown and HTML reporting, cost tracking, and evaluation.

### Which tool best demonstrates agent design?

The Source Credibility Analyzer best demonstrates agent design. It uses a tool-using agent that reads a URL, searches the web, evaluates credibility with a structured rubric, and only then writes a final report.

### Which tool best demonstrates developer automation?

The AI Code Review CLI and Git Scribe best demonstrate developer automation. The Code Review CLI reviews code with specialist AI reviewers, while Git Scribe generates commit messages from staged Git changes.

### Which tool best demonstrates multimodal AI?

vis-fix best demonstrates multimodal AI because it processes screenshots and sends them to a vision-capable model. Data URI Media Utils supports multimodal AI workflows by reliably encoding and decoding image, audio, and video media payloads.

### How does the suite reduce hallucination risk?

The suite uses structured prompts, source delimiters, Zod schemas, direct source references, tool-based context gathering, deterministic analysis steps, and final synthesis. Many tools validate model outputs before saving or using them.

### How does the suite handle operational concerns?

The tools include cost tracking, configurable models, environment-based secrets, verbose logging, traces, retry behavior, graceful degradation, schema validation, and user-facing errors.

### What evidence is there of testing or evaluation?

Data URI Media Utils includes tests for encoding, decoding, media round trips, and edge cases. The AI Job Search Assistant includes automatic evaluation with extraction consistency and fit-scoring checks. The AI Code Review CLI includes intentionally flawed files for review testing.

## Resume Bullet Options

- Built an AI Tool Suite with developer automation, source credibility research, multimodal debugging, semantic search, structured-output APIs, code review automation, and job-search intelligence.
- Developed an end-to-end AI Job Search Assistant in TypeScript that extracts job and resume data, researches companies, generates market and gap analysis, writes reports, creates cover-letter drafts, and evaluates extraction consistency.
- Created an AI Code Review CLI with parallel specialist reviewers, codebase tools, structured JSON findings, and Lead Developer synthesis into actionable Markdown.
- Built a Source Credibility Analyzer agent that reads URLs, performs web research, applies a structured credibility rubric, saves reports, and records agent traces.
- Implemented a multimodal screenshot debugging CLI using image optimization, a vision-capable model, Tavily web search, and developer-focused fix recommendations.
- Developed a tested TypeScript media utility library for encoding and decoding image, audio, and video files as Base64 Data URIs for multimodal LLM workflows.
- Implemented semantic product search using embeddings, vector similarity scoring, local vector storage, and an interactive CLI.

## Recommended Chatbot Retrieval Tags

- `AI Tool Suite`
- `Krutin Polra`
- `OpenRouter`
- `OpenAI SDK`
- `TypeScript`
- `JavaScript`
- `Zod`
- `Hono`
- `Tavily`
- `Jina Reader`
- `AI agents`
- `tool calling`
- `structured outputs`
- `semantic search`
- `embeddings`
- `multimodal AI`
- `vision model`
- `Data URI`
- `AI code review`
- `source credibility analyzer`
- `job search assistant`
- `resume gap analysis`
- `market analysis`
- `cover letter generator`
- `GitHub PR explainer`
- `Git commit generator`

## Accuracy Notes

- This document describes the suite as a collection of standalone tools.
- It intentionally presents each item as a standalone tool in the suite.
- The strongest recruiter-facing tools are the AI Job Search Assistant, AI Code Review CLI, Source Credibility Analyzer, vis-fix Vision Debugger, Data URI Media Utils, and Semantic Product Search.
- This knowledge base summarizes local repository contents as of May 4, 2026.
