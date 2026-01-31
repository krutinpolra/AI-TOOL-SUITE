# Lab 03: GitHub PR Explainer

A CLI tool that analyzes GitHub Pull Requests using AI to help you understand both the code changes and the conversation context.

**Developed by:** KRUTIN BHARATBHAI POLRA - 135416220

## Features

- ✅ Student identity header
- ✅ API key validation (uses root .env file)
- ✅ URL parsing and validation (both full URLs and shorthand format)
- ✅ Fetch PR diff/patch from GitHub
- ✅ Fetch PR comments and conversation from GitHub API
- ✅ Automatic truncation for large diffs (>100k characters)
- ✅ LLM-powered analysis using OpenRouter
- ✅ Principal Engineer perspective with structured output
- ✅ Chain of thought reasoning in prompts
- ✅ Proper delimiters (code fences for diffs, XML for comments)
- ✅ Comprehensive error handling (rate limits, 404s, network errors)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Ensure the root `.env` file (in `AIP444/`) contains your OpenRouter API key:
```bash
OPENROUTER_API_KEY=your_actual_api_key_here
```

The tool automatically loads the API key from the root `.env` file, so no local configuration is needed.

## Usage

```bash
node pr-explain.js <github-pr-url>
```

### Supported URL Formats

**Full URL:**
```bash
node pr-explain.js https://github.com/microsoft/vscode/pull/206668
```

**Shorthand format:**
```bash
node pr-explain.js microsoft/vscode#206668
```

### Examples

```bash
# Analyze VS Code PR
node pr-explain.js microsoft/vscode#206668

# Analyze React PR
node pr-explain.js facebook/react#28612
```

## How It Works

1. **URL Parsing** - Validates and extracts owner, repo, and PR number
2. **Diff Fetching** - Downloads the PR patch (includes metadata like author, date, commits)
3. **Smart Truncation** - Automatically truncates large diffs to stay within model context limits (100k chars)
4. **Comment Fetching** - Retrieves conversation history from GitHub API (no authentication required)
5. **Prompt Engineering** - Constructs structured prompts with proper delimiters and chain of thought reasoning
6. **LLM Analysis** - Sends to OpenRouter AI for Principal Engineer-level analysis
7. **Formatted Output** - Displays structured Markdown report with Summary, Discussion, Assessment, and Socratic Questions

## Error Handling

The tool validates and handles:
- ✅ GitHub origin (rejects non-GitHub URLs)
- ✅ PR URL format (rejects issues, commits, etc.)
- ✅ API key presence
- ✅ PR existence (404 errors)
- ✅ Network errors
- ✅ GitHub API rate limits (60 requests/hour without token)
- ✅ Automatic diff truncation with warnings

### Example Output

```bash
GitHub PR Explainer - Developed by KRUTIN BHARATBHAI POLRA - 135416220
----------------------------------------------------------------------

✅ API Key validated

📊 Analyzing Pull Request...
   Owner: microsoft
   Repository: vscode
   PR Number: #206668

📥 Fetching PR changes...
🔍 Fetching: https://github.com/microsoft/vscode/pull/206668.patch
✅ Fetched 257907 characters
⚠️  Warning: Diff is 257907 characters, truncating to 100000
⚠️  Note: Original diff was 257907 characters, truncated to fit model context

💬 Fetching PR conversation...
🔍 Fetching: https://api.github.com/repos/microsoft/vscode/issues/206668/comments

🧠 Generating Principal Engineer analysis...
🤖 Sending to AI for analysis...
✅ Analysis complete

════════════════════════════════════════════════════════════════════════════════
📋 PRINCIPAL ENGINEER ANALYSIS
════════════════════════════════════════════════════════════════════════════════

### Summary
[AI-generated summary of the PR's goal]

### The Discussion
[AI-generated summary of the conversation]

### Assessment
[AI-identified bugs, edge cases, and hidden assumptions]

### Socratic Questions
[3 AI-generated questions to test understanding]

════════════════════════════════════════════════════════════════════════════════
```

## Project Structure

```
Lab-03/
├── pr-explain.js      # Main application file
├── package.json       # Dependencies configuration
├── .env.example       # Example environment file (reference only)
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## Dependencies

- `dotenv` - Environment variable management

## Implementation Details

### Step 1: URL Parsing ✅
- Parses GitHub PR URLs
- Extracts owner, repo, and PR number
- Supports both full URLs and shorthand format
- Validates GitHub origin and PR path format

### Step 2: Fetching the DIFF ✅
- Uses `.patch` format (includes metadata: author, date, commit messages)
- Fetches from GitHub without authentication
- Automatically truncates diffs exceeding 100,000 characters
- Adds `...[Diff Truncated]...` marker when truncated
- Provides clear feedback about fetch progress and size

### Why .patch over .diff?
The `.patch` format includes valuable context that helps the LLM provide better analysis:
- Author information
- Commit timestamps
- Commit messages
- Email headers

This metadata helps the AI understand the "why" behind changes, not just the "what".

### Step 3: Fetching Comments ✅
- Uses GitHub REST API v3 (issues comments endpoint)
- No authentication required (60 requests/hour limit)
- Required headers: User-Agent, Accept, X-GitHub-Api-Version
- Extracts essential fields: username, comment body, date
- Handles rate limiting (403) and missing PRs (404)
- Clear feedback about number of comments found

**Note:** This fetches general conversation comments (issue comments), not line-specific code review comments. Review comments would require a different endpoint (`pulls/{number}/comments`).

### Step 4: Prompt Engineering ✅
- **Role Definition**: Principal Engineer persona advising junior developer
- **Delimiters**: 
  - Diff wrapped in fenced code blocks with `diff` language
  - Comments wrapped in XML tags (`<comments>`, `<comment>`)
- **Chain of Thought**: Four-step reasoning process:
  1. Technical Analysis (analyze diff)
  2. Context Understanding (analyze comments)
  3. Critical Assessment (identify issues)
  4. Synthesis (generate report)
- **Output Format**: Structured Markdown with 4 sections:
  - Summary
  - The Discussion
  - Assessment
  - Socratic Questions

### OpenRouter Integration
- Primary: `google/gemini-2.5-flash-lite` (cheap, fast model)
- Fallback: `google/gemini-pro` (alternative if rate limited)
- **Automatic fallback**: Detects rate limits and switches to fallback model
- Proper headers for API authentication and attribution
- Comprehensive error handling for API failures
- **Lab 2-style system prompt**: Structured with critical rules, chain of thought, and exact format specifications
