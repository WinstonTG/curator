/**
 * Base types for all connectors
 */

import type { Item } from '@curator/types/src/item';

/**
 * Connector source identifiers
 */
export type ConnectorSource = 'spotify' | 'news' | 'youtube' | 'spoonacular' | 'eventbrite';

/**
 * Connector configuration
 */
export interface ConnectorConfig {
  source: ConnectorSource;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  rateLimit?: {
    requestsPerSecond: number;
    requestsPerDay?: number;
  };
  timeout?: number; // milliseconds
}

/**
 * Fetch result with pagination support
 */
export interface FetchResult<T = any> {
  items: T[];
  nextCursor?: string;
  total?: number;
  hasMore: boolean;
}

/**
 * Ingestion result
 */
export interface IngestionResult {
  source: ConnectorSource;
  success: boolean;
  itemsFetched: number;
  itemsMapped: number;
  itemsFailed: number;
  schemaErrors: number;
  duration: number; // milliseconds
  errors: IngestionError[];
  timestamp: string; // ISO 8601
}

/**
 * Ingestion error
 */
export interface IngestionError {
  type: 'fetch' | 'mapping' | 'validation' | 'network' | 'auth' | 'rate_limit';
  message: string;
  itemId?: string;
  details?: any;
}

/**
 * Base connector interface
 * All source-specific connectors must implement this
 */
export interface Connector<TSourceItem = any> {
  /** Connector source identifier */
  readonly source: ConnectorSource;

  /** Connector configuration */
  readonly config: ConnectorConfig;

  /**
   * Fetch items from the external source
   * @param cursor Optional pagination cursor
   * @param limit Maximum number of items to fetch
   */
  fetch(cursor?: string, limit?: number): Promise<FetchResult<TSourceItem>>;

  /**
   * Map source-specific item to unified Item schema
   * @param sourceItem Raw item from external API
   */
  map(sourceItem: TSourceItem): Item;

  /**
   * Validate API credentials
   */
  validateAuth(): Promise<boolean>;

  /**
   * Get connector health status
   */
  getHealth(): Promise<ConnectorHealth>;
}

/**
 * Connector health status
 */
export interface ConnectorHealth {
  source: ConnectorSource;
  healthy: boolean;
  lastCheck: string; // ISO 8601
  latency?: number; // milliseconds
  errorRate?: number; // 0-1
  details?: string;
}
