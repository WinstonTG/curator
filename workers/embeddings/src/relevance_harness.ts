#!/usr/bin/env tsx
/**
 * K-NN Relevance Check Harness
 * Tests embedding quality by comparing query vs corpus
 */

import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';
import { getProviderFromEnv } from './providers';

loadEnv();

const prisma = new PrismaClient();
const provider = getProviderFromEnv();

interface SearchResult {
  id: string;
  title: string;
  domain: string;
  similarity: number;
}

/**
 * Search for similar items using K-NN
 */
async function searchSimilar(
  queryText: string,
  options: {
    domain?: string;
    limit?: number;
  } = {}
): Promise<SearchResult[]> {
  const { domain, limit = 5 } = options;

  // Generate query embedding
  console.log(`\n🔍 Query: "${queryText}"`);
  console.log('   Generating embedding...');

  const result = await provider.embed(queryText);
  const queryEmbedding = result.embedding;

  // Search using pgvector
  console.log('   Searching database...\n');

  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
      id,
      title,
      domain,
      1 - (embeddings <=> ${queryEmbedding}::vector) AS similarity
    FROM items
    WHERE
      embeddings IS NOT NULL
      ${domain ? prisma.$queryRawUnsafe`AND domain = ${domain}`) : ''}
    ORDER BY embeddings <=> ${queryEmbedding}::vector
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Print search results
 */
function printResults(results: SearchResult[]): void {
  if (results.length === 0) {
    console.log('   No results found.\n');
    return;
  }

  console.log('📊 Top Results:\n');

  results.forEach((result, index) => {
    const similarityPercent = (result.similarity * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(result.similarity * 20));

    console.log(`${index + 1}. [${similarityPercent}%] ${bar}`);
    console.log(`   ${result.title}`);
    console.log(`   Domain: ${result.domain} | ID: ${result.id}`);
    console.log('');
  });
}

/**
 * Run relevance checks with predefined queries
 */
async function runRelevanceChecks(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         K-NN Relevance Check Harness                  ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const queries = [
    {
      text: 'upbeat electronic music for working out',
      domain: 'music',
    },
    {
      text: 'artificial intelligence and machine learning news',
      domain: 'news',
    },
    {
      text: 'vegetarian italian pasta recipes',
      domain: 'recipes',
    },
    {
      text: 'python programming tutorial for beginners',
      domain: 'learning',
    },
    {
      text: 'technology conferences in San Francisco',
      domain: 'events',
    },
    {
      text: 'climate change and sustainability', // Cross-domain
    },
  ];

  for (const query of queries) {
    try {
      const results = await searchSimilar(query.text, {
        domain: query.domain,
        limit: 5,
      });

      printResults(results);
    } catch (error) {
      console.error(`Error processing query: ${(error as Error).message}\n`);
    }

    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Interactive search mode
 */
async function interactiveMode(): Promise<void> {
  const readline = await import('readline/promises');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n🔎 Interactive Search Mode');
  console.log('   Type your query and press Enter (or "exit" to quit)\n');

  while (true) {
    const query = await rl.question('Query: ');

    if (query.toLowerCase() === 'exit') {
      rl.close();
      break;
    }

    if (!query.trim()) {
      continue;
    }

    try {
      const results = await searchSimilar(query, { limit: 5 });
      printResults(results);
    } catch (error) {
      console.error(`Error: ${(error as Error).message}\n`);
    }
  }
}

/**
 * Check corpus statistics
 */
async function checkCorpus(): Promise<void> {
  console.log('\n📚 Corpus Statistics:\n');

  const totalItems = await prisma.item.count();
  const itemsWithEmbeddings = await prisma.item.count({
    where: {
      embeddings: { not: null },
    },
  });

  const byDomain = await prisma.$queryRaw<Array<{ domain: string; count: bigint }>>`
    SELECT domain, COUNT(*) as count
    FROM items
    WHERE embeddings IS NOT NULL
    GROUP BY domain
    ORDER BY count DESC
  `;

  console.log(`   Total items: ${totalItems}`);
  console.log(`   Items with embeddings: ${itemsWithEmbeddings}`);
  console.log(`   Coverage: ${((itemsWithEmbeddings / totalItems) * 100).toFixed(1)}%`);
  console.log('\n   By domain:');

  byDomain.forEach(({ domain, count }) => {
    console.log(`   - ${domain}: ${count}`);
  });

  console.log('');
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'check';

  try {
    if (mode === 'interactive') {
      await interactiveMode();
    } else if (mode === 'stats') {
      await checkCorpus();
    } else {
      await checkCorpus();
      await runRelevanceChecks();
    }
  } catch (error) {
    console.error('\n❌ Error:', (error as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { searchSimilar, printResults, checkCorpus };
