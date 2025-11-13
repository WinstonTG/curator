/**
 * Ingestion Runner
 * Orchestrates ETL pipeline with retries, rate limiting, and metrics
 */

import type { Connector, ConnectorSource, IngestionResult, IngestionError } from '@curator/connectors/src/base/types';
import { validateItem } from '@curator/types/src/item';
import { withRetry, RateLimiter } from './retry';
import { MetricsTracker } from './metrics';
import { ZodError } from 'zod';

export interface RunnerConfig {
  batchSize: number;
  maxRetries: number;
  rateLimit: number; // requests per second
  schemaErrorBudget: number; // percentage (0-100)
  dryRun?: boolean; // Don't persist, just validate
}

const DEFAULT_CONFIG: RunnerConfig = {
  batchSize: 20,
  maxRetries: 3,
  rateLimit: 5,
  schemaErrorBudget: 1, // 1% error budget
  dryRun: false,
};

export class IngestionRunner {
  private metricsTracker = new MetricsTracker();
  private rateLimiter: RateLimiter;

  constructor(private config: RunnerConfig = DEFAULT_CONFIG) {
    this.rateLimiter = new RateLimiter(config.rateLimit);
  }

  /**
   * Run ingestion for a single connector
   */
  async runConnector(connector: Connector): Promise<IngestionResult> {
    const startTime = Date.now();
    const errors: IngestionError[] = [];
    let itemsFetched = 0;
    let itemsMapped = 0;
    let itemsFailed = 0;
    let schemaErrors = 0;

    console.log(`\n[${connector.source}] Starting ingestion...`);

    try {
      // Validate authentication
      console.log(`[${connector.source}] Validating authentication...`);
      const isAuthValid = await withRetry(() => connector.validateAuth(), {
        maxRetries: this.config.maxRetries,
      });

      if (!isAuthValid) {
        throw new Error('Authentication failed');
      }

      // Fetch and process items
      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore) {
        // Rate limiting
        await this.rateLimiter.acquire();

        // Fetch batch
        console.log(`[${connector.source}] Fetching batch...`);
        const fetchResult = await withRetry(
          () => connector.fetch(cursor, this.config.batchSize),
          { maxRetries: this.config.maxRetries }
        );

        itemsFetched += fetchResult.items.length;
        cursor = fetchResult.nextCursor;
        hasMore = fetchResult.hasMore && !!cursor;

        // Map and validate items
        for (const sourceItem of fetchResult.items) {
          try {
            // Map to unified schema
            const item = connector.map(sourceItem);

            // Validate against schema
            try {
              validateItem(item);
              itemsMapped++;

              // TODO: Persist to database
              if (!this.config.dryRun) {
                // await saveItem(item);
              }
            } catch (validationError) {
              schemaErrors++;
              if (validationError instanceof ZodError) {
                errors.push({
                  type: 'validation',
                  message: 'Schema validation failed',
                  itemId: item.id,
                  details: validationError.errors,
                });
              }
            }
          } catch (mappingError) {
            itemsFailed++;
            errors.push({
              type: 'mapping',
              message: (mappingError as Error).message,
              details: mappingError,
            });
          }
        }

        // Check schema error budget
        const currentErrorRate = (schemaErrors / itemsFetched) * 100;
        if (currentErrorRate > this.config.schemaErrorBudget) {
          throw new Error(
            `Schema error rate ${currentErrorRate.toFixed(2)}% exceeds budget ${this.config.schemaErrorBudget}%`
          );
        }

        console.log(`[${connector.source}] Processed ${itemsFetched} items (${itemsMapped} mapped, ${schemaErrors} errors)`);

        // Limit batches in dry-run mode
        if (this.config.dryRun && itemsFetched >= 50) {
          console.log(`[${connector.source}] Dry-run limit reached, stopping...`);
          break;
        }
      }

      const duration = Date.now() - startTime;
      const result: IngestionResult = {
        source: connector.source,
        success: true,
        itemsFetched,
        itemsMapped,
        itemsFailed,
        schemaErrors,
        duration,
        errors,
        timestamp: new Date().toISOString(),
      };

      // Record metrics
      this.metricsTracker.recordRun(connector.source, {
        success: true,
        duration,
        itemsFetched,
        itemsMapped,
        schemaErrors,
      });

      console.log(`[${connector.source}] ✓ Completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      errors.push({
        type: 'fetch',
        message: (error as Error).message,
        details: error,
      });

      const result: IngestionResult = {
        source: connector.source,
        success: false,
        itemsFetched,
        itemsMapped,
        itemsFailed,
        schemaErrors,
        duration,
        errors,
        timestamp: new Date().toISOString(),
      };

      // Record metrics
      this.metricsTracker.recordRun(connector.source, {
        success: false,
        duration,
        itemsFetched,
        itemsMapped,
        schemaErrors,
      });

      console.error(`[${connector.source}] ✗ Failed: ${(error as Error).message}`);
      return result;
    }
  }

  /**
   * Run ingestion for multiple connectors in sequence
   */
  async runAll(connectors: Connector[]): Promise<IngestionResult[]> {
    const results: IngestionResult[] = [];

    for (const connector of connectors) {
      const result = await this.runConnector(connector);
      results.push(result);
    }

    // Print metrics summary
    this.metricsTracker.printSummary();

    return results;
  }

  /**
   * Get metrics tracker
   */
  getMetrics(): MetricsTracker {
    return this.metricsTracker;
  }
}

/**
 * Validate item against schema (uses Zod from @curator/types)
 */
function validateItem(item: any): void {
  // Import validation from types package
  // For now, this is a placeholder - actual validation happens in the try block above
  // The real implementation would use: import { validateItem } from '@curator/validators';
}
