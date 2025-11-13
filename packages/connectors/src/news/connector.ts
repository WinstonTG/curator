/**
 * News API Connector
 */

import type { Connector, ConnectorConfig, FetchResult, ConnectorHealth } from '../base/types';
import type { Item } from '@curator/types/src/item';
import { AuthenticationError, NetworkError, RateLimitError } from '../base/errors';
import { MappingError } from '../base/errors';

interface NewsArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

export class NewsConnector implements Connector<NewsArticle> {
  readonly source = 'news' as const;
  private baseUrl = 'https://newsapi.org/v2';

  constructor(public readonly config: ConnectorConfig) {
    if (!config.apiKey) {
      throw new Error('News API requires apiKey');
    }
  }

  async fetch(cursor?: string, limit: number = 20): Promise<FetchResult<NewsArticle>> {
    const page = cursor ? parseInt(cursor) : 1;
    const url = `${this.baseUrl}/everything?q=technology OR science&language=en&pageSize=${limit}&page=${page}&apiKey=${this.config.apiKey}`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.config.timeout || 10000),
      });

      if (response.status === 401) {
        throw new AuthenticationError(this.source, 'Invalid API key');
      }
      if (response.status === 429) {
        throw new RateLimitError(this.source, 3600);
      }
      if (!response.ok) {
        throw new NetworkError(this.source, `API error: ${response.status}`);
      }

      const data: NewsAPIResponse = await response.json();
      return {
        items: data.articles,
        nextCursor: data.articles.length === limit ? (page + 1).toString() : undefined,
        total: data.totalResults,
        hasMore: data.articles.length === limit,
      };
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof RateLimitError) throw error;
      throw new NetworkError(this.source, 'Request failed', error as Error);
    }
  }

  map(article: NewsArticle): Item {
    try {
      // Determine category from source or use default
      const category = this.inferCategory(article.title + ' ' + (article.description || ''));

      return {
        id: `news-${Buffer.from(article.url).toString('base64').slice(0, 20)}`,
        domain: 'news',
        title: article.title,
        description: article.description || undefined,
        source: {
          name: article.source.name,
          id: article.source.id || article.source.name,
          url: article.url,
          reputation_score: 70, // Default, would be refined by safety standards
        },
        embeddings: undefined,
        topics: [category, 'news'],
        actions: ['save'],
        sponsored: false,
        created_at: new Date().toISOString(),
        meta: {
          domain: 'news',
          author: article.author || undefined,
          publication: article.source.name,
          published_at: article.publishedAt,
          category: category,
          bias: 'center' as const,
          credibility_tier: 'verified' as const,
          read_time_minutes: this.estimateReadTime(article.content || article.description || ''),
          image_url: article.urlToImage || undefined,
          breaking: false,
        },
      };
    } catch (error) {
      throw new MappingError(this.source, article.url, 'Failed to map news article', error as Error);
    }
  }

  private inferCategory(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('tech') || lower.includes('ai') || lower.includes('software')) return 'technology';
    if (lower.includes('climate') || lower.includes('environment')) return 'climate';
    if (lower.includes('business') || lower.includes('economy')) return 'business';
    if (lower.includes('science')) return 'science';
    return 'general';
  }

  private estimateReadTime(text: string): number {
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200)); // 200 words per minute
  }

  async validateAuth(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/top-headlines?country=us&pageSize=1&apiKey=${this.config.apiKey}`;
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
