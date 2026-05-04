import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

// Get the directory path for loading .env from root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file (../../.env from AI-Engineering-Lab-Tools/GitHub-PR-Explainer)
config({ path: join(__dirname, '../../.env') });

// Student identification information
const STUDENT_NAME = "KRUTIN BHARATBHAI POLRA";
const STUDENT_ID = "135416220";
const APP_NAME = "GitHub PR Explainer";

// Regular expressions for URL parsing
const SHORTHAND_URL_REGEX = /^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)#(\d+)$/;
const GITHUB_PR_PATH_REGEX = /^\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)\/?$/;
const EXPECTED_HOSTNAME = 'github.com';

// API and fetching constants
const MAX_DIFF_LENGTH = 100000; // Maximum characters for diff (to stay within token limits)
const GITHUB_BASE_URL = 'https://github.com';
const GITHUB_API_BASE_URL = 'https://api.github.com';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// LLM Model configuration (free model with paid fallback for rate limits)
// Try free models first, fallback to paid if rate limited or model unavailable
const PRIMARY_MODEL = 'google/gemini-2.0-flash-exp:free';
const FALLBACK_MODEL = 'google/gemini-2.5-flash-lite';

// GitHub API request headers (required by GitHub API)
const GITHUB_API_HEADERS = {
  'User-Agent': 'github-pr-explainer', // GitHub requires app identity
  'Accept': 'application/vnd.github+json', // Ensures GitHub's JSON format
  'X-GitHub-Api-Version': '2022-11-28' // Ensures API stability
};

// Exit codes for different error scenarios
const EXIT_CODES = {
  SUCCESS: 0,
  MISSING_API_KEY: 1,
  INVALID_URL: 1,
  MISSING_ARGUMENTS: 1,
  FETCH_ERROR: 1,
  GENERAL_ERROR: 1
};

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

/**
 * Displays the application identity header with student information
 * Shows app name, developer name, and student ID in a formatted banner
 */
function displayHeader() {
  const headerText = `${APP_NAME} - Developed by ${STUDENT_NAME} - ${STUDENT_ID}`;
  const separator = '-'.repeat(headerText.length);
  
  console.log(headerText);
  console.log(separator);
  console.log();
}

/**
 * Displays usage instructions when the tool is invoked incorrectly
 */
function displayUsage() {
  console.error('Usage: node pr-explain.js <github-pr-url>');
  console.error('');
  console.error('Examples:');
  console.error('  node pr-explain.js https://github.com/microsoft/vscode/pull/206668');
  console.error('  node pr-explain.js microsoft/vscode#206668');
}

/**
 * Displays formatted PR information
 * @param {Object} prInfo - The parsed PR information
 * @param {string} prInfo.owner - Repository owner
 * @param {string} prInfo.repo - Repository name
 * @param {number} prInfo.prNumber - Pull request number
 */
function displayPRInfo(prInfo) {
  console.log('📊 Analyzing Pull Request...');
  console.log(`   Owner: ${prInfo.owner}`);
  console.log(`   Repository: ${prInfo.repo}`);
  console.log(`   PR Number: #${prInfo.prNumber}`);
  console.log('');
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates that the required OpenRouter API key exists in environment variables
 * @returns {string} The validated API key
 * @throws Will exit the process if API key is missing
 */
function validateApiKey() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Error: OPENROUTER_API_KEY not found');
    console.error('Please ensure your .env file exists and contains OPENROUTER_API_KEY');
    process.exit(EXIT_CODES.MISSING_API_KEY);
  }
  
  console.log('✅ API Key validated');
  return apiKey;
}

/**
 * Validates command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {string} The PR URL argument
 * @throws Will exit the process if no URL is provided
 */
function validateArguments(args) {
  if (args.length === 0) {
    displayUsage();
    process.exit(EXIT_CODES.MISSING_ARGUMENTS);
  }
  
  return args[0];
}

// ============================================================================
// URL PARSING FUNCTIONS
// ============================================================================

/**
 * Attempts to parse a shorthand GitHub PR URL format (owner/repo#number)
 * @param {string} urlString - The URL string to parse
 * @returns {Object|null} Parsed PR info or null if not shorthand format
 */
function parseShorthandUrl(urlString) {
  const match = urlString.match(SHORTHAND_URL_REGEX);
  
  if (!match) {
    return null;
  }
  
  return {
    owner: match[1],
    repo: match[2],
    prNumber: parseInt(match[3], 10)
  };
}

/**
 * Validates that a URL object points to GitHub
 * @param {URL} url - The URL object to validate
 * @throws {Error} If hostname is not github.com
 */
function validateGitHubHostname(url) {
  if (url.hostname !== EXPECTED_HOSTNAME) {
    throw new Error(
      `Invalid URL origin. Expected ${EXPECTED_HOSTNAME}, but got ${url.hostname}`
    );
  }
}

/**
 * Parses a full GitHub PR URL and extracts repository information
 * @param {string} urlString - The full GitHub URL
 * @returns {Object} Parsed PR information
 * @throws {Error} If URL is malformed or not a PR URL
 */
function parseFullUrl(urlString) {
  let url;
  
  try {
    url = new URL(urlString);
  } catch (error) {
    throw new Error(
      'Invalid URL format. Please provide a valid GitHub PR URL or shorthand (owner/repo#number)'
    );
  }
  
  validateGitHubHostname(url);
  
  const pathMatch = url.pathname.match(GITHUB_PR_PATH_REGEX);
  
  if (!pathMatch) {
    throw new Error(
      'Invalid GitHub PR URL format. Expected format: https://github.com/owner/repo/pull/number'
    );
  }
  
  return {
    owner: pathMatch[1],
    repo: pathMatch[2],
    prNumber: parseInt(pathMatch[3], 10)
  };
}

/**
 * Parses a GitHub Pull Request URL and extracts owner, repo, and PR number
 * Supports both shorthand (owner/repo#number) and full URL formats
 * 
 * @param {string} urlString - The GitHub PR URL in either format
 * @returns {Object} Parsed PR information
 * @returns {string} returns.owner - Repository owner
 * @returns {string} returns.repo - Repository name
 * @returns {number} returns.prNumber - Pull request number
 * @throws {Error} If the URL is invalid or not a GitHub PR
 * 
 * @example
 * // Shorthand format
 * parseGitHubPRUrl('microsoft/vscode#206668')
 * // Returns: { owner: 'microsoft', repo: 'vscode', prNumber: 206668 }
 * 
 * @example
 * // Full URL format
 * parseGitHubPRUrl('https://github.com/microsoft/vscode/pull/206668')
 * // Returns: { owner: 'microsoft', repo: 'vscode', prNumber: 206668 }
 */
function parseGitHubPRUrl(urlString) {
  // Try shorthand format first (simpler and more common)
  const shorthandResult = parseShorthandUrl(urlString);
  if (shorthandResult) {
    return shorthandResult;
  }
  
  // Fall back to full URL parsing
  return parseFullUrl(urlString);
}

// ============================================================================
// GITHUB API FUNCTIONS
// ============================================================================

/**
 * Constructs the diff URL for a GitHub Pull Request
 * @param {Object} prInfo - The parsed PR information
 * @returns {string} The URL to fetch the diff
 */
function constructDiffUrl(prInfo) {
  return `${GITHUB_BASE_URL}/${prInfo.owner}/${prInfo.repo}/pull/${prInfo.prNumber}.diff`;
}

/**
 * Constructs the patch URL for a GitHub Pull Request
 * @param {Object} prInfo - The parsed PR information
 * @returns {string} The URL to fetch the patch
 */
function constructPatchUrl(prInfo) {
  return `${GITHUB_BASE_URL}/${prInfo.owner}/${prInfo.repo}/pull/${prInfo.prNumber}.patch`;
}

/**
 * Fetches content from a URL
 * @param {string} url - The URL to fetch from
 * @returns {Promise<string>} The fetched content
 * @throws {Error} If the fetch fails
 */
async function fetchContent(url) {
  console.log(`Fetching: ${url}`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Pull Request not found. Please verify the PR exists and is accessible.`);
      }
      throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
    }
    
    const content = await response.text();
    console.log(`✅ Fetched ${content.length} characters`);
    
    return content;
  } catch (error) {
    if (error.message.includes('Pull Request not found')) {
      throw error;
    }
    throw new Error(`Network error: ${error.message}`);
  }
}

/**
 * Truncates the diff if it exceeds the maximum length
 * @param {string} diff - The full diff content
 * @returns {Object} Object containing the diff and whether it was truncated
 */
function truncateDiffIfNeeded(diff) {
  if (diff.length <= MAX_DIFF_LENGTH) {
    return { content: diff, wasTruncated: false };
  }
  
  console.log(`Warning: Diff is ${diff.length} characters, truncating to ${MAX_DIFF_LENGTH}`);
  
  const truncatedDiff = diff.substring(0, MAX_DIFF_LENGTH) + '\n\n...[Diff Truncated]...';
  
  return { content: truncatedDiff, wasTruncated: true };
}

/**
 * Fetches the diff for a GitHub Pull Request
 * Uses the .patch format as it includes metadata (author, date, commit messages)
 * which provides better context for the LLM analysis
 * 
 * @param {Object} prInfo - The parsed PR information
 * @returns {Promise<Object>} Object with diff content and metadata
 */
async function fetchPRDiff(prInfo) {
  // Using .patch format as it includes valuable metadata
  // (author, date, commit messages) that helps with analysis
  const patchUrl = constructPatchUrl(prInfo);
  
  const content = await fetchContent(patchUrl);
  const { content: processedContent, wasTruncated } = truncateDiffIfNeeded(content);
  
  return {
    content: processedContent,
    wasTruncated,
    originalLength: content.length,
    format: 'patch'
  };
}

/**
 * Constructs the GitHub API URL for fetching issue comments
 * Note: In GitHub API, Pull Requests are treated as issues for comments
 * 
 * @param {Object} prInfo - The parsed PR information
 * @returns {string} The API URL to fetch comments
 */
function constructCommentsApiUrl(prInfo) {
  return `${GITHUB_API_BASE_URL}/repos/${prInfo.owner}/${prInfo.repo}/issues/${prInfo.prNumber}/comments`;
}

/**
 * Fetches JSON data from GitHub API with proper headers
 * @param {string} url - The API URL to fetch from
 * @returns {Promise<any>} The parsed JSON response
 * @throws {Error} If the fetch fails or rate limit is exceeded
 */
async function fetchGitHubAPI(url) {
  console.log(`🔍 Fetching: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: GITHUB_API_HEADERS
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(
          'GitHub API rate limit exceeded (60 requests/hour without token). Please wait an hour and try again.'
        );
      }
      if (response.status === 404) {
        throw new Error('Pull Request not found or has no comments.');
      }
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Fetched ${Array.isArray(data) ? data.length : 'N/A'} items`);
    
    return data;
  } catch (error) {
    if (error.message.includes('rate limit') || error.message.includes('not found')) {
      throw error;
    }
    throw new Error(`Network error: ${error.message}`);
  }
}

/**
 * Fetches and formats comments from a GitHub Pull Request
 * Extracts only the essential fields: username, comment body, and date
 * 
 * @param {Object} prInfo - The parsed PR information
 * @returns {Promise<Array>} Array of comment objects with username, body, and date
 */
async function fetchPRComments(prInfo) {
  const apiUrl = constructCommentsApiUrl(prInfo);
  const rawData = await fetchGitHubAPI(apiUrl);
  
  // Extract only the fields we need for LLM analysis
  const comments = rawData.map(item => ({
    username: item.user.login,
    body: item.body,
    date: item.updated_at
  }));
  
  return comments;
}

// ============================================================================
// PROMPT ENGINEERING FUNCTIONS
// ============================================================================

/**
 * Constructs the system prompt with Principal Engineer persona
 * Implements chain of thought reasoning and defines output format
 * 
 * @returns {string} The system prompt for the LLM
 */
function createSystemPrompt() {
  return `# GitHub PR Analyzer - Principal Engineer Review

You are a **Principal Engineer** reviewing Pull Requests for junior developers. Provide expert, educational guidance that prioritizes code safety and maintainability.

## CRITICAL: Output Format Rules
1. Output MUST be plain Markdown text - NO JSON, NO code blocks wrapping the entire output
2. Use the EXACT section headers: ### Summary, ### The Discussion, ### Assessment, ### Socratic Questions
3. Follow the 4-step analysis process (no shortcuts)
4. Use ONLY information from the provided diff and comments
5. Generate EXACTLY 3 Socratic questions (numbered 1, 2, 3)
6. DO NOT REPEAT sections or content - write each section ONCE only
7. **LINE NUMBER ACCURACY - CRITICAL**: 
   - In unified diff format, each changed section shows line numbers on BOTH sides
   - REMOVED lines (starting with -) show the OLD line number on the LEFT
   - ADDED lines (starting with +) show the NEW line number on the RIGHT
   - When analyzing changes, ALWAYS cite the line numbers from the RIGHT column (NEW file)
   - Focus on lines that have "+" or "-" markers - those are the actual changes
   - Example: If you see "+ return;" on line 751 (right side), cite "Line 751"

## Analysis Process (Chain of Thought - REQUIRED)

### Step 1: Technical Analysis
Examine the diff to understand:
- What changes were made and their technical implementation
- Code patterns, algorithms, and data structures used
- Impact on existing codebase

### Step 2: Context Understanding  
Analyze the comments to understand:
- Human reasoning behind decisions
- Reviewer concerns and feedback
- Agreements, disagreements, and blockers

### Step 3: Critical Assessment
Reflect on:
- Underlying assumptions and edge cases
- Potential bugs and failure modes
- Performance, security, scalability concerns
- Technical debt and maintainability

### Step 4: Synthesis
Combine insights into actionable guidance

## REQUIRED Output Format (DO NOT WRAP IN CODE BLOCKS OR JSON)

### Summary
[1-2 sentences stating the PR's goal clearly]

### The Discussion
[Summary: What was discussed? Who agreed/disagreed? Any blockers? If no comments: "No comments found on this PR"]

### Assessment
[List specific issues with precise line references. CRITICAL: Look at the diff - lines starting with "+" are ADDED lines. Use the line number from the RIGHT SIDE of these + lines.]

REQUIRED FORMAT for each issue:
**Line [RIGHT-SIDE-NUMBER] ([full/file/path]):** [Issue title]
[Detailed explanation referencing specific code]

Example: If the diff shows line 750 on the right with a plus symbol, cite "Line 750 (path/to/file.ts)".

### Socratic Questions
1. [Question with line reference and file path: e.g., "Line 45 (src/file.ts): Why was..."]
2. [Question about trade-offs in the implementation with specific code reference]
3. [Question about edge cases or potential issues with line/file reference]

IMPORTANT: Stop after completing all 3 questions. Do NOT repeat any sections.

## Edge Cases
- **No comments**: Write "No comments found on this PR" in Discussion section
- **Truncated diff**: Note "[Diff Truncated]" and acknowledge incomplete analysis

## Important
- Output PLAIN MARKDOWN only - no JSON, no wrapping code blocks
- Be specific with line numbers when citing issues
- Educational tone, not accusatory

## Important
- Be educational but rigorous
- Value safety over cleverness
- Be specific with line numbers
- Support your claims with evidence from the diff`;
}

/**
 * Formats comments into XML structure for the prompt
 * @param {Array} comments - Array of comment objects
 * @returns {string} XML-formatted comments
 */
function formatCommentsAsXML(comments) {
  if (comments.length === 0) {
    return '<comments>\n  <note>No comments found on this PR.</note>\n</comments>';
  }
  
  const commentElements = comments.map(comment => {
    // Escape XML special characters in the body
    const escapedBody = comment.body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    return `  <comment username="${comment.username}" date="${comment.date}">
${escapedBody}
  </comment>`;
  }).join('\n\n');
  
  return `<comments>\n${commentElements}\n</comments>`;
}

/**
 * Constructs the user prompt with diff and comments using proper delimiters
 * @param {string} diff - The PR diff/patch content
 * @param {Array} comments - Array of comment objects
 * @param {Object} prInfo - PR information (owner, repo, number)
 * @returns {string} The formatted user prompt
 */
function createUserPrompt(diff, comments, prInfo) {
  const commentsXML = formatCommentsAsXML(comments);
  
  return `Please analyze this Pull Request from **${prInfo.owner}/${prInfo.repo}** (PR #${prInfo.prNumber}).

## Code Changes

\`\`\`diff
${diff}
\`\`\`

## Discussion

${commentsXML}

---

Please provide your Principal Engineer analysis following the specified format.`;
}

// ============================================================================
// LLM API FUNCTIONS
// ============================================================================

/**
 * Sends a prompt to OpenRouter API and gets the LLM response
 * Automatically retries with fallback model if rate limited
 * 
 * @param {string} systemPrompt - The system prompt defining the AI's role
 * @param {string} userPrompt - The user prompt with diff and comments
 * @param {string} apiKey - OpenRouter API key
 * @param {string} modelName - The model to use (defaults to PRIMARY_MODEL)
 * @returns {Promise<string>} The LLM's response text
 */
async function callOpenRouterAPI(systemPrompt, userPrompt, apiKey, modelName = PRIMARY_MODEL) {
  console.log(`🤖 Sending to AI (${modelName})...`);
  
  const requestBody = {
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 2000, // Limit output to prevent duplication
    temperature: 0.3  // Lower temperature for more focused output
  };
  
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/github-pr-explainer',
        'X-Title': 'GitHub PR Explainer'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      
      // Check if it's a rate limit error (429 or specific error message)
      const isRateLimit = response.status === 429 || 
                         errorMessage.toLowerCase().includes('rate limit') ||
                         errorMessage.toLowerCase().includes('quota exceeded');
      
      // Check if model doesn't exist (404 or invalid model error)
      const isModelNotFound = response.status === 404 ||
                             response.status === 400 ||
                             errorMessage.toLowerCase().includes('not a valid model') ||
                             errorMessage.toLowerCase().includes('no endpoints found');
      
      if (isRateLimit || isModelNotFound) {
        throw new Error(isRateLimit ? 'RATE_LIMIT' : 'MODEL_NOT_FOUND');
      }
      
      throw new Error(`OpenRouter API Error: ${response.status} - ${errorMessage}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenRouter API');
    }
    
    console.log('✅ Analysis complete');
    return data.choices[0].message.content;
    
  } catch (error) {
    if (error.message === 'RATE_LIMIT' || error.message === 'MODEL_NOT_FOUND') {
      throw error; // Re-throw to be handled by caller
    }
    throw new Error(`Failed to get LLM response: ${error.message}`);
  }
}

/**
 * Analyzes a PR using the LLM with engineered prompts
 * Automatically falls back to paid model if rate limited on free model
 * 
 * @param {Object} diffData - The PR diff data
 * @param {Array} comments - The PR comments
 * @param {Object} prInfo - PR information
 * @param {string} apiKey - OpenRouter API key
 * @returns {Promise<string>} The formatted analysis
 */
async function analyzePRWithLLM(diffData, comments, prInfo, apiKey) {
  const systemPrompt = createSystemPrompt();
  const userPrompt = createUserPrompt(diffData.content, comments, prInfo);
  
  try {
    // Try with primary (free) model first
    const analysis = await callOpenRouterAPI(systemPrompt, userPrompt, apiKey, PRIMARY_MODEL);
    return analysis;
  } catch (error) {
    // If rate limited or model not found, retry with fallback (paid) model
    if (error.message === 'RATE_LIMIT') {
      console.log('⚠️  Rate limited on free model, switching to paid model...');
      const analysis = await callOpenRouterAPI(systemPrompt, userPrompt, apiKey, FALLBACK_MODEL);
      return analysis;
    } else if (error.message === 'MODEL_NOT_FOUND') {
      console.log('⚠️  Free model not available, using paid model...');
      const analysis = await callOpenRouterAPI(systemPrompt, userPrompt, apiKey, FALLBACK_MODEL);
      return analysis;
    }
    // Re-throw other errors
    throw error;
  }
}

// ============================================================================
// MAIN PROGRAM LOGIC
// ============================================================================

/**
 * Main function that orchestrates the PR explanation process
 * Handles the complete workflow: validation, parsing, fetching, and analysis
 * 
 * @param {string} prUrl - The GitHub PR URL to analyze
 * @throws Will exit the process on any error
 */
async function explainPR(prUrl) {
  try {
    // Step 1: Display application header
    displayHeader();
    
    // Step 2: Validate required API key
    const apiKey = validateApiKey();
    console.log('');
    
    // Step 3: Parse and validate the PR URL
    const prInfo = parseGitHubPRUrl(prUrl);
    
    // Step 4: Display parsed PR information
    displayPRInfo(prInfo);

    // Step 5: Fetch PR diff/patch from GitHub
    console.log('📥 Fetching PR changes...');
    const diffData = await fetchPRDiff(prInfo);
    
    if (diffData.wasTruncated) {
      console.log(`⚠️  Note: Original diff was ${diffData.originalLength} characters, truncated to fit model context`);
    }
    console.log('');
    
    // Step 6: Fetch PR comments and conversation
    console.log('💬 Fetching PR conversation...');
    const comments = await fetchPRComments(prInfo);
    
    if (comments.length === 0) {
      console.log('ℹ️  No comments found on this PR');
    } else {
      console.log(`✅ Found ${comments.length} comment${comments.length !== 1 ? 's' : ''}`);
    }
    console.log('');
    
    // Step 7: Send to LLM for analysis
    console.log('🧠 Generating Principal Engineer analysis...');
    const analysis = await analyzePRWithLLM(diffData, comments, prInfo, apiKey);
    console.log('');
    
    // Step 8: Display analysis results
    console.log('═'.repeat(80));
    console.log('📋 PRINCIPAL ENGINEER ANALYSIS');
    console.log('═'.repeat(80));
    console.log('');
    console.log(analysis);
    console.log('');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(EXIT_CODES.GENERAL_ERROR);
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

/**
 * Entry point for the CLI application
 * Validates arguments and initiates the PR explanation process
 */
function main() {
  const args = process.argv.slice(2);
  const prUrl = validateArguments(args);
  explainPR(prUrl);
}

// Start the application
main();
