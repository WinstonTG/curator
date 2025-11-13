/**
 * Embedding Worker
 * Consumes jobs from Redis queue and generates embeddings
 */

import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';
import { EmbeddingQueue } from './queue';
import { getProviderFromEnv } from './providers';

loadEnv();

const prisma = new PrismaClient();
const queue = new EmbeddingQueue();
const provider = getProviderFromEnv();

interface WorkerConfig {
  batchSize: number;
  pollInterval: number; // milliseconds
  maxRetries: number;
}

const DEFAULT_CONFIG: WorkerConfig = {
  batchSize: 10,
  pollInterval: 1000,
  maxRetries: 3,
};

export class EmbeddingWorker {
  private running: boolean = false;
  private config: WorkerConfig;

  constructor(config: Partial<WorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start worker
   */
  async start(): Promise<void> {
    this.running = true;
    console.log('🚀 Embedding worker started');
    console.log(`   Provider: ${process.env.EMBEDDING_PROVIDER || 'local'}`);
    console.log(`   Batch size: ${this.config.batchSize}`);
    console.log(`   Poll interval: ${this.config.pollInterval}ms\n`);

    while (this.running) {
      try {
        await this.processBatch();
      } catch (error) {
        console.error('Error processing batch:', error);
      }

      // Wait before next poll
      await this.sleep(this.config.pollInterval);
    }
  }

  /**
   * Stop worker
   */
  stop(): void {
    console.log('\n⏹ Stopping worker...');
    this.running = false;
  }

  /**
   * Process a batch of jobs
   */
  private async processBatch(): Promise<void> {
    const jobs = await queue.dequeueBatch(this.config.batchSize);

    if (jobs.length === 0) {
      return; // No jobs available
    }

    console.log(`📦 Processing batch of ${jobs.length} jobs...`);

    try {
      // Generate embeddings
      const texts = jobs.map(job => job.text);
      const result = await provider.embedBatch(texts);

      // Update database
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const embedding = result.embeddings[i];

        try {
          await prisma.item.update({
            where: { id: job.itemId },
            data: {
              embeddings: embedding,
              updated_at: new Date(),
            },
          });

          await queue.complete(job.itemId);
          console.log(`  ✓ ${job.itemId} (${job.domain})`);
        } catch (error) {
          console.error(`  ✗ ${job.itemId}: ${(error as Error).message}`);
          await queue.requeue(job);
        }
      }

      if (result.totalTokens) {
        console.log(`  Tokens used: ${result.totalTokens}`);
      }
    } catch (error) {
      console.error('Batch processing failed:', error);

      // Requeue all jobs
      for (const job of jobs) {
        await queue.requeue(job);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start worker if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = new EmbeddingWorker();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    worker.stop();
    setTimeout(async () => {
      await queue.close();
      await prisma.$disconnect();
      process.exit(0);
    }, 1000);
  });

  worker.start().catch(error => {
    console.error('Worker error:', error);
    process.exit(1);
  });
}
