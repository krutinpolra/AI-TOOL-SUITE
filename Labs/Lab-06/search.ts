import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as readline from 'readline';
import { loadDatabase, searchProducts } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

async function main() {
  console.log('Loading product database...');
  const products = await loadDatabase();
  console.log(`Loaded ${products.length} products.\n`);
  console.log('Welcome to the Semantic Product Search Engine!');
  console.log('Type "exit" to quit.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  while (true) {
    const query = (await ask('What are you looking for?\n> ')).trim();

    if (query.toLowerCase() === 'exit') {
      console.log('Goodbye!');
      rl.close();
      break;
    }

    if (!query) continue;

    console.log('\nSearching...');
    const results = await searchProducts(query, products);

    if (results.length === 0) {
      console.log("I'm sorry, we don't have anything like that in stock.\n");
    } else {
      console.log(`\nFound ${results.length} match${results.length !== 1 ? 'es' : ''}:`);
      results.forEach((product, i) => {
        console.log(
          `${i + 1}. [Score: ${product.score.toFixed(2)}] ${product.title} - $${product.price}`
        );
      });
      console.log('');
    }
  }
}

main().catch(console.error);
