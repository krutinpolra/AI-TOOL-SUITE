// Load environment variables from root directory
require('dotenv').config({ path: '../../.env' });

// Import child_process for running git commands
const { execSync } = require('child_process');

// Import OpenAI SDK
const OpenAI = require('openai');

// Import readline for user input
const readline = require('readline');

// Student Information Constants
const STUDENT_NAME = "KRUTIN BHARATBHAI POLRA";
const STUDENT_ID = "135416220";
const APP_NAME = "Git Scribe";

/**
 * Displays the application identity header
 */
function displayHeader() {
    const headerText = `${APP_NAME} - Developed by ${STUDENT_NAME} - ${STUDENT_ID}`;
    const separator = "-".repeat(headerText.length);
    
    console.log(headerText);
    console.log(separator);
    console.log();
}

/**
 * Validates that the required API key is present in environment variables
 * @returns {string} The validated API key
 * @throws {Error} If API key is missing
 */
function validateApiKey() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
        console.error('❌ Error: OPENROUTER_API_KEY not found');
        console.error('Please ensure your .env file exists and contains OPENROUTER_API_KEY');
        process.exit(1);
    }
    
    return apiKey;
}

/**
 * Gets the staged git changes using git diff --staged
 * @returns {string} The git diff output
 */
function getStagedDiff() {
    try {
        const diff = execSync('git diff --staged', { encoding: 'utf-8' });
        
        if (!diff || diff.trim().length === 0) {
            console.error('❌ No staged changes found');
            process.exit(1);
        }
        
        console.log(`✅ Diff found: ${diff.length} characters`);
        return diff;
    } catch (error) {
        console.error('❌ Error running git command:', error.message);
        process.exit(1);
    }
}

/**
 * Prompts the user for confirmation
 * @param {string} question - The question to ask
 * @returns {Promise<string>} The user's response
 */
function promptUser(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * Executes git commit with the provided message
 * @param {string} commitMessage - The commit message to use
 */
function executeCommit(commitMessage) {
    try {
        execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { 
            encoding: 'utf-8',
            stdio: 'inherit'
        });
        console.log('\n✅ Commit successful!');
    } catch (error) {
        console.error('\n❌ Error committing changes:', error.message);
        process.exit(1);
    }
}

/**
 * Generates a commit message using OpenRouter AI
 * @param {string} diff - The git diff output
 * @param {string} apiKey - The OpenRouter API key
 * @param {boolean} isCreative - Whether to use creative mode
 * @returns {Promise<string>} The generated commit message
 */
async function generateCommitMessage(diff, apiKey, isCreative = false) {
    const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey,
    });

    // Choose system prompt based on mode
    const systemPrompt = isCreative
        ? `Ahoy! Ye be a 17th Century Pirate Captain, writin' entries in yer ship's log about changes to yer code treasure! 
Analyze the git diff and craft a commit message in proper pirate slang, me hearty!
Use sea-farin' language, pirate terminology, and maritime metaphors.
Keep it spirited but clear enough that landlubbers can still understand what changed.
Output ONLY the commit message in plain text, no markdown, no explanation, no quotes.
Example style: "fix: patched the leaky hull in authentication module, arrr!"`
        : `You are an expert at writing semantic commit messages following the Conventional Commits standard. 
You will be given a git diff showing code changes. 
Analyze the changes and generate a concise, meaningful commit message in the format: 'type: description'.

Common types:
- feat: A new feature
- fix: A bug fix
- docs: Documentation changes
- style: Code style changes (formatting, etc.)
- refactor: Code refactoring
- test: Adding or updating tests
- chore: Maintenance tasks

Output ONLY the commit message in plain text, no markdown, no explanation, no quotes. 
The message should be suitable for direct use in 'git commit -m "your message"'.`;

    // Set temperature based on mode
    const temperature = isCreative ? 1.5 : 0.1;

    try {
        const modeLabel = isCreative ? 'Creative (Pirate) Mode' : 'Standard Mode';
        console.log(`${modeLabel} - Generating commit message...`);
        
        const completion = await openai.chat.completions.create({
            model: 'google/gemini-2.0-flash-exp:free',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: diff }
            ],
            temperature: temperature,
        });
        const commitMessage = completion.choices[0].message.content.trim();
        console.log('✅ Commit message generated\n');
        return commitMessage;
    } catch (error) {
        if (error.status === 429) {
            console.error('❌ Rate limit exceeded. Please try again later or use a different model.');
        } else {
            console.error('❌ Error generating commit message:', error.message);
        }
        process.exit(1);
    }
}

// Main execution
async function main() {
    // Display identity header
    displayHeader();

    // Check for creative mode flag
    const isCreative = process.argv.includes('--creative');
    
    // Check for auto-confirm flag
    const autoConfirm = process.argv.includes('-y');
    
    if (isCreative) {
        console.log('Ahoy! Creative (Pirate) Mode enabled!\n');
    }

    // Validate API key
    const OPENROUTER_API_KEY = validateApiKey();

    // Get staged git changes
    const diff = getStagedDiff();

    // Generate commit message
    const commitMessage = await generateCommitMessage(diff, OPENROUTER_API_KEY, isCreative);
    
    console.log('Suggested commit message:');
    console.log(commitMessage);
    console.log();

    // Ask for confirmation or auto-confirm
    let shouldCommit = autoConfirm;
    
    if (autoConfirm) {
        console.log('Auto-confirming due to -y flag...');
    } else {
        const response = await promptUser('Do you want to use this commit message? (Y/n): ');
        shouldCommit = response.trim().toUpperCase() === 'Y' || response.trim() === '';
    }

    if (shouldCommit) {
        executeCommit(commitMessage);
    } else {
        console.log('\n❌ Commit cancelled');
        process.exit(0);
    }
}

// Run the main function
main().catch(error => {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
});
