import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  validateItem,
  validateCreateItem,
  safeValidateItem,
  ItemSchema,
  CreateItemSchema,
} from './item';

// Helper to load sample JSON files
function loadSample(filename: string) {
  const path = join(__dirname, '../../../samples/items', filename);
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

describe('Item Schema Validation', () => {
  describe('Valid items', () => {
    it('should validate a valid music item', () => {
      const musicItem = loadSample('music-valid.json');
      expect(() => validateItem(musicItem)).not.toThrow();
      const result = safeValidateItem(musicItem);
      expect(result.success).toBe(true);
    });

    it('should validate a valid news item', () => {
      const newsItem = loadSample('news-valid.json');
      expect(() => validateItem(newsItem)).not.toThrow();
      const result = safeValidateItem(newsItem);
      expect(result.success).toBe(true);
    });

    it('should validate a valid recipe item', () => {
      const recipeItem = loadSample('recipe-valid.json');
      expect(() => validateItem(recipeItem)).not.toThrow();
      const result = safeValidateItem(recipeItem);
      expect(result.success).toBe(true);
    });

    it('should validate a valid learning item', () => {
      const learningItem = loadSample('learning-valid.json');
      expect(() => validateItem(learningItem)).not.toThrow();
      const result = safeValidateItem(learningItem);
      expect(result.success).toBe(true);
    });

    it('should validate a valid event item', () => {
      const eventItem = loadSample('event-valid.json');
      expect(() => validateItem(eventItem)).not.toThrow();
      const result = safeValidateItem(eventItem);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid items', () => {
    it('should reject item with missing domain', () => {
      const invalidItem = loadSample('music-invalid-missing-domain.json');
      const result = safeValidateItem(invalidItem);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.path.includes('domain'))).toBe(true);
      }
    });

    it('should reject item with domain mismatch', () => {
      const invalidItem = loadSample('news-invalid-domain-mismatch.json');
      const result = safeValidateItem(invalidItem);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e =>
          e.message.includes('domain must match')
        )).toBe(true);
      }
    });

    it('should reject recipe with negative time', () => {
      const invalidItem = loadSample('recipe-invalid-negative-time.json');
      const result = safeValidateItem(invalidItem);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e =>
          e.path.includes('prep_time_minutes')
        )).toBe(true);
      }
    });

    it('should reject item with invalid UUID', () => {
      const musicItem = loadSample('music-valid.json');
      const invalidItem = { ...musicItem, id: 'not-a-uuid' };
      const result = safeValidateItem(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject item with empty title', () => {
      const musicItem = loadSample('music-valid.json');
      const invalidItem = { ...musicItem, title: '' };
      const result = safeValidateItem(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject item with empty topics array', () => {
      const musicItem = loadSample('music-valid.json');
      const invalidItem = { ...musicItem, topics: [] };
      const result = safeValidateItem(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject item with empty actions array', () => {
      const musicItem = loadSample('music-valid.json');
      const invalidItem = { ...musicItem, actions: [] };
      const result = safeValidateItem(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject item with invalid domain value', () => {
      const musicItem = loadSample('music-valid.json');
      const invalidItem = { ...musicItem, domain: 'invalid-domain' };
      const result = safeValidateItem(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject news item without required publication', () => {
      const newsItem = loadSample('news-valid.json');
      const invalidItem = { ...newsItem };
      delete invalidItem.meta.publication;
      const result = safeValidateItem(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject music item with wrong embedding dimensions', () => {
      const musicItem = loadSample('music-valid.json');
      const invalidItem = {
        ...musicItem,
        embeddings: Array(512).fill(0.5), // Wrong dimension (should be 1536)
      };
      const result = safeValidateItem(invalidItem);
      expect(result.success).toBe(false);
    });
  });

  describe('Create item schema', () => {
    it('should validate create payload without id and timestamps', () => {
      const musicItem = loadSample('music-valid.json');
      const { id, created_at, updated_at, ...createPayload } = musicItem;
      expect(() => validateCreateItem(createPayload)).not.toThrow();
    });

    it('should accept create payload even with extra fields', () => {
      const musicItem = loadSample('music-valid.json');
      const { created_at, updated_at, ...createPayload } = musicItem;
      // CreateItemSchema uses omit, which still allows the field but doesn't require it
      // The payload includes 'id' here which is acceptable
      const result = CreateItemSchema.safeParse(createPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('Domain-specific metadata', () => {
    it('should validate music metadata with all fields', () => {
      const musicItem = loadSample('music-valid.json');
      expect(musicItem.meta.domain).toBe('music');
      expect(musicItem.meta.artists).toBeInstanceOf(Array);
      expect(musicItem.meta.genres).toBeInstanceOf(Array);
    });

    it('should validate recipe metadata with dietary restrictions', () => {
      const recipeItem = loadSample('recipe-valid.json');
      expect(recipeItem.meta.domain).toBe('recipes');
      expect(recipeItem.meta.dietary).toContain('vegetarian');
      expect(recipeItem.meta.ingredients.length).toBeGreaterThan(0);
    });

    it('should validate event metadata with location', () => {
      const eventItem = loadSample('event-valid.json');
      expect(eventItem.meta.domain).toBe('events');
      expect(eventItem.meta.location.city).toBeDefined();
      expect(eventItem.meta.location.country).toBeDefined();
    });

    it('should validate learning metadata with price', () => {
      const learningItem = loadSample('learning-valid.json');
      expect(learningItem.meta.domain).toBe('learning');
      expect(learningItem.meta.price_usd).toBeGreaterThanOrEqual(0);
      expect(learningItem.meta.skills.length).toBeGreaterThan(0);
    });
  });

  describe('Source validation', () => {
    it('should require source name and id', () => {
      const musicItem = loadSample('music-valid.json');
      const invalidItem = {
        ...musicItem,
        source: { name: 'Spotify' }, // Missing id
      };
      const result = safeValidateItem(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should validate optional reputation score', () => {
      const musicItem = loadSample('music-valid.json');
      expect(musicItem.source.reputation_score).toBeGreaterThanOrEqual(0);
      expect(musicItem.source.reputation_score).toBeLessThanOrEqual(100);
    });

    it('should reject invalid reputation score', () => {
      const musicItem = loadSample('music-valid.json');
      const invalidItem = {
        ...musicItem,
        source: { ...musicItem.source, reputation_score: 150 },
      };
      const result = safeValidateItem(invalidItem);
      expect(result.success).toBe(false);
    });
  });
});
