/**
 * Spotify Connector Implementation
 */

import type { Connector, ConnectorConfig, FetchResult, ConnectorHealth } from '../base/types';
import type { Item } from '@curator/types/src/item';
import { SpotifyClient } from './client';
import { mapSpotifyTrack } from './mapper';
import type { SpotifyTrack } from './types';

export class SpotifyConnector implements Connector<SpotifyTrack> {
  readonly source = 'spotify' as const;
  private client: SpotifyClient;

  constructor(public readonly config: ConnectorConfig) {
    this.client = new SpotifyClient(config);
  }

  async fetch(cursor?: string, limit: number = 20): Promise<FetchResult<SpotifyTrack>> {
    const offset = cursor ? parseInt(cursor) : 0;
    return this.client.searchTracks('year:2023-2024', limit, offset);
  }

  map(sourceItem: SpotifyTrack): Item {
    return mapSpotifyTrack(sourceItem);
  }

  async validateAuth(): Promise<boolean> {
    return this.client.validateAuth();
  }

  async getHealth(): Promise<ConnectorHealth> {
    const startTime = Date.now();
    try {
      const isHealthy = await this.validateAuth();
      return {
        source: this.source,
        healthy: isHealthy,
        lastCheck: new Date().toISOString(),
        latency: Date.now() - startTime,
        errorRate: 0,
      };
    } catch (error) {
      return {
        source: this.source,
        healthy: false,
        lastCheck: new Date().toISOString(),
        latency: Date.now() - startTime,
        details: (error as Error).message,
      };
    }
  }
}
