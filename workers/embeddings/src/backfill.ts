#!/usr/bin/env tsx
/**
 * Backfill Script for Existing Items
 * Generates embeddings for items that don't have them yet
 */

import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';
import { EmbeddingQueue } from './queue';
import { getProviderFromEnv } from './providers';

loadEnv();

const prisma = new PrismaClient();
const queue = new EmbeddingQueue();
const provider = getProviderFromEnv();

interface BackfillOptions {
  domain?: string;
  batchSize?: number;
  limit?: number;
  dryRun?: boolean;
  immediate?: boolean; // Generate embeddings immediately vs queue
}

/**
 * Get embedding text for an item
 */
function getEmbeddingText(item: any): string {
  const parts: string[] = [];

  // Title
  if (item.title) parts.push(item.title);

  // Description
  if (item.description) parts.push(item.description);

  // Topics
  if (item.topics && Array.isArray(item.topics)) {
    parts.push(item.topics.join(' '));
  }

  // Domain-specific metadata
  if (item.meta) {
    const meta = typeof item.meta === 'string' ? JSON.parse(item.meta) : item.meta;

    // Add relevant metadata fields based on domain
    switch (item.domain) {
      case 'music':
        if (meta.artists) parts.push(meta.artists.join(' '));
        if (meta.album) parts.push(meta.album);
        if (meta.genres) parts.push(meta.genres.join(' '));
        break;
      case 'news':
        if (meta.author) parts.push(meta.author);
        if (meta.publication) parts.push(meta.publication);
        if (meta.category) parts.push(meta.category);
        break;
      case 'recipes':
        if (meta.cuisine) parts.push(meta.cuisine.join(' '));
        if (meta.dietary) parts.push(meta.dietary.join(' '));
        break;
      case 'learning':
        if (meta.instructor) parts.push(meta.instructor);
        if (meta.skills) parts.push(meta.skills.join(' '));
        break;
      case 'events':
        if (meta.organizer) parts.push(meta.organizer);
        if (meta.venue) parts.push(meta.venue);
        break;
    }
  }

  return parts.join(' ');
}

/**
 * Backfill embeddings for items without them
 */
async function backfill(options: BackfillOptions = {}): Promise<void> {
  const {
    domain,
    batchSize = 100,
    limit,
    dryRun = false,
    immediate = false,
  } = options;

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         Embeddings Backfill Script                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Get items without embeddings
  console.log('📊 Fetching items without embeddings...');

  const whereClause: any = {
    embeddings: null,
  };

  if (domain) {
    whereClause.domain = domain;
  }

  const items = await prisma.item.findMany({
    where: whereClause,
    select: {
      id: true,
      domain: true,
      title: true,
      description: true,
      topics: true,
      meta: true,
    },
    take: limit,
  });

  console.log(`   Found ${items.length} items`);

  if (items.length === 0) {
    console.log('\n✨ All items already have embeddings!');
    return;
  }

  if (domain) {
    console.log(`   Domain filter: ${domain}`);
  }

  console.log(`   Mode: ${immediate ? 'Immediate' : 'Queued'}`);
  console.log('');

  let processed = 0;
  let failed = 0;

  if (immediate) {
    // Process in batches immediately
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
      console.log(`   Items: ${i + 1}-${Math.min(i + batchSize, items.length)} of ${items.length}`);

      try {
        // Generate texts
        const texts = batch.map(item => getEmbeddingText(item));

        if (!dryRun) {
          // Generate embeddings
          const result = await provider.embedBatch(texts);

          // Update database
          for (let j = 0; j < batch.length; j++) {
            const item = batch[j];
            const embedding = result.embeddings[j];

            try {
              await prisma.item.update({
                where: { id: item.id },
                data: {
                  embeddings: embedding,
                  updated_at: new Date(),
                },
              });

              processed++;
              console.log(`   ✓ ${item.title.substring(0, 50)}...`);
            } catch (error) {
              failed++;
              console.error(`   ✗ ${item.id}: ${(error as Error).message}`);
            }
          }

          if (result.totalTokens) {
            console.log(`   Tokens: ${result.totalTokens}`);
          }
        } else {
          processed += batch.length;
          console.log(`   Would process ${batch.length} items`);
        }
      } catch (error) {
        console.error(`   Batch failed: ${(error as Error).message}`);
        failed += batch.length;
      }

      // Small delay between batches
      if (!dryRun && i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } else {
    // Queue items for processing
    console.log('📤 Queueing items for processing...\n');

    const jobs = items.map(item => ({
      itemId: item.id,
      text: getEmbeddingText(item),
      domain: item.domain,
      priority: 'normal' as const,
    }));

    if (!dryRun) {
      await queue.enqueueBatch(jobs);
      processed = jobs.length;
      console.log(`   ✓ Queued ${jobs.length} jobs`);
    } else {
      console.log(`   Would queue ${jobs.length} jobs`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📈 Summary:');
  console.log(`   Processed: ${processed}`);
  if (failed > 0) {
    console.log(`   Failed: ${failed}`);
  }
  console.log('');
}

// Main
async function main() {
  const args = process.argv.slice(2);

  const options: BackfillOptions = {
    dryRun: args.includes('--dry-run'),
    immediate: args.includes('--immediate'),
  };

  // Parse domain
  const domainArg = args.find(arg => arg.startsWith('--domain='));
  if (domainArg) {
    options.domain = domainArg.split('=')[1];
  }

  // Parse limit
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  if (limitArg) {
    options.limit = parseInt(limitArg.split('=')[1]);
  }

  // Parse batch size
  const batchArg = args.find(arg => arg.startsWith('--batch='));
  if (batchArg) {
    options.batchSize = parseInt(batchArg.split('=')[1]);
  }

  try {
    await backfill(options);
  } catch (error) {
    console.error('\n❌ Error:', (error as Error).message);
    process.exit(1);
  } finally {
    await queue.close();
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { backfill, getEmbeddingText };
