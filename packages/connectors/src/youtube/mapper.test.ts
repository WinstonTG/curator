/**
 * YouTube Connector Mapper Tests
 */

import { describe, it, expect } from 'vitest';
import { YouTubeConnector } from './connector';

describe('YouTube Mapper', () => {
  const connector = new YouTubeConnector({
    source: 'youtube',
    apiKey: 'test-key',
  });

  const mockVideo = {
    id: { videoId: 'video123' },
    snippet: {
      title: 'Learn Python in 10 Minutes',
      description: 'A comprehensive Python tutorial for beginners',
      channelTitle: 'Tech Academy',
      publishedAt: '2024-01-15T10:00:00Z',
      thumbnails: {
        high: { url: 'https://example.com/thumb.jpg' },
      },
    },
    contentDetails: {
      duration: 'PT10M30S',
    },
  };

  it('should map YouTube video to unified Item schema', () => {
    const item = connector.map(mockVideo);

    expect(item.domain).toBe('learning');
    expect(item.title).toBe('Learn Python in 10 Minutes');
    expect(item.description).toBe('A comprehensive Python tutorial for beginners');
  });

  it('should include source information', () => {
    const item = connector.map(mockVideo);

    expect(item.source.name).toBe('YouTube');
    expect(item.source.id).toBe('video123');
    expect(item.source.url).toBe('https://www.youtube.com/watch?v=video123');
  });

  it('should map metadata correctly', () => {
    const item = connector.map(mockVideo);

    expect(item.meta.domain).toBe('learning');
    expect(item.meta.instructor).toBe('Tech Academy');
    expect(item.meta.platform).toBe('YouTube');
    expect(item.meta.type).toBe('video');
    expect(item.meta.price_usd).toBe(0);
    expect(item.meta.certificate).toBe(false);
  });

  it('should extract skills from title and description', () => {
    const item = connector.map(mockVideo);
    expect(item.meta.skills).toContain('python');
  });

  it('should parse ISO duration correctly', () => {
    const item = connector.map(mockVideo);
    expect(item.meta.duration).toBeDefined();
    expect(item.meta.duration?.hours).toBeGreaterThan(0);
  });
});
