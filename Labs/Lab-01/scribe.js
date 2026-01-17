// Load environment variables
require('dotenv').config();

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

// Display identity header
displayHeader();

// Validate API key
const OPENROUTER_API_KEY = validateApiKey();
