/**
 * News Connector Mapper Tests
 */

import { describe, it, expect } from 'vitest';
import { NewsConnector } from './connector';

describe('News Mapper', () => {
  const connector = new NewsConnector({
    source: 'news',
    apiKey: 'test-key',
  });

  const mockArticle = {
    source: { id: 'techcrunch', name: 'TechCrunch' },
    author: 'John Doe',
    title: 'AI Breakthrough in Machine Learning',
    description: 'A new algorithm achieves state-of-the-art results',
    url: 'https://example.com/article',
    urlToImage: 'https://example.com/image.jpg',
    publishedAt: '2024-01-15T10:00:00Z',
    content: 'Full article content goes here...',
  };

  it('should map news article to unified Item schema', () => {
    const item = connector.map(mockArticle);

    expect(item.domain).toBe('news');
    expect(item.title).toBe('AI Breakthrough in Machine Learning');
    expect(item.description).toBe('A new algorithm achieves state-of-the-art results');
  });

  it('should include source information', () => {
    const item = connector.map(mockArticle);

    expect(item.source.name).toBe('TechCrunch');
    expect(item.source.id).toBe('techcrunch');
    expect(item.source.url).toBe('https://example.com/article');
    expect(item.source.reputation_score).toBe(70);
  });

  it('should map metadata correctly', () => {
    const item = connector.map(mockArticle);

    expect(item.meta.domain).toBe('news');
    expect(item.meta.author).toBe('John Doe');
    expect(item.meta.publication).toBe('TechCrunch');
    expect(item.meta.published_at).toBe('2024-01-15T10:00:00Z');
    expect(item.meta.category).toBe('technology');
    expect(item.meta.image_url).toBe('https://example.com/image.jpg');
  });

  it('should infer category from content', () => {
    const techArticle = { ...mockArticle, title: 'Software Development Tips' };
    const item = connector.map(techArticle);
    expect(item.meta.category).toBe('technology');
  });

  it('should estimate read time', () => {
    const item = connector.map(mockArticle);
    expect(item.meta.read_time_minutes).toBeGreaterThan(0);
  });
});
