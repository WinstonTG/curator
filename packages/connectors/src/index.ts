/**
 * Connectors Package Index
 * Exports all connectors and utilities
 */

export * from './base/types';
export * from './base/errors';

export { SpotifyConnector } from './spotify/connector';
export { NewsConnector } from './news/connector';
export { YouTubeConnector } from './youtube/connector';
export { SpoonacularConnector } from './spoonacular/connector';
export { EventbriteConnector } from './eventbrite/connector';

import type { Connector, ConnectorConfig, ConnectorSource } from './base/types';
import { SpotifyConnector } from './spotify/connector';
import { NewsConnector } from './news/connector';
import { YouTubeConnector } from './youtube/connector';
import { SpoonacularConnector } from './spoonacular/connector';
import { EventbriteConnector } from './eventbrite/connector';

/**
 * Factory function to create connectors
 */
export function createConnector(source: ConnectorSource, config: ConnectorConfig): Connector {
  switch (source) {
    case 'spotify':
      return new SpotifyConnector(config);
    case 'news':
      return new NewsConnector(config);
    case 'youtube':
      return new YouTubeConnector(config);
    case 'spoonacular':
      return new SpoonacularConnector(config);
    case 'eventbrite':
      return new EventbriteConnector(config);
    default:
      throw new Error(`Unknown connector source: ${source}`);
  }
}
