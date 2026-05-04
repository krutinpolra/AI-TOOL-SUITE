/**
 * Test Client for Flashcard Generator API
 * 
 * This script tests the flashcard generation API by:
 * 1. Reading course notes from a markdown file
 * 2. Sending a POST request to the server
 * 3. Displaying the structured JSON response
 * 
 * Usage: node test-client.js
 * 
 * Prerequisites:
 * - Server must be running (npm run dev in another terminal)
 * - notes.md file must exist with course content
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Path to the test notes file
const notesPath = 'notes.md';

// API endpoint configuration
const API_URL = 'http://localhost:3000/api/generate';

/**
 * Parse command-line arguments
 * Supports: --count=5 or --count 5
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let count = 3; // Default count
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Handle --count=5 format
    if (arg.startsWith('--count=')) {
      const value = parseInt(arg.split('=')[1]);
      if (!isNaN(value) && value > 0) {
        count = value;
      }
    }
    // Handle --count 5 format
    else if (arg === '--count' && i + 1 < args.length) {
      const value = parseInt(args[i + 1]);
      if (!isNaN(value) && value > 0) {
        count = value;
      }
    }
    // Handle --help
    else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node test-client.js [options]

Options:
  --count <number>    Number of flashcards to generate (default: 3)
  --count=<number>    Alternative syntax for count
  --help, -h          Show this help message

Examples:
  node test-client.js                  # Generate 3 flashcards (default)
  node test-client.js --count 5        # Generate 5 flashcards
  node test-client.js --count=10       # Generate 10 flashcards
      `);
      process.exit(0);
    }
  }
  
  return { count };
}

/**
 * Main test function
 * Reads notes, sends request, and displays results
 */
async function main() {
  try {
    // Parse command-line arguments
    const { count } = parseArgs();
    
    // 1. Read the notes file
    console.log(`📖 Reading notes from: ${notesPath}`);
    const notesContent = await readFile(notesPath, 'utf-8');
    
    console.log(`   Content length: ${notesContent.length} characters`);
    console.log(`   Estimated lines: ${notesContent.split('\n').length}`);

    // 2. Prepare the request payload
    const payload = {
      notes: notesContent,
      count: count, // Use count from command-line args
    };

    console.log(`\n⚡ Sending request to ${API_URL}...`);
    console.log(`   Requesting ${payload.count} flashcard${payload.count !== 1 ? 's' : ''}`);
    
    const startTime = performance.now();

    // 3. Send POST request to the API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Request completed in ${duration}s`);

    // 4. Handle the response
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // 5. Display the results
    console.log('\n✅ Success! Received Structured Flashcards:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(80));

    // 6. Display summary and formatted flashcards
    if (data.flashcards && Array.isArray(data.flashcards)) {
      console.log(`\n📊 Summary: Generated ${data.flashcards.length} flashcards\n`);
      
      // Display each flashcard in a readable, complete format
      console.log('📚 FORMATTED FLASHCARDS:\n');
      data.flashcards.forEach((card, index) => {
        console.log('═'.repeat(80));
        console.log(`\n🎴 FLASHCARD ${index + 1}\n`);
        console.log('─'.repeat(80));
        
        console.log('📍 SCENARIO:');
        console.log(`   ${card.scenario}\n`);
        
        console.log('❓ QUESTION:');
        console.log(`   ${card.question}\n`);
        
        console.log('✅ RESPONSE:');
        console.log(`   ${card.response}\n`);
        
        console.log('📖 REFERENCE:');
        console.log(`   "${card.reference}"\n`);
        
        console.log('💡 WHY IT MATTERS:');
        console.log(`   ${card.why_it_matters}\n`);
        
        console.log('⚠️  COMMON MISTAKE:');
        console.log(`   "${card.common_mistake}"\n`);
      });
      console.log('═'.repeat(80));
    }

    console.log('\n✨ Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error occurred:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(`   ${error}`);
    }
    
    // Provide helpful debugging hints
    console.log('\n💡 Troubleshooting tips:');
    console.log('   - Is the server running? (npm run dev)');
    console.log('   - Does notes.md exist?');
    console.log('   - Is OPENROUTER_API_KEY set in .env?');
    console.log('   - Check server terminal for error messages\n');
    
    process.exit(1);
  }
}

// Run the test
main();
