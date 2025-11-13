#!/usr/bin/env node
/**
 * Connectors CLI
 * Usage: pnpm connectors:sync --source=spotify|news|youtube|spoonacular|eventbrite|all
 */

import { config as loadEnv } from 'dotenv';
import { createConnector } from './index';
import type { ConnectorSource } from './base/types';
import { IngestionRunner } from '../../workers/ingestion/src/runner';

// Load environment variables
loadEnv();

const SOURCES: ConnectorSource[] = ['spotify', 'news', 'youtube', 'spoonacular', 'eventbrite'];

async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find(arg => arg.startsWith('--source='));
  const dryRun = args.includes('--dry-run');

  if (!sourceArg) {
    console.error('Error: --source parameter is required');
    console.log('Usage: pnpm connectors:sync --source=<source> [--dry-run]');
    console.log(`Available sources: ${SOURCES.join(', ')}, all`);
    process.exit(1);
  }

  const sourceName = sourceArg.split('=')[1];
  const sources = sourceName === 'all' ? SOURCES : [sourceName as ConnectorSource];

  // Validate sources
  for (const source of sources) {
    if (!SOURCES.includes(source)) {
      console.error(`Error: Invalid source "${source}"`);
      console.log(`Available sources: ${SOURCES.join(', ')}, all`);
      process.exit(1);
    }
  }

  console.log(`🚀 Starting ingestion for: ${sources.join(', ')}`);
  if (dryRun) {
    console.log('📝 DRY-RUN MODE: No data will be persisted');
  }

  // Create connectors
  const connectors = sources.map(source => {
    const config = getConnectorConfig(source);
    return createConnector(source, config);
  });

  // Run ingestion
  const runner = new IngestionRunner({
    batchSize: 20,
    maxRetries: 3,
    rateLimit: 5,
    schemaErrorBudget: 1,
    dryRun,
  });

  try {
    const results = await runner.runAll(connectors);

    // Print results
    const successful = results.filter(r => r.success).length;
    const total = results.length;

    console.log(`\n✨ Ingestion completed: ${successful}/${total} sources successful\n`);

    // Exit with error if any failed
    if (successful < total) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Ingestion failed:', (error as Error).message);
    process.exit(1);
  }
}

/**
 * Get connector configuration from environment
 */
function getConnectorConfig(source: ConnectorSource) {
  switch (source) {
    case 'spotify':
      return {
        source,
        apiKey: process.env.SPOTIFY_CLIENT_ID,
        apiSecret: process.env.SPOTIFY_CLIENT_SECRET,
        timeout: 10000,
      };
    case 'news':
      return {
        source,
        apiKey: process.env.NEWS_API_KEY,
        timeout: 10000,
      };
    case 'youtube':
      return {
        source,
        apiKey: process.env.YOUTUBE_API_KEY,
        timeout: 10000,
      };
    case 'spoonacular':
      return {
        source,
        apiKey: process.env.SPOONACULAR_API_KEY,
        timeout: 10000,
      };
    case 'eventbrite':
      return {
        source,
        apiKey: process.env.EVENTBRITE_TOKEN,
        timeout: 10000,
      };
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

main();
