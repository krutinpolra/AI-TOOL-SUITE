/**
 * Flashcard Generator Module
 * 
 * This module handles AI-powered flashcard generation using OpenAI's structured outputs.
 * Instead of relying on prompt engineering and regex parsing (Lab 2 approach), we use
 * Zod schemas to guarantee valid JSON responses that match our expected format.
 * 
 * Key improvements over Lab 2:
 * - Guaranteed valid JSON output (no parsing errors)
 * - Type-safe responses with automatic TypeScript inference
 * - Cost tracking for monitoring API spending
 * - Cleaner error handling
 */

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Import our Zod schemas and types
import { FlashcardsResponseSchema, type FlashcardsResponse } from './schemas.js';

// Get current directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root directory (two levels up from Labs/Lab-04)
const rootDir = join(__dirname, '..', '..');
dotenv.config({ path: join(rootDir, '.env') });

/**
 * Logs cost information for an OpenAI API call
 * Helps track spending across different models and requests
 */
function logCostInfo(completion: OpenAI.Chat.Completions.ChatCompletion, modelId: string): void {
  const usage = completion.usage;
  
  if (!usage) {
    console.log('⚠️  No usage information available');
    return;
  }

  console.log('\n💰 Cost Information:');
  console.log(`   Model: ${modelId}`);
  console.log(`   Prompt tokens: ${usage.prompt_tokens.toLocaleString()}`);
  console.log(`   Completion tokens: ${usage.completion_tokens.toLocaleString()}`);
  console.log(`   Total tokens: ${usage.total_tokens.toLocaleString()}`);
  
  // Note: Actual cost calculation would require pricing info from OpenRouter
  // For now, we just log token counts for manual cost tracking
  console.log('   💡 Check OpenRouter dashboard for exact costs\n');
}

/**
 * Generates flashcards from course notes using AI structured outputs
 * 
 * @param notes - The raw text of the course notes to convert into flashcards
 * @param count - The number of flashcards to generate (default: 3)
 * @returns A Promise resolving to the structured flashcards response
 * @throws Error if API call fails or response is invalid
 * 
 * @example
 * ```typescript
 * const notes = "React Hooks allow you to use state in function components...";
 * const result = await generateFlashcards(notes, 5);
 * console.log(result.flashcards); // Array of 5 flashcard objects
 * ```
 */
export async function generateFlashcards(
  notes: string,
  count: number = 3
): Promise<FlashcardsResponse> {
  try {
    // Load system prompt from INSTRUCTIONS.md
    const instructionsPath = join(__dirname, 'INSTRUCTIONS.md');
    const systemPrompt = await readFile(instructionsPath, 'utf-8');

    // Initialize OpenAI client with OpenRouter configuration
    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000', // Optional: for OpenRouter analytics
        'X-Title': 'Flashcard Generator API', // Optional: app name in OpenRouter dashboard
      },
    });

    // Choose a model that supports structured outputs
    // Start with a cost-effective option and experiment with others
    const modelId = 'openai/gpt-4o-mini'; // Good balance of cost and quality
    
    console.log(`\n🤖 Generating ${count} flashcards using ${modelId}...`);

    // Call OpenAI API with structured output enforcement
    // The .parse() method automatically validates the response against our schema
    const completion = await openai.chat.completions.create({
      model: modelId,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Generate exactly ${count} flashcards from these notes:\n\n<course_notes>\n${notes}\n</course_notes>`,
        },
      ],
      // Use structured outputs with our Zod schema
      // This forces the LLM to return valid JSON matching FlashcardsResponseSchema
      response_format: zodResponseFormat(
        FlashcardsResponseSchema,
        'flashcards_response' // Name for the schema (required by OpenAI)
      ),
      temperature: 0.7, // Balanced creativity and consistency
    });

    // Log cost information for tracking
    logCostInfo(completion, modelId);

    // Extract the AI's response
    const message = completion.choices[0]?.message;

    if (!message) {
      throw new Error('No response from AI model');
    }

    // Parse the content as JSON
    // With structured outputs, this should always be valid JSON matching our schema
    const parsedContent = JSON.parse(message.content || '{}');
    
    // Validate against our schema to ensure type safety
    const result = FlashcardsResponseSchema.parse(parsedContent);

    console.log(`✅ Successfully generated ${result.flashcards.length} flashcards`);

    return result;

  } catch (error) {
    // Provide detailed error information for debugging
    if (error instanceof Error) {
      console.error('❌ Error generating flashcards:', error.message);
      throw new Error(`Flashcard generation failed: ${error.message}`);
    }
    throw error;
  }
}
