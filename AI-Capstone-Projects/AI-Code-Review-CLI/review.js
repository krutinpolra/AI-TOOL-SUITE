#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { OpenAI } from 'openai';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
// Load environment variables from .env file
// Try current directory first, then parent directories
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') }); // Try local .env
config({ path: resolve(__dirname, '../../.env') }); // Try root AIP444 folder
const execAsync = promisify(exec);
// ===== Configuration =====
let VERBOSE = false;
const costTracker = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    calls: [],
};
// Pricing per 1M tokens (as of Feb 2026)
const MODEL_PRICING = {
    'openai/gpt-4o-mini': { input: 0.15, output: 0.60 }, // per 1M tokens
    'openai/gpt-4o': { input: 2.50, output: 10.00 },
    'openai/gpt-4-turbo': { input: 10.00, output: 30.00 },
    // Add more models as needed
};
function calculateCost(model, inputTokens, outputTokens) {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['openai/gpt-4o-mini'];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
}
function trackCost(model, role, usage) {
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || 0;
    const cost = calculateCost(model, inputTokens, outputTokens);
    costTracker.totalInputTokens += inputTokens;
    costTracker.totalOutputTokens += outputTokens;
    costTracker.totalCost += cost;
    costTracker.calls.push({
        model,
        role,
        cost: {
            inputTokens,
            outputTokens,
            totalTokens,
            estimatedCost: cost,
        },
    });
    log(`[Cost] ${role}: ${inputTokens} input + ${outputTokens} output = ${totalTokens} tokens (~$${cost.toFixed(4)})`);
}
function printCostSummary() {
    console.error('\n' + '='.repeat(60));
    console.error('💰 COST SUMMARY');
    console.error('='.repeat(60));
    if (costTracker.calls.length === 0) {
        console.error('No API calls made.');
        return;
    }
    console.error('\nPer-Reviewer Costs:');
    for (const call of costTracker.calls) {
        console.error(`  ${call.role}:`);
        console.error(`    Tokens: ${call.cost.inputTokens.toLocaleString()} in + ${call.cost.outputTokens.toLocaleString()} out = ${call.cost.totalTokens.toLocaleString()} total`);
        console.error(`    Cost: ~$${call.cost.estimatedCost.toFixed(5)}`);
    }
    console.error('\nTotal Usage:');
    console.error(`  Input Tokens:  ${costTracker.totalInputTokens.toLocaleString()}`);
    console.error(`  Output Tokens: ${costTracker.totalOutputTokens.toLocaleString()}`);
    console.error(`  Total Tokens:  ${(costTracker.totalInputTokens + costTracker.totalOutputTokens).toLocaleString()}`);
    console.error(`\n  💵 TOTAL COST: ~$${costTracker.totalCost.toFixed(5)}`);
    console.error('='.repeat(60) + '\n');
}
const log = (...args) => {
    if (VERBOSE) {
        console.error(...args);
    }
};
// ===== Tool Implementations =====
/**
 * Reads a file from disk, optionally returning specific lines
 */
function read_file(file_path, start_line, end_line) {
    try {
        if (!existsSync(file_path)) {
            return `Error: File '${file_path}' not found.`;
        }
        const content = readFileSync(file_path, 'utf-8');
        const lines = content.split('\n');
        // Handle really long files by truncating
        const MAX_LINES = 500;
        if (lines.length > MAX_LINES && !start_line && !end_line) {
            return `File is very long (${lines.length} lines). Showing first ${MAX_LINES} lines.\n\n${lines.slice(0, MAX_LINES).join('\n')}\n\n... (${lines.length - MAX_LINES} more lines)`;
        }
        if (start_line !== undefined && end_line !== undefined) {
            // Convert to 0-indexed
            const start = Math.max(0, start_line - 1);
            const end = Math.min(lines.length, end_line);
            return lines.slice(start, end).join('\n');
        }
        else if (start_line !== undefined) {
            const start = Math.max(0, start_line - 1);
            return lines.slice(start).join('\n');
        }
        else if (end_line !== undefined) {
            const end = Math.min(lines.length, end_line);
            return lines.slice(0, end).join('\n');
        }
        return content;
    }
    catch (error) {
        return `Error reading file: ${error.message}`;
    }
}
/**
 * Searches the codebase recursively for a pattern
 */
async function grep_codebase(search_pattern) {
    try {
        // Use grep -r on Unix-like systems
        // -r: recursive, -n: line numbers, -I: ignore binary files
        // Limit results to avoid token overflow
        // On Windows, use Git Bash's grep
        const isWindows = process.platform === 'win32';
        const grepCmd = isWindows
            ? `grep -rn --exclude-dir=node_modules --exclude-dir=.git "${search_pattern}" . 2>nul | head -n 50`
            : `grep -rn -I --exclude-dir=node_modules --exclude-dir=.git "${search_pattern}" . 2>/dev/null | head -n 50`;
        const { stdout, stderr } = await execAsync(grepCmd);
        if (!stdout && stderr) {
            return `No matches found for pattern: ${search_pattern}`;
        }
        const lines = stdout.trim().split('\n');
        if (lines.length === 0 || lines[0] === '') {
            return `No matches found for pattern: ${search_pattern}`;
        }
        // Truncate if too many results
        if (lines.length >= 50) {
            return `${lines.join('\n')}\n\n... (Results limited to 50 matches)`;
        }
        return stdout.trim();
    }
    catch (error) {
        // grep returns exit code 1 when no matches found
        if (error.code === 1) {
            return `No matches found for pattern: ${search_pattern}`;
        }
        return `Error searching codebase: ${error.message}`;
    }
}
/**
 * Gets the git history for a specific file
 */
async function get_file_history(file_path) {
    try {
        const { stdout, stderr } = await execAsync(`git log -p -n 3 "${file_path}" 2>&1`);
        if (stderr && stderr.includes('does not have any commits')) {
            return 'No history available (file is new or untracked).';
        }
        if (!stdout || stdout.trim() === '') {
            return 'No history available (file is new or untracked).';
        }
        // Truncate if too long
        const MAX_CHARS = 5000;
        if (stdout.length > MAX_CHARS) {
            return `${stdout.substring(0, MAX_CHARS)}\n\n... (History truncated)`;
        }
        return stdout.trim();
    }
    catch (error) {
        // Handle case where file is not in git history
        if (error.message.includes('does not have any commits') ||
            error.message.includes('ambiguous argument') ||
            error.message.includes('unknown revision')) {
            return 'No history available (file is new or untracked).';
        }
        return `Error getting file history: ${error.message}`;
    }
}
// ===== Tool Schemas =====
const TOOL_SCHEMAS = [
    {
        type: 'function',
        function: {
            name: 'read_file',
            description: 'Reads the contents of a file from disk. Use this to see the full context of a file, understand imports, class definitions, or see code not shown in the diff. Can optionally return specific line ranges.',
            parameters: {
                type: 'object',
                properties: {
                    file_path: {
                        type: 'string',
                        description: 'The path to the file to read',
                    },
                    start_line: {
                        type: 'number',
                        description: 'Optional: The line number to start reading from (1-indexed)',
                    },
                    end_line: {
                        type: 'number',
                        description: 'Optional: The line number to stop reading at (1-indexed)',
                    },
                },
                required: ['file_path'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'grep_codebase',
            description: 'Searches the entire codebase recursively for a pattern. Use this to find function definitions, see where a function is called, find tests, or search for specific patterns like security issues.',
            parameters: {
                type: 'object',
                properties: {
                    search_pattern: {
                        type: 'string',
                        description: 'The text pattern to search for in the codebase',
                    },
                },
                required: ['search_pattern'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_file_history',
            description: 'Gets the recent git history for a file, showing the last 3 commits with their changes. Use this to understand why code was written a certain way or to check for regressions. Note: This may return "No history available" for new or untracked files.',
            parameters: {
                type: 'object',
                properties: {
                    file_path: {
                        type: 'string',
                        description: 'The path to the file to get history for',
                    },
                },
                required: ['file_path'],
            },
        },
    },
];
// ===== System Prompts =====
const SECURITY_AUDITOR_PROMPT = `You are "The Security Auditor" - a paranoid, strict, and unyielding security expert. You treat every line of code as a potential attack vector.

Your role is to scan for:
- Security vulnerabilities (SQL injection, XSS, command injection, path traversal)
- Hardcoded secrets (API keys, passwords, tokens, cryptographic keys)
- Dangerous logic errors that could lead to security issues
- Missing permission checks or authentication
- Insecure dependencies or imports
- Improper error handling that could leak sensitive information

You have access to these tools:
- read_file: To see full file context, imports, and configurations
- grep_codebase: To search for insecure patterns across the codebase
- get_file_history: To check if security issues were introduced recently

IMPORTANT INSTRUCTIONS:
1. You will receive EITHER a git diff showing changes OR a complete source file
2. Focus on the changed lines (marked with + in diffs) but use tools to get context
3. Be thorough but avoid false positives - only report real security concerns
4. Use grep_codebase to verify if sensitive patterns (like API keys) appear elsewhere
5. Use read_file to check imports and see if dangerous functions are being used properly
6. Always cite specific line numbers when reporting issues

OUTPUT FORMAT:
You MUST respond with a JSON array of issues. Each issue must have:
- file: the file path
- line_number: the specific line number (integer)
- severity: "info", "warn", or "critical"
- category: "security"
- description: a clear explanation of the security issue

Example:
[
  {
    "file": "api/server.js",
    "line_number": 42,
    "severity": "critical",
    "category": "security",
    "description": "Hardcoded API key 'sk-12345...' found. This should be in an environment variable instead."
  }
]

If no issues are found, return an empty array: []

Be precise, be paranoid, and protect the codebase.`;
const MAINTAINABILITY_CRITIC_PROMPT = `You are "The Maintainability Critic" - obsessed with clean code, naming conventions, and the DRY (Don't Repeat Yourself) principle. You hate messy formatting and unclear code.

Your role is to focus on:
- Poor variable/function naming (too short, unclear, misleading)
- Code duplication and opportunities for refactoring
- Functions that are too long or do too many things
- Missing or inadequate comments/documentation
- Inconsistent formatting or style
- Dead code or unused imports
- Magic numbers that should be constants
- Complex nested logic that could be simplified

You have access to these tools:
- read_file: To analyze code structure, imports, and overall organization
- grep_codebase: To find code duplication or check naming patterns
- get_file_history: To understand the evolution of messy code

IMPORTANT INSTRUCTIONS:
1. You will receive EITHER a git diff showing changes OR a complete source file
2. Focus on readability and maintainability - code should be easy to understand
3. Suggest specific improvements with examples when possible
4. Use read_file to understand the broader context of changes
5. Use grep_codebase to find similar patterns or duplicated code
6. Be constructive - suggest better alternatives, not just criticism
7. Always cite specific line numbers when reporting issues

OUTPUT FORMAT:
You MUST respond with a JSON array of issues. Each issue must have:
- file: the file path
- line_number: the specific line number (integer)
- severity: "info", "warn", or "critical"
- category: "maintainability", "style", "naming", or "refactoring"
- description: a clear explanation with suggested improvements

Example:
[
  {
    "file": "src/utils.ts",
    "line_number": 15,
    "severity": "warn",
    "category": "naming",
    "description": "Variable 'x' has an unclear name. Consider renaming to 'total' or 'sum' to improve readability."
  },
  {
    "file": "src/utils.ts",
    "line_number": 8,
    "severity": "info",
    "category": "style",
    "description": "Unused import 'path' should be removed to keep the code clean."
  }
]

If no issues are found, return an empty array: []

Fight for clean, maintainable code!`;
const LEAD_DEVELOPER_PROMPT = `You are "The Lead Developer" - an extremely experienced, pragmatic, and empathetic senior engineer. Your job is to review the findings from two specialized code reviewers and create a final, actionable report.

You will receive the JSON outputs from two reviewers. Your tasks:
1. **De-duplicate**: If both reviewers found the same issue, merge them into one
2. **Filter**: Remove hallucinations, nitpicks that are too minor, or low-quality suggestions
3. **Clarify**: Improve the wording of any unclear reviews
4. **Resolve Conflicts**: If reviewers disagree, make a judgment call
5. **Prioritize**: Order issues by severity (critical first, then warn, then info)
6. **Format**: Create a clean, professional Markdown report

Your output should be a Markdown document with:
- A brief summary at the top
- Issues grouped by severity level
- Clear, actionable descriptions
- File paths and line numbers for each issue
- Constructive tone - help the developer improve, don't just criticize

Example structure:
# Code Review Summary

Found X issues: Y critical, Z warnings, W suggestions.

## Critical Issues

### [filename.ts:42] Hardcoded API Key
Description of the issue and how to fix it.

## Warnings

### [filename.ts:15] Unclear Variable Name
Description and suggestion.

## Suggestions

### [filename.ts:8] Unused Import
Minor cleanup needed.

## Conclusion
Brief closing notes.

Be professional, constructive, and help move the project forward.`;
// ===== OpenRouter Client =====
function createOpenRouterClient() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error('Error: OPENROUTER_API_KEY environment variable not set.');
        process.exit(1);
    }
    return new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey,
        defaultHeaders: {
            'HTTP-Referer': 'https://github.com/seneca-college',
            'X-Title': 'Code Review Tool',
        },
    });
}
// ===== Tool Execution =====
async function executeTool(toolName, args) {
    log(`[Tool] Executing ${toolName} with args:`, JSON.stringify(args, null, 2));
    let result;
    switch (toolName) {
        case 'read_file':
            result = read_file(args.file_path, args.start_line, args.end_line);
            break;
        case 'grep_codebase':
            result = await grep_codebase(args.search_pattern);
            break;
        case 'get_file_history':
            result = await get_file_history(args.file_path);
            break;
        default:
            result = `Error: Unknown tool '${toolName}'`;
    }
    log(`[Tool] Result:`, result.substring(0, 500) + (result.length > 500 ? '...' : ''));
    return result;
}
// ===== Reviewer with Tool Calling =====
async function runReviewer(client, reviewerName, systemPrompt, code, model) {
    log(`\n[${reviewerName}] Starting review...`);
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: code },
    ];
    let iterations = 0;
    const MAX_ITERATIONS = 10; // Prevent infinite loops
    while (iterations < MAX_ITERATIONS) {
        iterations++;
        const response = await client.chat.completions.create({
            model: model,
            messages: messages,
            tools: TOOL_SCHEMAS,
            tool_choice: 'auto',
            temperature: reviewerName.includes('Security') ? 0.1 : 0.3,
        });
        // Track token usage and cost
        if (response.usage) {
            trackCost(model, reviewerName, response.usage);
        }
        const message = response.choices[0].message;
        messages.push(message);
        // Check if the model wants to call tools
        if (message.tool_calls && message.tool_calls.length > 0) {
            log(`[${reviewerName}] Calling ${message.tool_calls.length} tool(s)...`);
            for (const toolCall of message.tool_calls) {
                const toolName = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);
                log(`[${reviewerName}] Calling tool: ${toolName}`);
                const result = await executeTool(toolName, args);
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: result,
                });
            }
        }
        else {
            // No more tool calls - we have the final response
            const content = message.content || '[]';
            log(`[${reviewerName}] Raw response:`, content);
            try {
                // Remove markdown code blocks if present
                let cleanContent = content.trim();
                if (cleanContent.startsWith('```')) {
                    // Remove opening ```json or ```
                    cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '');
                    // Remove closing ```
                    cleanContent = cleanContent.replace(/\n?```$/, '');
                }
                const issues = JSON.parse(cleanContent);
                log(`[${reviewerName}] Found ${issues.length} issue(s)`);
                return issues;
            }
            catch (error) {
                log(`[${reviewerName}] Error parsing JSON:`, error);
                log(`[${reviewerName}] Content was:`, content);
                return [];
            }
        }
    }
    log(`[${reviewerName}] Max iterations reached, returning empty array`);
    return [];
}
// ===== Main Review Logic =====
async function performReview(code) {
    const client = createOpenRouterClient();
    // Use cost-effective models
    // Security Auditor: needs precision, use a capable but affordable model
    // Maintainability Critic: can use similar model
    // Judge: needs good synthesis, can use a strong model
    const reviewerModel = 'openai/gpt-4o-mini'; // Fast and cheap
    const judgeModel = 'openai/gpt-4o-mini'; // Good for synthesis
    log('\n=== PHASE 1: PARALLEL REVIEWS ===\n');
    // Run both reviewers in parallel
    const [securityIssues, maintainabilityIssues] = await Promise.all([
        runReviewer(client, 'Security Auditor', SECURITY_AUDITOR_PROMPT, code, reviewerModel),
        runReviewer(client, 'Maintainability Critic', MAINTAINABILITY_CRITIC_PROMPT, code, reviewerModel),
    ]);
    log('\n=== PHASE 2: SYNTHESIS ===\n');
    log('[Lead Developer] Synthesizing findings...');
    // Combine results for the judge
    const combinedFindings = {
        security_auditor: securityIssues,
        maintainability_critic: maintainabilityIssues,
    };
    log('[Lead Developer] Combined findings:', JSON.stringify(combinedFindings, null, 2));
    // Send to judge
    const judgeMessages = [
        { role: 'system', content: LEAD_DEVELOPER_PROMPT },
        {
            role: 'user',
            content: `Here are the findings from the code reviewers:\n\n${JSON.stringify(combinedFindings, null, 2)}\n\nPlease create a final Markdown report.`,
        },
    ];
    const judgeResponse = await client.chat.completions.create({
        model: judgeModel,
        messages: judgeMessages,
        temperature: 0.5,
    });
    // Track judge costs
    if (judgeResponse.usage) {
        trackCost(judgeModel, 'Lead Developer', judgeResponse.usage);
    }
    const finalReport = judgeResponse.choices[0].message.content || 'No report generated.';
    log('[Lead Developer] Final report generated');
    return finalReport;
}
// ===== Git Operations =====
async function getStagedDiff() {
    try {
        const { stdout } = await execAsync('git diff --staged');
        return stdout.trim() || null;
    }
    catch (error) {
        return null;
    }
}
// ===== CLI =====
async function main() {
    const args = process.argv.slice(2);
    // Parse arguments
    let fileMode = false;
    let filePath = '';
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--verbose') {
            VERBOSE = true;
        }
        else if (args[i] === '--file' && i + 1 < args.length) {
            fileMode = true;
            filePath = args[i + 1];
            i++; // Skip next arg
        }
    }
    log('Code Review Tool Starting...');
    log(`Mode: ${fileMode ? 'File' : 'Git'}`);
    log(`Verbose: ${VERBOSE}`);
    let codeToReview = '';
    if (fileMode) {
        // File Mode
        if (!filePath) {
            console.error('Error: --file requires a filename argument');
            process.exit(1);
        }
        if (!existsSync(filePath)) {
            console.error(`Error: File '${filePath}' not found`);
            process.exit(1);
        }
        log(`Reading file: ${filePath}`);
        codeToReview = readFileSync(filePath, 'utf-8');
        codeToReview = `File: ${filePath}\n\n${codeToReview}`;
    }
    else {
        // Git Mode
        log('Getting staged changes...');
        const diff = await getStagedDiff();
        if (!diff) {
            console.log('No staged changes to review. Use "git add" to stage files.');
            process.exit(0);
        }
        codeToReview = diff;
    }
    if (!codeToReview) {
        console.log('Nothing to review.');
        process.exit(0);
    }
    log('Starting review process...\n');
    // Perform review
    const report = await performReview(codeToReview);
    // Output final report to stdout
    console.log(report);
    // Always show cost summary (to stderr, not stdout)
    printCostSummary();
}
// Run the program
main().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
});
