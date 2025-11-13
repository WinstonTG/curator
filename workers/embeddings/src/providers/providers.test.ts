/**
 * Embedding Provider Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalProvider } from './local';
import type { EmbeddingConfig } from './base';

describe('LocalProvider', () => {
  let provider: LocalProvider;
  let config: EmbeddingConfig;

  beforeEach(() => {
    config = {
      provider: 'local',
      model: 'all-MiniLM-L6-v2',
    };
    provider = new LocalProvider(config);
  });

  describe('embed()', () => {
    it('should generate embedding for text', async () => {
      const result = await provider.embed('test text');

      expect(result.embedding).toBeDefined();
      expect(result.embedding.length).toBe(384);
      expect(result.model).toBe('all-MiniLM-L6-v2');
      expect(result.dimensions).toBe(384);
    });

    it('should generate deterministic embeddings', async () => {
      const result1 = await provider.embed('same text');
      const result2 = await provider.embed('same text');

      expect(result1.embedding).toEqual(result2.embedding);
    });

    it('should generate different embeddings for different text', async () => {
      const result1 = await provider.embed('text one');
      const result2 = await provider.embed('text two');

      expect(result1.embedding).not.toEqual(result2.embedding);
    });

    it('should normalize embeddings', async () => {
      const result = await provider.embed('test');
      const magnitude = Math.sqrt(
        result.embedding.reduce((sum, val) => sum + val * val, 0)
      );

      expect(magnitude).toBeCloseTo(1, 5);
    });
  });

  describe('embedBatch()', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = ['text 1', 'text 2', 'text 3'];
      const result = await provider.embedBatch(texts);

      expect(result.embeddings.length).toBe(3);
      expect(result.embeddings[0].length).toBe(384);
      expect(result.model).toBe('all-MiniLM-L6-v2');
      expect(result.dimensions).toBe(384);
    });

    it('should handle empty batch', async () => {
      const result = await provider.embedBatch([]);

      expect(result.embeddings).toEqual([]);
    });

    it('should maintain consistency in batch', async () => {
      const texts = ['same', 'same', 'same'];
      const result = await provider.embedBatch(texts);

      expect(result.embeddings[0]).toEqual(result.embeddings[1]);
      expect(result.embeddings[1]).toEqual(result.embeddings[2]);
    });
  });

  describe('getDimensions()', () => {
    it('should return correct dimensions', () => {
      expect(provider.getDimensions()).toBe(384);
    });
  });

  describe('validate()', () => {
    it('should always validate for local provider', async () => {
      const isValid = await provider.validate();
      expect(isValid).toBe(true);
    });
  });
});

describe('Provider Base', () => {
  let provider: LocalProvider;

  beforeEach(() => {
    provider = new LocalProvider({
      provider: 'local',
      model: 'all-MiniLM-L6-v2',
    });
  });

  it('should truncate long texts', () => {
    const longText = 'a'.repeat(50000);
    // Access protected method through type assertion
    const truncated = (provider as any).prepareText(longText, 1000);

    expect(truncated.length).toBeLessThan(longText.length);
    expect(truncated.endsWith('...')).toBe(true);
  });

  it('should not truncate short texts', () => {
    const shortText = 'short text';
    const prepared = (provider as any).prepareText(shortText);

    expect(prepared).toBe(shortText);
  });

  it('should normalize vectors', () => {
    const vector = [3, 4]; // Magnitude = 5
    const normalized = (provider as any).normalize(vector);

    expect(normalized[0]).toBeCloseTo(0.6, 5);
    expect(normalized[1]).toBeCloseTo(0.8, 5);

    const magnitude = Math.sqrt(
      normalized.reduce((sum: number, val: number) => sum + val * val, 0)
    );
    expect(magnitude).toBeCloseTo(1, 5);
  });
});
