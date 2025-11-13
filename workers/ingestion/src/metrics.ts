/**
 * Ingestion metrics tracking
 */

export interface IngestionMetrics {
  source: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalItemsFetched: number;
  totalItemsMapped: number;
  totalSchemaErrors: number;
  schemaErrorRate: number; // 0-1
  averageDuration: number; // milliseconds
  lastRun?: {
    timestamp: string;
    success: boolean;
    duration: number;
    itemsFetched: number;
  };
}

export class MetricsTracker {
  private metrics: Map<string, IngestionMetrics> = new Map();

  /**
   * Record a run result
   */
  recordRun(source: string, result: {
    success: boolean;
    duration: number;
    itemsFetched: number;
    itemsMapped: number;
    schemaErrors: number;
  }): void {
    const existing = this.metrics.get(source) || {
      source,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalItemsFetched: 0,
      totalItemsMapped: 0,
      totalSchemaErrors: 0,
      schemaErrorRate: 0,
      averageDuration: 0,
    };

    existing.totalRuns++;
    if (result.success) {
      existing.successfulRuns++;
    } else {
      existing.failedRuns++;
    }

    existing.totalItemsFetched += result.itemsFetched;
    existing.totalItemsMapped += result.itemsMapped;
    existing.totalSchemaErrors += result.schemaErrors;

    // Update schema error rate
    existing.schemaErrorRate = existing.totalItemsFetched > 0
      ? existing.totalSchemaErrors / existing.totalItemsFetched
      : 0;

    // Update average duration
    existing.averageDuration = (existing.averageDuration * (existing.totalRuns - 1) + result.duration) / existing.totalRuns;

    existing.lastRun = {
      timestamp: new Date().toISOString(),
      success: result.success,
      duration: result.duration,
      itemsFetched: result.itemsFetched,
    };

    this.metrics.set(source, existing);
  }

  /**
   * Get metrics for a source
   */
  getMetrics(source: string): IngestionMetrics | undefined {
    return this.metrics.get(source);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): IngestionMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Check if schema error rate is within budget
   */
  isWithinErrorBudget(source: string, budgetPercentage: number = 1): boolean {
    const metrics = this.metrics.get(source);
    if (!metrics) return true;

    return metrics.schemaErrorRate <= budgetPercentage / 100;
  }

  /**
   * Print metrics summary
   */
  printSummary(): void {
    console.log('\n=== Ingestion Metrics Summary ===\n');
    this.getAllMetrics().forEach(m => {
      console.log(`${m.source}:`);
      console.log(`  Runs: ${m.successfulRuns}/${m.totalRuns} successful`);
      console.log(`  Items: ${m.totalItemsMapped}/${m.totalItemsFetched} mapped`);
      console.log(`  Schema Error Rate: ${(m.schemaErrorRate * 100).toFixed(2)}%`);
      console.log(`  Avg Duration: ${m.averageDuration.toFixed(0)}ms`);
      if (m.lastRun) {
        console.log(`  Last Run: ${m.lastRun.timestamp} (${m.lastRun.success ? 'SUCCESS' : 'FAILED'})`);
      }
      console.log('');
    });
  }
}
