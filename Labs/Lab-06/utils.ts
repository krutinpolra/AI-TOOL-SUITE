import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// ─── Serialization ────────────────────────────────────────────────────────────

export function serializeProduct(product: any): string {
  const tags = Array.isArray(product.tags) ? product.tags.join(', ') : product.tags ?? '';
  return [
    `Title: ${product.title}`,
    `Category: ${product.category}`,
    `Description: ${product.description}`,
    `Tags: ${tags}`,
    `Brand: ${product.brand ?? 'N/A'}`,
  ].join(' | ');
}

// ─── Math ─────────────────────────────────────────────────────────────────────

export function dotProduct(vecA: number[], vecB: number[]): number {
  return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
}

// ─── Embedding ────────────────────────────────────────────────────────────────

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await client.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: texts,
  });
  // Sort by index to guarantee order matches input
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

// ─── Database ─────────────────────────────────────────────────────────────────

export async function loadDatabase() {
  const productsData = await readFile('products.json', 'utf-8');
  const products = JSON.parse(productsData);

  const vectorsData = await readFile('vectors.tsv', 'utf-8');
  const lines = vectorsData.trim().split('\n');

  // Index alignment: line N in vectors.tsv belongs to products[N]
  const productsWithEmbeddings = products.map((product: any, index: number) => {
    const vector = lines[index].split('\t').map(Number);
    return { ...product, embedding: vector };
  });

  return productsWithEmbeddings;
}

// ─── Search ───────────────────────────────────────────────────────────────────

// MIN_SIMILARITY_SCORE was determined by running test queries:
//   "Nice smelling scent"          → top scores ~0.55–0.65  (good match)
//   "A textbook on quantum physics" → top scores ~0.20–0.28  (bad match)
// A threshold of 0.35 sits comfortably in the gap.
const MIN_SIMILARITY_SCORE = 0.35;

export async function searchProducts(
  query: string,
  products: any[],
  minScore: number = MIN_SIMILARITY_SCORE
): Promise<any[]> {
  // 1. Embed the query
  const [queryVector] = await embedTexts([query]);

  // 2. Score every product
  const scored = products.map((product) => ({
    ...product,
    score: dotProduct(queryVector, product.embedding),
  }));

  // 3. Sort descending, 4. filter below threshold, 5. return top 5
  return scored
    .sort((a, b) => b.score - a.score)
    .filter((p) => p.score >= minScore)
    .slice(0, 5);
}
