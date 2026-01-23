/**
 * Flashcard Generator - Lab 02
 * 
 * This CLI tool converts course notes into study flashcards using AI.
 * It demonstrates prompt engineering techniques including:
 * - Code/Prompt separation (INSTRUCTIONS.md)
 * - Delimited input (XML tags)
 * - Few-shot prompting (examples in system prompt)
 * - Chain-of-thought reasoning
 * - Structured workflow
 * - Edge case handling
 */

// ============================================================================
// IMPORTS AND DEPENDENCIES
// ============================================================================

// Load environment variables from root directory
require('dotenv').config({ path: '../../.env' });

// Import required Node.js modules
const OpenAI = require('openai');                    // OpenAI SDK for API calls
const fs = require('fs');                             // File system operations
const { readFile } = require('node:fs/promises');    // Async file reading
const { parseArgs } = require('node:util');           // Command-line argument parsing
const { calculateCost } = require('./cost');          // Cost calculation utility

// ============================================================================
// CONSTANTS
// ============================================================================

const STUDENT_NAME = "KRUTIN BHARATBHAI POLRA";
const STUDENT_ID = "135416220";
const APP_NAME = "Flashcard Generator";
const SYSTEM_PROMPT_PATH = 'INSTRUCTIONS.md';
const MODEL_NAME = 'meta-llama/llama-3.3-70b-instruct:free';  // Paid version for better reliability
const MODEL_TEMPERATURE = 0.7;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Displays the application identity header
 * Shows app name, developer name, and student ID
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
 * 
 * @returns {string} The validated API key
 * @throws {Error} Exits process if API key is missing
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

// ============================================================================
// COMMAND LINE ARGUMENT PARSING
// ============================================================================

/**
 * Parses and validates command line arguments
 * 
 * Expected usage: node flashcard-gen.js <notes-path> [--count N]
 * 
 * @returns {Object} Object containing:
 *   - notesPath {string}: Path to the notes file
 *   - count {number}: Number of flashcards to generate (1-5)
 * @throws {Error} Exits process if arguments are invalid
 */
function parseArguments() {
    // Define expected command line options
    const options = {
        count: {
            type: 'string',
            short: 'c',
            default: '3',  // Default to 3 cards if not specified
        },
    };

    let values, positionals;
    
    // Parse arguments using Node's built-in utility
    try {
        ({ values, positionals } = parseArgs({ options, allowPositionals: true }));
    } catch (err) {
        console.error('❌ Error parsing arguments:', err.message);
        process.exit(1);
    }

    // Validate that notes file path is provided
    if (positionals.length === 0) {
        console.error('❌ Error: Please provide a path to notes file');
        console.error('Usage: node flashcard-gen.js <notes-path> [--count N]');
        process.exit(1);
    }

    const notesPath = positionals[0];
    
    // Check if notes file exists
    if (!fs.existsSync(notesPath)) {
        console.error(`❌ Error: File not found: ${notesPath}`);
        process.exit(1);
    }
    
    // Parse and validate count
    const count = parseInt(values.count);
    if (isNaN(count) || count < 1 || count > 5) {
        console.error('❌ Error: --count must be between 1 and 5');
        process.exit(1);
    }

    return { notesPath, count };
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Reads a file and returns its contents as a string
 * 
 * @param {string} path - Path to the file to read
 * @param {string} description - Human-readable description for error messages
 * @returns {Promise<string>} File contents as UTF-8 string
 * @throws {Error} Exits process if file cannot be read

 */
async function getFileContents(path, description) {
    try {
        return await readFile(path, 'utf-8');
    } catch (err) {
        console.error(`❌ Error: ${description} not found: ${path}`);
        console.error(`   ${err.message}`);
        process.exit(1);
    }
}

// ============================================================================
// PROMPT CONSTRUCTION
// ============================================================================

/**
 * Builds the user prompt with delimited notes content and instructions
 * 
 * This function:
 * 1. Wraps notes in XML delimiters to prevent prompt injection
 * 2. Specifies the exact number of cards needed
 * 3. Repeats critical instructions to reinforce requirements
 * 
 * @param {string} notesContent - The raw course notes content
 * @param {number} count - Number of flashcards to generate
 * @returns {string} The formatted user prompt with delimited notes
 */
function buildUserPrompt(notesContent, count) {
    const plural = count > 1 ? 's' : '';
    return `Generate EXACTLY ${count} flashcard${plural} in SQR format. Output all ${count} cards in sequence.

<course_notes>
${notesContent}
</course_notes>

REQUIREMENTS:
- Generate ALL ${count} flashcard${plural} (CARD 1 through CARD ${count})
- ONLY use information from the notes above
- Every REFERENCE must be a direct quote from the notes
- Expand ALL acronyms in QUESTION fields
- Use === CARD N === delimiters (NOT ### or ##)
- Do NOT stop until you have output all ${count} flash cards

Output all ${count} flash cards now:`;
}

// ============================================================================
// AI INTERACTION
// ============================================================================

/**
 * Generates flashcards by calling the OpenRouter API
 * 
 * This function:
 * 1. Initializes OpenAI client with OpenRouter endpoint
 * 2. Sends system prompt (from INSTRUCTIONS.md) and user prompt
 * 3. Returns both the AI response and completion object for cost tracking
 * 
 * @param {string} apiKey - OpenRouter API key
 * @param {string} systemPrompt - The system prompt with instructions
 * @param {string} userPrompt - The user prompt with notes
 * @param {number} count - Number of flashcards to generate (for calculating max_tokens)
 * @returns {Promise<{response: string, completion: Object}>} Response text and completion object
 * @throws {Error} Exits process on API errors
 */
async function generateFlashcards(apiKey, systemPrompt, userPrompt, count) {
    // Initialize OpenAI client configured for OpenRouter
    const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey,
    });
    
    // Calculate max_tokens based on card count (each card ~600-700 tokens + buffer)
    const maxTokens = Math.max(2000, count * 1000 + 1500);
    
    try {
        // Make the chat completion request
        const completion = await openai.chat.completions.create({
            model: MODEL_NAME,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: MODEL_TEMPERATURE,
            max_tokens: maxTokens,  // Dynamic based on card count
        });
        
        // Validate response structure
        if (!completion || !completion.choices || completion.choices.length === 0) {
            console.error('❌ Invalid API response - no choices returned');
            console.error('Response:', JSON.stringify(completion, null, 2));
            process.exit(1);
        }
        
        // Extract response and return both response and completion for cost calculation
        const response = completion.choices[0].message.content;
        
        if (!response) {
            console.error('❌ Empty response from API');
            process.exit(1);
        }
        
        return { response, completion };
        
    } catch (error) {
        // Handle rate limiting
        if (error.status === 429) {
            console.error('❌ Rate limit exceeded. Please try again later.');
        } else {
            console.error('❌ Error generating flashcards:', error.message);
        }
        process.exit(1);
    }
}

// ============================================================================
// CARD EXTRACTION
// ============================================================================

/**
 * Extracts flashcards from the AI's response
 * 
 * The AI response may include reasoning and analysis. This function
 * extracts only the SQR formatted cards using regex pattern matching.
 * 
 * @param {string} output - The raw AI response
 * @returns {Array<string>} Array of extracted flashcard strings
 * @throws {Error} Exits process if no cards are found
 */
function extractCards(output) {
    // Extract all cards using regex
    // Match from "=== CARD N ===" to the next "===" on its own line
    const cardRegex = /=== CARD \d+ ===[\s\S]*?(?=\n===\n|\n===\s*$|$)/g;
    const matches = output.match(cardRegex);
    
    if (!matches) {
        console.log('❌ No cards found in output.');
        console.log('\nRaw output from AI:');
        console.log(output);
        process.exit(1);
    }
    
    // Add back the closing === and clean up
    const cards = matches.map(card => {
        // If card doesn't end with ===, add it
        if (!card.trim().endsWith('===')) {
            return card.trim() + '\n===';
        }
        return card.trim() + '\n===';
    });
    
    return cards;
}

// ============================================================================
// MAIN EXECUTION FLOW
// ============================================================================

/**
 * Main application entry point
 * 
 * Workflow:
 * 1. Display header with student info
 * 2. Validate API key
 * 3. Parse and validate command line arguments
 * 4. Load system prompt from INSTRUCTIONS.md
 * 5. Load course notes from specified file
 * 6. Build user prompt with delimited notes
 * 7. Call OpenRouter API to generate flashcards
 * 8. Calculate and display API cost
 * 9. Extract cards from AI response (remove reasoning)
 * 10. Display the extracted flashcards
 */
async function main() {
    // Step 1: Display identity header
    displayHeader();
    
    // Step 2: Validate API key exists in environment
    const apiKey = validateApiKey();
    console.log('✅ API key validated');

    // Step 3: Parse command line arguments
    const { notesPath, count } = parseArguments();
    console.log(`✅ File found: ${notesPath}`);
    console.log(`✅ Generating ${count} flashcard(s)`);

    // Step 4: Load system prompt (prompt engineering instructions)
    const systemPrompt = await getFileContents(SYSTEM_PROMPT_PATH, 'System prompt file');
    console.log('✅ System prompt loaded');
    
    // Step 5: Load course notes from user-specified file
    const notesContent = await getFileContents(notesPath, 'Notes file');
    
    // Validate notes are not empty or trivial
    const trimmedNotes = notesContent.trim();
    if (trimmedNotes.length === 0) {
        console.error('❌ Error: The notes file is empty.');
        console.error('   Cannot generate flashcards from empty content.');
        console.error('   Please provide course notes with concepts, definitions, or techniques.');
        process.exit(1);
    }
    
    // Validate for meaningful content (not just headers)
    const wordCount = trimmedNotes.split(/\s+/).length;
    const hasOnlyHeader = /^#[^\n]*\n*$/.test(trimmedNotes);
    
    if (hasOnlyHeader || wordCount < 10) {
        console.error('❌ Error: Notes contain insufficient educational content.');
        console.error(`   Found only ${wordCount} word(s) - appears to be just a title/header.`);
        console.error('   Please provide actual course content with concepts, definitions, or explanations.');
        process.exit(1);
    }
    
    console.log('✅ Notes file loaded');
    
    // Step 6: Build user prompt with delimited notes and count
    const userPrompt = buildUserPrompt(notesContent, count);
    console.log('✅ User prompt constructed\n');
    
    // Step 7: Generate flashcards using AI
    const { response, completion } = await generateFlashcards(apiKey, systemPrompt, userPrompt, count);
    
    // Check if AI refused due to insufficient content
    if (response.includes('ERROR: Cannot generate flashcards') || response.includes('ERROR:')) {
        console.error('\n❌ ' + response.trim());
        process.exit(1);
    }
    
    // Check if AI issued a warning about insufficient content
    const hasWarning = response.includes('WARNING:');
    if (hasWarning) {
        const warningMatch = response.match(/WARNING:[^\n]+(?:\n[^\n]+)?/);
        if (warningMatch) {
            console.log('\n⚠️  ' + warningMatch[0].replace('WARNING:', '').trim() + '\n');
        }
    }
    
    // Step 8: Calculate and display cost
    const cost = await calculateCost(completion);
    console.log(`💰 Cost: $${cost.total.toFixed(6)} (${cost.tokens.prompt} input + ${cost.tokens.completion} output = ${cost.tokens.total} tokens)\n`);
    
    // Step 9: Extract cards from response (removes reasoning/analysis)
    const cards = extractCards(response);
    
    if (cards.length === 0) {
        console.error('❌ No valid flashcards could be generated from the provided notes.');
        console.error('   The content may be too sparse or lack educational substance.');
        process.exit(1);
    }
    
    // Step 10: Check if we got fewer cards than requested
    if (cards.length < count) {
        console.log(`⚠️  Generated ${cards.length} flashcard(s) (requested ${count})`);
        console.log('   The notes may not contain enough distinct concepts for more cards.\n');
    } else {
        console.log(`✅ Generated ${cards.length} flashcard(s):\n`);
    }
    
    // Display the extracted flashcards
    cards.forEach((card) => {
        console.log(card);
        console.log(); // blank line between cards
    });
    
    if (cards.length < count) {
        console.log('💡 Tip: To generate more flashcards, either:');
        console.log('   1. Provide more comprehensive notes with additional concepts');
        console.log(`   2. Request fewer flashcards (--count ${cards.length})\n`);
    }
    
    console.log('✅ Flashcards generated successfully!');
}

// Start the application
main();