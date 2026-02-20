# Assignment 1: AI Code Review

## Overview

> **Linus's Law:** "With enough eyeballs, all bugs are shallow"

No matter how much experience a developer has, it's hard to spot your own mistakes. Professionals know that overcoming this means relying on code review to spot issues and help find difficult bugs. Increasingly, AI is being used to help review code, since LLMs are now so good at reading and analyzing source code.

In this assignment, you will build a set of code review assistants that will help a developer improve their code, and combine them into a CLI `review` tool. When a user runs your tool on their **staged git changes** or a **specific file**, two specialized AI "Reviewers" will analyze the code using tools to investigate the codebase. Finally, a third AI "Lead Dev" will synthesize their findings into a single, actionable report.

This assignment will help you to explore everything we've learned so far, including:

- Working with LLM providers and SDKs
- Choosing the right model for the job
- Prompt engineering and steering models through instructions
- Working with code as text
- Generating structured and unstructured outputs
- Tool calling

## Technical

You MUST create a CLI tool using any programming language you wish, though TS or Python are **recommended** (i.e., use types).

The code MUST be developed in your course git repo under `assignments/assignment-1/*`.

You MAY use any SDK, library, or dependency you want to complete the requirements.

You MAY use AI to help you with the assignment, though **you are responsible for all of the code you submit** and must understand everything. Don't use or ship code that you don't understand. Practice the code reading lessons from [week 4](../../weeks/week-04/README.md). Keep track of your AI usage so you can report on it in your final submission.

You may NOT use code from other students. This is not a group project. You are encouraged to talk with one another about how you are solving various problems, test one another's tools, but each student is responsible for their own solution.

You MUST use OpenRouter for your LLM provider, and use your API Key securely. **Make sure that you reduce your API costs as much as possible without sacrificing value** (i.e, you can use non-free models, but pay attention to input/output costs and experiment to see which models give the best "value," preferring the cheapest and fastest). Keep track of your experiments with models, cost details, etc. so you can report on it in your final submission.

## Design

1. **Input:** User runs your `review` CLI tool in either "Git Mode," which checks `git diff --staged` for changes to review, or "File Mode," which expects a `--file filename` flag to review a specific file. Exit with a message if there is nothing to review. Additionally, your tool must accept a `--verbose` flag to enable "Verbose Mode." When run in "Verbose Mode," your tool must print detailed "logs" of everything to `stderr` (use `stdout` for final output only) that the AI is doing (e.g., "Reviewer 1 calling tool grep...", "Reviewer 2 found 3 issues...json response", etc.) to the console.
2. **Phase 1 (Parallel Reviews):** Two LLM models run in **parallel** with distinct **System Prompts** and access to specific **tools** to review the changes.
3. **Phase 2 (Synthesis):** A third "judge" model receives the **structured outputs** from Phase 1 and generates the final report.
4. **Output:** A final Markdown summary report is printed to `stdout`.

## "Two Heads are Better than One" - The Review Assistants

In the real world, every code reviewer has their own personal bias and area of expertise. Your `review` tool will be the same, and include multiple review assistants, each with its own persona and area of focus. In addition, your review assistants will have access to a number of **tools** that can be called to get further information (see `The Tools (Function Calling)` section below).

Read through the following review assistant descriptions and **choose 2 to implement**. Your goal will be to figure out the right prompt engineering to bring these assistants to life. **You will be graded on the quality and effectiveness of your prompts**.

### 1. "The Security Auditor"

- **Persona:** Paranoid, strict, and unyielding. Treats every line of code as a potential vector for attack.
- **Role:** Scans for vulnerabilities (SQL injection, XSS), hardcoded secrets (API keys, passwords), dangerous logic errors, and missing permission checks.
- **Key Tools:** Uses `grep_codebase` to search for known insecure patterns and `read_file` to check configuration.
- **Temperature:** Low for maximum precision and consistency.

### 2. "The Maintainability Critic"

- **Persona:** Obsessed with "Clean Code," naming conventions, and the DRY (Don't Repeat Yourself) principle. Hates messy formatting.
- **Role:** Focuses on readability, variable naming, function length, missing comments, and opportunities for refactoring.
- **Key Tools:** Uses `read_file` to analyze code structure and style.
- **Temperature:** Low-Medium to allow for some creative refactoring suggestions while staying grounded.

### 3. "The Performance Optimizer"

- **Persona:** Impatient and efficiency-obsessed. Speaks in terms of Big-O notation and hates wasted CPU cycles or memory leaks.
- **Role:** Identifies nested loops (O(n^2)), unnecessary database queries (N+1 problems), heavy library imports, and large data structures loaded into memory.
- **Key Tools:** Uses `grep_codebase` to investigate things like whether a function is called inside loops elsewhere and `read_file` to check imports.
- **Temperature:** Low-Medium to balance theoretical speed with practical advice.

### 4. "The QA Engineer"

- **Persona:** A professional skeptic who distrusts the "happy path." Always asks, _"What if this input is null?"_ or _"What if the network fails?"_
- **Role:** Checks for missing error handling (`try/catch`), lack of input validation, and verifies that new code has corresponding tests (e.g., _"You added `calc_total` but I don't see `test_calc_total`"_).
- **Key Tools:** Uses `grep_codebase` to search for existing tests and `get_file_history` to check for regressions.
- **Temperature:** Medium to encourage thinking about edge cases.

### 5. "The Senior Architect"

- **Persona:** A big-picture thinker. Doesn't care about variable names or minor details, only about the overall system design, coupling, and future-proofing.
- **Role:** Analyzes system coupling (_"Why is the UI talking directly to the DB?"_), modularity (_"This function does 4 different things"_), and technical debt.
- **Key Tools:** Heavily uses `read_file` to look at imports/exports to understand dependencies and `grep_codebase` to see usage patterns.
- **Temperature:** Medium to encourage abstract reasoning and "Chain of Thought."

### 6. "The Product Manager"

- **Persona:** Creative, user-centric, and enthusiastic. The "Idea Person" who cares about the user experience and "delighting users," not the implementation details.
- **Role:** Looks for gaps in features, confusing user messages/errors, accessibility issues, and suggests creative ways to make the feature better for the end-user.
- **Key Tools:** Uses `read_file` to examine UI text, HTML/templates, or error messages.
- **Temperature:** High to encourage creativity, brainstorming, and "out of the box" suggestions.

## The Tools (Function Calling)

Your review assistants will need to make use of a number of tools in order to get more context for their review. You need to provide the models with schemas and prompts for the LLMs to call these functions, and implementations to make them work at runtime.

### 1. `read_file(file_path, [start_line], [end_line])`

- **Why:** The `git diff` command only shows the lines which have changed. To understand if a change is safe, the AI often needs to see the _rest_ of the file (e.g., to see imports or class definitions).

- **Implementation:** Reads the file from the disk, optionally returning some or all of the lines (i.e., `start_line` and `end_line` are optional). Implement this using only standard library functions for Node.js or Python, no third-party modules.

> [!NOTE]
> You'll need to think about how to handle really long files (e.g., `package-lock.json`), which can consume massive amounts of tokens. Consider adding limits, truncating the file contents, etc.

### 2. `grep_codebase(search_pattern)`

- **Why:** If the diff includes a function call to `calculate_tax(amount)`, the AI doesn't know what that function does. It needs to search the codebase to find the definition to ensure the call is correct, look at callers, find tests, etc.

- **Implementation:** Wraps `grep -r` (Linux/macOS) or `ripgrep` (cross-platform) or another recursive file search, returning the results (you may also use an existing NPM or PyPi module for this).

> [!NOTE]
> Again, pay attention to the total size of the returned results and decide how to deal with text that is longer than you want.

### 3. `get_file_history(file_path)`

- **Why:** This allows the AI to see _why_ code was written this way previously (e.g., to see recent commit messages and changes).

- **Implementation:** Wraps `git log -p -n 3 <file_path>` to get the recent changes to this file (you may use an existing NPM or PyPi module for this).

> [!IMPORTANT]
> Since you will be testing this on new, untracked files (like `bad_code.py`), your code must handle the case where `git log ...` returns an error (e.g., file not found in history). If `git log` fails or returns empty output, the function should not crash. Instead, it should return a string like: "No history available (file is new or untracked)." This allows the LLM to understand the situation and proceed with the review without the history context.

---

## Assignment Requirements

### 1. Git Mode vs. File Mode

Your tool needs to support two modes: Git Mode and File Mode.

1. **Git Mode:** The input to the LLM is a git diff string, showing the current staged changes. You should deal with the case that there are no staged changes and provide a useful error message.
2. **File Mode:** The input to the LLM is the content of the file passed via `--file filename`. If the file path cannot be found, or file can't be read, provide a useful error message.

> [!NOTE]
> You should write your System Prompts to handle both cases (e.g., "You will receive either a git diff or a source code file...").

### 2. Observability

To help you debug your system, and to help prove to your professor that your system is working as expected, you must implement a `--verbose` flag. When the user runs `review --verbose`, your tool must print detailed logs of the execution flow to `stderr`. Specifically, it must show:

1. **State Changes:** When a reviewer starts and finishes.
2. **Tool Calls:** Which tool is being called and with what arguments (e.g., `[Security] Calling grep_codebase("api_key")`).
3. **Tool Outputs:** What the tool returned (e.g., `[Tool] Found 2 matches...`).
4. **Raw Findings:** The JSON response (pretty-printed) returned by each reviewer _before_ it is sent to the Judge.

> [!TIP]
> Verbose mode will make your life much easier when debugging why an agent isn't behaving correctly!

### 3. The "Reviewer" Logic (Parallel Execution)

To speed up the workflow, your tool will make **two parallel requests** to the LLM provider, one for reviewer 1 and the other for reviewer 2 (e.g., using `Promise.all` in JS or `asyncio.gather` in Python, etc). Both requests will use the same **input** (e.g., the staged diff or file contents), but different system prompts, tool definitions, etc.

> [!NOTE]
> You'll have to consider how to handle rate-limiting. For example, you may need to add wait-and-retry logic (i.e., exponential backoff), or switch to sequential calls, and fail with a useful error message when you can't recover. You may also need to avoid free models for this to work properly.

Both reviewers must output **Structured JSON** containing: `file`, `line_number`, `severity` (info/warn/critical/etc), `category` (security/style/etc), and a `description`. For example:

```json
{
  "file": "src/components/SettingsModal.tsx",
  "line_number": 10,
  "severity": "info",
  "category": "ui",
  "description": "The `SettingsModalProps` currently includes a `shouldClose` prop, but the `SettingsModal` never actually uses it. It should be removed, and all callers updated to not include it."
}
```

```json
{
  "file": "api/server.py",
  "line_number": 181,
  "severity": "critical",
  "category": "security",
  "description": "An API Key has been hard-coded into the `api_key` variable. Move `sk-1234.....` to an environment variable."
}
```

Use **few-shot prompting** to teach the model about the response format you want.

### 4. Adding Context with Tools

As the assistants are doing their review, often more context will be required, and a model will request that a tool be called. For example, if the LLM requests that `grep_codebase` be called, your code must execute the requested function, capture the output, feed it back to the LLM, and await the final answer.

> [!NOTE]
> Models can hallucinate tools to call, so it's a good idea to clearly describe all of your tools, their purpose, and when to call them, in your system prompt. You should also mention that only these tools are available.

### 5. The "Lead Developer" (Synthesize)

Since your system runs multiple reviews, we need a way to **synthesize** the results. For example, what if both reviewers flag the same problem? What if one of the reviewers hallucinates or gives bad advice? To solve this, we'll introduce a **third** assistant to assess the reviews: the "Lead Developer" (aka "The Judge"):

- **Persona:** Extremely experienced, pragmatic, empathetic but firm. Interested in moving the project forward.
- **Goal:** Read the JSON reports from review assistants 1 & 2 and create a final review.
- **Tools:** None (it only reads the text output of the others).

The job of the "Lead Developer" is to act as a final judge for the other two reviewers, performing tasks such as:

- **De-duplicate:** If both agents found the same issue, merge them.
- **Filter:** Remove hallucinations, low-quality suggestions, or nitpicks that are too minor.
- **Clarify:** If any of the reviews are hard to understand, improve the clarity of the wording
- **Resolve Conflicts:** If the reviewers disagree about a point, the judge needs to resolve it and decide what to do
- **Format:** Produce the final Markdown report.

After your two reviewers complete their reviews, and you have the JSON arrays, combine them into a single prompt to send to the judge assistant for assessment and writing the final report.

The judge should create a **Markdown report** to present to the user, since this is meant for a human (i.e., JSON isn't appropriate).

#### 6. Evaluation (The "Golden Dataset")

To verify your tool works, we'll test using Verbose Mode and File Mode, `--verbose --file ...` on a known file. This allows you to run your tool against a specific test file on disk without needing to stage it in git and also see detailed info about what is happening.

**1. Create the Test File**
Create a file named `bad_code.py` or `bad_code.ts` in your assignment folder. **Do not run `git add` on this file.**. For example:

```python
import sys
from typing import List

def calculate_total(prices: List[float]) -> int:
    x = 0.0
    for p in prices:
        x += p
    return x

def main():
    api_key = "sk-12345-abcde-secret-key"

    print(f"Value of pi is: {math.pi}")

    total = calculate_total([10.50, 20.00, 5.25])
    print(f"Total: {total}")

if __name__ == "__main__":
    main()
```

```typescript
import { join } from 'path';

interface User {
  id: number;
  name: string;
}

function getUserID(user: User): number {
  const x = user.id;
  return x.toString();
}

function main() {
  const apiKey = 'sk-12345-abcde-secret-key';

  const currentUser: User = { id: 1, name: 'Alice' };

  fs.writeFileSync('log.txt', 'User logged in');

  console.log(getUserID(currentUser));
}

main();
```

> [!TIP]
> You can use an LLM to help you add more "bugs" to your test code, increasing its usefulness for testing.

**2. Run in File Mode**
Run your tool in Verbose Mode and File Mode pointing specifically at this file:

```bash
# Node
node review.js --verbose --file bad_code.ts

# Python
python review.py --verbose --file bad_code.py
```

**3. Success Criteria**
Your tool should detect issues like the following (depending on which agents you implemented, and what is present in your "bad code" sample files):

- **Security Auditor:** Must flag the hardcoded `api_key`.
- **Maintainability Critic:** Must flag the variable name `x` or the unused import (`sys`/`path`).
- **QA Engineer / Architect:** Must flag the missing import (`math`/`fs`) or the type mismatch.
- **Lead Developer:** Must output a clean Markdown report summarizing these issues.
- **Robustness:** If an agent tries to call `get_file_history` on this file, your tool must **not crash**.

**4. Run in Git Mode (Dogfooding)**
Finally, test the default mode (i.e., Git Mode). Stage a small change to your `README.md` or one of your source files, and run the tool without arguments:

```bash
git add README.md
node review.js
```

It should detect the change in the README and provide a review (or say "No issues found").

## Submission & Grading

Create a document (Word or PDF) and submit it to Blackboard.

### 1. GitHub URL

Paste the link to your `assignments/assignment-1/` code on GitHub. _Make sure your professor is a collaborator._

### 2. The Golden Dataset Proof

Screenshot or capture your terminal output running the tool in Verbose Mode against `bad_code.py` (or `.ts`) using the `--file` flag. The screenshot/capture must clearly show all the tool calls (e.g., the agent asking for `read_file` or `grep`) and the intermediate JSON output, proving that your agents are actually running and using tools.

- _Must show the command used, verbose logging, and final Markdown report._

### 3. The Dogfooding Proof

Screenshot your terminal running the tool against **staged git changes** (Git Mode). Try running with and without Verbose Mode.

- _Must show `git status` (proving files are staged) and the tool's output._

### 4. Reflection

- _What instructions did you give your reviewer assistants to ensure they didn't hallucinate and produce useful responses?_
- _How did you define the tools in the system prompt?_
- _What issues did you have with the tools and how the assistants used them?_
- _Which models did you try and why? Which model did you end-up using? How did you think about cost?_
- _Which AI tools did you use to help you write the code? What did you do with them? How helpful were they?_

### Grading Rubric (20%)

| Criteria                | Weight | Description                                                                                                                                |
| :---------------------- | :----- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture**        | 30%    | Tool successfully implements the "Parallel Reviewers -> Synthesis" architecture. Both reviewers run, and the Judge synthesizes the result. |
| **Tool Implementation** | 25%    | All tools (`read_file`, `grep`, `history`) are implemented correctly. `history` handles untracked files without crashing.                  |
| **Modes & Inputs**      | 15%    | Tool correctly handles Git Mode (`diff --staged`), File Mode (`--file`), and Verbose Mode (`--verbose`).                                   |
| **Prompt Engineering**  | 20%    | Personas are distinct and effective, using good prompt engineering. JSON output is reliable. The "Judge" produces clean Markdown.          |
| **Golden Dataset**      | 10%    | The tool successfully catches the expected errors in `bad_code` (Secrets, Variable Names, Imports/Types, etc).                             |