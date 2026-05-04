/**
 * Flashcard Generator API Server
 * 
 * This HTTP API server accepts course notes as input and generates study flashcards
 * using AI-powered structured outputs. Built with Hono (a lightweight Express-like
 * framework) and Zod for schema validation.
 * 
 * Key features:
 * - RESTful API endpoint for flashcard generation
 * - Request validation using Zod schemas
 * - CORS support for cross-origin requests (e.g., from frontend apps)
 * - Request logging and timing middleware for monitoring
 * - Structured error handling with detailed error messages
 * 
 * Architecture:
 * - Framework: Hono (fast, lightweight, Express-like API)
 * - Validation: Zod (runtime type checking and schema validation)
 * - AI Integration: OpenAI SDK with structured outputs (zodResponseFormat)
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { timing } from 'hono/timing';
import { logger } from 'hono/logger';
import { zValidator } from '@hono/zod-validator';
import * as z from 'zod';

// Import our flashcard generation logic (to be implemented)
import { generateFlashcards } from './flashcard-generator.js';

// Initialize Hono app instance
// Hono is similar to Express but more modern, with better TypeScript support
const app = new Hono();

// Middleware Pipeline:
// These run before route handlers and add cross-cutting functionality

// logger(): Logs each HTTP request (method, path, status, response time)
// timing(): Adds Server-Timing header to measure request duration
app.use(logger(), timing());

// cors(): Enables Cross-Origin Resource Sharing for all /api/* routes
// This allows frontend apps (web/mobile) running on different domains to call our API
app.use('/api/*', cors());

// Request Schema Definition:
// Using Zod to define the shape and validation rules for incoming requests
// This ensures type safety at runtime, not just compile time
const generateSchema = z.object({
  notes: z.string().min(1, "Field 'notes' is required."), // Required: course notes text
  count: z.number().optional().default(3), // Optional: number of flashcards (defaults to 3)
});

/**
 * POST /api/generate
 * 
 * Generates flashcards from course notes using AI structured outputs.
 * 
 * Request body (JSON):
 *   - notes: string (required) - The course notes to convert into flashcards
 *   - count: number (optional, default: 3) - Number of flashcards to generate
 * 
 * Response (JSON):
 *   - On success: Returns the result from generateFlashcards (flashcards array + metadata)
 *   - On error: Returns { error: string, details: string } with 500 status
 * 
 * Middleware chain:
 *   1. zValidator validates request body against generateSchema
 *   2. If validation fails, automatically returns 400 error
 *   3. If validation passes, handler executes with validated data
 */
app.post('/api/generate', zValidator('json', generateSchema), async (c) => {
  try {
    // Extract validated data using c.req.valid('json')
    // This is type-safe thanks to Zod - TypeScript knows the exact shape
    const { notes, count } = await c.req.valid('json');
    
    // Call our AI flashcard generation function
    const result = await generateFlashcards(notes, count);

    // Return successful result as JSON (200 status by default)
    return c.json(result);
  } catch (error: any) {
    // Log the error for debugging and monitoring
    console.error('Server Error:', error);
    
    // Return user-friendly error response with 500 Internal Server Error status
    // Include error details to help with debugging (in production, be careful with exposing details)
    return c.json(
      {
        error: 'Failed to generate flashcards.',
        details: error.message,
      },
      500
    );
  }
});

// Server Configuration
const port = 3000;
console.log(`🚀 Server running on http://localhost:${port}`);

// Start the HTTP server
// Hono's fetch handler is compatible with Node.js server adapter
serve({
  fetch: app.fetch, // Hono's request handler
  port, // Port to listen on
});
