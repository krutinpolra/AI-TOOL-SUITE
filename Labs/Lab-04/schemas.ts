/**
 * Flashcard Schema Definitions
 * 
 * This file defines the Zod schemas for flashcard generation using structured outputs.
 * These schemas serve as a contract between our application and the LLM, ensuring
 * the AI returns valid JSON that matches our expected format.
 * 
 * Key Benefits:
 * - Runtime type validation (not just compile-time)
 * - Automatic TypeScript type inference from schemas
 * - Clear descriptions guide the LLM's output
 * - Eliminates need for fragile regex parsing
 */

import { z } from 'zod';

/**
 * Schema for a single SQR (Scenario, Question, Response) flashcard
 * 
 * This schema defines the structure of each flashcard, including all required fields
 * and their descriptions. The descriptions help guide the LLM to produce appropriate content.
 */
export const FlashcardSchema = z.object({
  scenario: z.string().describe(
    'A 1-2 sentence realistic, specific situation with concrete details where this concept applies'
  ),
  question: z.string().describe(
    'A focused question testing understanding (not memorization), with all acronyms fully expanded on first use'
  ),
  response: z.string().describe(
    'A clear 2-3 sentence explanation (not a list) that answers the question based on the notes'
  ),
  reference: z.string().describe(
    'A direct, verbatim quote from the source notes that supports this flashcard'
  ),
  why_it_matters: z.string().describe(
    'One sentence explaining the practical importance or consequence of understanding this concept'
  ),
  common_mistake: z.string().describe(
    'A specific, believable quote in first person of what a confused student might say'
  ),
});

/**
 * Schema for the complete API response containing multiple flashcards
 * 
 * This is the top-level schema that the LLM must adhere to when generating output.
 * It contains an array of flashcards, ensuring the response structure is consistent.
 */
export const FlashcardsResponseSchema = z.object({
  flashcards: z.array(FlashcardSchema).describe(
    'An array of flashcard objects generated from the provided notes'
  ),
});

// TypeScript type inference from schemas
// These types are automatically derived from the Zod schemas above
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type FlashcardsResponse = z.infer<typeof FlashcardsResponseSchema>;
