/**
 * Spotify API Client
 */

import type {
  SpotifyTrack,
  SpotifyRecommendationsResponse,
  SpotifySearchResponse,
  SpotifyAuthResponse,
} from './types';
import type { FetchResult, ConnectorConfig } from '../base/types';
import { AuthenticationError, NetworkError, RateLimitError } from '../base/errors';

export class SpotifyClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private config: ConnectorConfig) {
    if (!config.apiKey || !config.apiSecret) {
      throw new Error('Spotify requires client_id (apiKey) and client_secret (apiSecret)');
    }
  }

  /**
   * Authenticate with Spotify using Client Credentials flow
   */
  private async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return; // Token still valid
    }

    try {
      const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new AuthenticationError('spotify', `Auth failed: ${response.statusText}`);
      }

      const data: SpotifyAuthResponse = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000;
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      throw new NetworkError('spotify', 'Failed to authenticate', error as Error);
    }
  }

  /**
   * Make authenticated request to Spotify API
   */
  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    await this.authenticate();

    const url = new URL(`https://api.spotify.com/v1${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        signal: AbortSignal.timeout(this.config.timeout || 10000),
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        throw new RateLimitError('spotify', retryAfter);
      }

      if (!response.ok) {
        throw new NetworkError('spotify', `API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof RateLimitError || error instanceof NetworkError) throw error;
      throw new NetworkError('spotify', 'Request failed', error as Error);
    }
  }

  /**
   * Search for tracks
   */
  async searchTracks(query: string, limit: number = 20, offset: number = 0): Promise<FetchResult<SpotifyTrack>> {
    const response = await this.request<SpotifySearchResponse>('/search', {
      q: query,
      type: 'track',
      limit: limit.toString(),
      offset: offset.toString(),
    });

    return {
      items: response.tracks.items,
      nextCursor: response.tracks.next ? (offset + limit).toString() : undefined,
      total: response.tracks.total,
      hasMore: response.tracks.next !== null,
    };
  }

  /**
   * Get recommendations based on seed data
   */
  async getRecommendations(params: {
    seed_artists?: string[];
    seed_genres?: string[];
    seed_tracks?: string[];
    limit?: number;
  }): Promise<FetchResult<SpotifyTrack>> {
    const queryParams: Record<string, string> = {
      limit: (params.limit || 20).toString(),
    };

    if (params.seed_artists) queryParams.seed_artists = params.seed_artists.join(',');
    if (params.seed_genres) queryParams.seed_genres = params.seed_genres.join(',');
    if (params.seed_tracks) queryParams.seed_tracks = params.seed_tracks.join(',');

    const response = await this.request<SpotifyRecommendationsResponse>('/recommendations', queryParams);

    return {
      items: response.tracks,
      hasMore: false, // Recommendations endpoint doesn't support pagination
      total: response.tracks.length,
    };
  }

  /**
   * Get featured playlists tracks (for discovery)
   */
  async getFeaturedTracks(limit: number = 20): Promise<FetchResult<SpotifyTrack>> {
    // For MVP, use genre-based search as a proxy for featured content
    const genres = ['electronic', 'indie', 'jazz', 'pop', 'hip-hop'];
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];

    return this.searchTracks(`genre:${randomGenre}`, limit);
  }

  /**
   * Validate authentication
   */
  async validateAuth(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch {
      return false;
    }
  }
}
