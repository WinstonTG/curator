/**
 * YouTube Data API Connector (for Learning content)
 */

import type { Connector, ConnectorConfig, FetchResult, ConnectorHealth } from '../base/types';
import type { Item } from '@curator/types/src/item';
import { AuthenticationError, NetworkError, MappingError } from '../base/errors';

interface YouTubeVideo {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      high: { url: string };
    };
  };
  contentDetails?: {
    duration: string; // ISO 8601 duration
  };
}

interface YouTubeSearchResponse {
  items: YouTubeVideo[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
  };
}

export class YouTubeConnector implements Connector<YouTubeVideo> {
  readonly source = 'youtube' as const;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(public readonly config: ConnectorConfig) {
    if (!config.apiKey) {
      throw new Error('YouTube API requires apiKey');
    }
  }

  async fetch(cursor?: string, limit: number = 20): Promise<FetchResult<YouTubeVideo>> {
    const params = new URLSearchParams({
      part: 'snippet',
      q: 'tutorial OR course OR learn',
      type: 'video',
      videoCategoryId: '27', // Education category
      maxResults: limit.toString(),
      key: this.config.apiKey!,
    });

    if (cursor) params.set('pageToken', cursor);

    try {
      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        signal: AbortSignal.timeout(this.config.timeout || 10000),
      });

      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError(this.source, 'Invalid API key');
      }
      if (!response.ok) {
        throw new NetworkError(this.source, `API error: ${response.status}`);
      }

      const data: YouTubeSearchResponse = await response.json();
      return {
        items: data.items,
        nextCursor: data.nextPageToken,
        total: data.pageInfo.totalResults,
        hasMore: !!data.nextPageToken,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      throw new NetworkError(this.source, 'Request failed', error as Error);
    }
  }

  map(video: YouTubeVideo): Item {
    try {
      const skills = this.extractSkills(video.snippet.title + ' ' + video.snippet.description);

      return {
        id: `youtube-${video.id.videoId}`,
        domain: 'learning',
        title: video.snippet.title,
        description: video.snippet.description,
        source: {
          name: 'YouTube',
          id: video.id.videoId,
          url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
          reputation_score: 75,
        },
        embeddings: undefined,
        topics: [...skills, 'learning', 'video'],
        actions: ['save'],
        sponsored: false,
        created_at: new Date().toISOString(),
        meta: {
          domain: 'learning',
          instructor: video.snippet.channelTitle,
          platform: 'YouTube',
          type: 'video' as const,
          level: 'all-levels' as const,
          duration: video.contentDetails ? this.parseDuration(video.contentDetails.duration) : undefined,
          skills: skills,
          price_usd: 0,
          rating: undefined,
          enrollments: undefined,
          certificate: false,
          image_url: video.snippet.thumbnails.high.url,
        },
      };
    } catch (error) {
      throw new MappingError(this.source, video.id.videoId, 'Failed to map YouTube video', error as Error);
    }
  }

  private extractSkills(text: string): string[] {
    const skills: string[] = [];
    const lower = text.toLowerCase();

    const skillKeywords = [
      'python', 'javascript', 'typescript', 'react', 'node',
      'machine learning', 'data science', 'web development',
      'ai', 'design', 'photography', 'marketing'
    ];

    skillKeywords.forEach(skill => {
      if (lower.includes(skill)) skills.push(skill);
    });

    return skills.length > 0 ? skills : ['general'];
  }

  private parseDuration(isoDuration: string): { hours?: number; weeks?: number } {
    // Parse ISO 8601 duration (e.g., "PT15M33S" = 15 minutes 33 seconds)
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return {};

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const totalHours = hours + minutes / 60;

    return { hours: totalHours > 0 ? Math.ceil(totalHours) : undefined };
  }

  async validateAuth(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/search?part=snippet&q=test&maxResults=1&key=${this.config.apiKey}`;
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
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
