import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFile } from 'fs/promises';
import { serializeProduct, embedTexts } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

// Strip tab and newline characters so TSV files don't break
function sanitize(str: string): string {
  return str.replace(/[\t\n\r]/g, ' ');
}

async function main() {
  // ── Step 1: Fetch all products ─────────────────────────────────────────────
  console.log('Fetching products from DummyJSON...');
  const res = await fetch('https://dummyjson.com/products?limit=200');
  const data = (await res.json()) as { products: any[] };
  const products = data.products;
  console.log(`Fetched ${products.length} products.`);

  // ── Step 2: Save products.json ─────────────────────────────────────────────
  await writeFile('products.json', JSON.stringify(products, null, 2), 'utf-8');
  console.log('Saved products.json');

  // ── Step 3: Serialize ──────────────────────────────────────────────────────
  const serialized = products.map(serializeProduct);

  // ── Step 4: Embed (single API call for the entire array) ───────────────────
  console.log('Generating embeddings (this may take a moment)...');
  const vectors = await embedTexts(serialized);
  console.log(`Received ${vectors.length} embeddings.`);

  // ── Step 5: Save vectors.tsv ───────────────────────────────────────────────
  // Each line = one product's embedding, values separated by tabs
  const vectorsContent = vectors.map((vec) => vec.join('\t')).join('\n');
  await writeFile('vectors.tsv', vectorsContent, 'utf-8');
  console.log('Saved vectors.tsv');

  // ── Step 6: Save metadata.tsv ──────────────────────────────────────────────
  // Header row required by TensorFlow Embedding Projector
  const metadataLines = ['Title\tCategory'];
  for (const product of products) {
    metadataLines.push(`${sanitize(product.title)}\t${sanitize(product.category)}`);
  }
  await writeFile('metadata.tsv', metadataLines.join('\n'), 'utf-8');
  console.log('Saved metadata.tsv');

  console.log('\nIndex created successfully! Run "npm run search" to start searching.');
}

main().catch(console.error);
