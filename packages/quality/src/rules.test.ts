/**
 * Quality Rules Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QualityRulesEngine } from './rules.js';
import type { Item } from '@curator/types/src/item';

describe('QualityRulesEngine', () => {
  let engine: QualityRulesEngine;

  beforeEach(() => {
    engine = new QualityRulesEngine();
  });

  describe('Source Reputation', () => {
    it('should give high score to trusted news sources', () => {
      const item: Item = {
        id: 'test-1',
        domain: 'news',
        title: 'Breaking News',
        url: 'https://apnews.com/article/123',
        source: {
          name: 'Associated Press',
          url: 'https://apnews.com',
        },
        topics: ['politics'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {},
      };

      const result = engine.check(item, 'ingest');

      // Overall score is weighted: 60% reputation (98) + 40% content quality
      expect(result.metadata.source_reputation).toBe(98);
      expect(result.tier).toBe('trusted');
      expect(result.passed).toBe(true);
      expect(result.action).toBe('allow');
    });

    it('should flag risky sources', () => {
      const item: Item = {
        id: 'test-2',
        domain: 'news',
        title: 'News Article',
        url: 'https://clickbait-news.com/article/123',
        source: {
          name: 'clickbait-news.com',
          url: 'https://clickbait-news.com',
          reputation_score: 40,
        },
        topics: ['news'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {},
      };

      const result = engine.check(item, 'ingest');

      expect(result.score).toBeLessThan(70);
      expect(result.tier).toBe('risky');
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should reject blocked sources', () => {
      const item: Item = {
        id: 'test-3',
        domain: 'news',
        title: 'Fake News',
        url: 'https://fake-news-site.com/article/123',
        source: {
          name: 'fake-news-site.com',
          url: 'https://fake-news-site.com',
        },
        topics: ['news'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {},
      };

      const result = engine.check(item, 'ingest');

      expect(result.action).toBe('reject');
      expect(result.tier).toBe('blocked');
      expect(result.passed).toBe(false);

      const criticalViolation = result.violations.find(v => v.severity === 'critical');
      expect(criticalViolation).toBeDefined();
      expect(criticalViolation?.message).toContain('blocked');
    });

    it('should handle unknown sources with default score', () => {
      const item: Item = {
        id: 'test-4',
        domain: 'news',
        title: 'Article',
        url: 'https://unknown-source.com/article/123',
        source: {
          name: 'Unknown Source',
          url: 'https://unknown-source.com',
        },
        topics: ['news'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {},
      };

      const result = engine.check(item, 'ingest');

      // Unknown sources use default score of 50, which puts them in unverified tier
      expect(result.tier).toBe('unverified');
      expect(result.metadata.source_reputation).toBe(50);

      // They may or may not have violations depending on the default score
      // The key is they're treated as unverified
      expect(result.passed).toBe(true); // Passes ingest threshold of 50
    });
  });

  describe('Blocklists', () => {
    it('should flag spam keywords', () => {
      const item: Item = {
        id: 'test-5',
        domain: 'news',
        title: 'You won\'t believe this one weird trick!',
        description: 'Click here now for limited time offer!',
        url: 'https://example.com/article/123',
        source: {
          name: 'Example News',
          url: 'https://example.com',
          reputation_score: 70,
        },
        topics: ['news'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {},
      };

      const result = engine.check(item, 'ingest');

      const spamViolations = result.violations.filter(
        v => v.type === 'blocklist' && v.severity === 'high'
      );

      expect(spamViolations.length).toBeGreaterThan(0);
      expect(result.action).not.toBe('allow');
    });

    it('should flag sensitive topics', () => {
      const item: Item = {
        id: 'test-6',
        domain: 'news',
        title: 'Medical Diagnosis Guide',
        description: 'Learn how to diagnose medical conditions yourself',
        url: 'https://reuters.com/article/123',
        source: {
          name: 'Reuters',
          url: 'https://reuters.com',
          reputation_score: 98,
        },
        topics: ['health'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {},
      };

      const result = engine.check(item, 'ingest');

      const sensitiveViolation = result.violations.find(
        v => v.type === 'blocklist' && v.message.includes('sensitive topic')
      );

      expect(sensitiveViolation).toBeDefined();
    });

    it('should check domain-specific blocklists', () => {
      const item: Item = {
        id: 'test-7',
        domain: 'recipes',
        title: 'Miracle Diet Recipe',
        description: 'Lose weight fast with this detox cleanse!',
        url: 'https://seriouseats.com/recipe/123',
        source: {
          name: 'Serious Eats',
          url: 'https://seriouseats.com',
          reputation_score: 95,
        },
        topics: ['diet', 'recipes'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {},
      };

      const result = engine.check(item, 'ingest');

      const dietViolations = result.violations.filter(
        v => v.type === 'blocklist' && v.message.includes('blocked keyword for recipes')
      );

      expect(dietViolations.length).toBeGreaterThan(0);
    });
  });

  describe('Domain-Specific Filters', () => {
    it('should require verified sources for health news', () => {
      const item: Item = {
        id: 'test-8',
        domain: 'news',
        title: 'New Medical Treatment',
        description: 'Groundbreaking health research',
        url: 'https://example.com/article/123',
        source: {
          name: 'Unknown Blog',
          url: 'https://example.com',
          reputation_score: 50,
        },
        topics: ['health', 'medical'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {
          credibility_tier: 'unverified',
        },
      };

      const result = engine.check(item, 'ingest');

      // Health topics with unverified credibility trigger a filter violation
      const healthViolation = result.violations.find(
        v => v.type === 'filter' && v.message.includes('verified source')
      );

      expect(healthViolation).toBeDefined();
      expect(healthViolation?.severity).toBe('high');
    });

    it('should flag diet recipes without nutrition info', () => {
      const item: Item = {
        id: 'test-9',
        domain: 'recipes',
        title: 'Keto Breakfast Recipe',
        url: 'https://seriouseats.com/recipe/123',
        source: {
          name: 'Serious Eats',
          url: 'https://seriouseats.com',
          reputation_score: 95,
        },
        topics: ['recipes', 'keto'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {
          dietary: ['keto', 'low-carb'],
          // Missing nutrition field
        },
      };

      const result = engine.check(item, 'ingest');

      const nutritionViolation = result.violations.find(
        v => v.type === 'filter' && v.message.includes('nutrition')
      );

      expect(nutritionViolation).toBeDefined();
    });

    it('should check instructor rating for learning content', () => {
      const item: Item = {
        id: 'test-10',
        domain: 'learning',
        title: 'Programming Course',
        url: 'https://udemy.com/course/123',
        source: {
          name: 'Udemy',
          url: 'https://udemy.com',
          reputation_score: 75,
        },
        topics: ['programming'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {
          rating: 2.5, // Below minimum of 3.5
        },
      };

      const result = engine.check(item, 'ingest');

      const ratingViolation = result.violations.find(
        v => v.type === 'filter' && v.message.includes('rating')
      );

      expect(ratingViolation).toBeDefined();
    });
  });

  describe('Quality Thresholds', () => {
    it('should apply different thresholds for different contexts', () => {
      const item: Item = {
        id: 'test-11',
        domain: 'news',
        title: 'News Article',
        url: 'https://theverge.com/article/123',
        source: {
          name: 'The Verge',
          url: 'https://theverge.com',
          reputation_score: 78,
        },
        topics: ['tech'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {},
      };

      const ingestResult = engine.check(item, 'ingest');
      const rankingResult = engine.check(item, 'ranking');
      const featuredResult = engine.check(item, 'featured');

      // Should pass ingest (min 50) and ranking (min 60)
      expect(ingestResult.passed).toBe(true);
      expect(rankingResult.passed).toBe(true);

      // Reputation is 78, which doesn't meet featured threshold (min 80)
      expect(featuredResult.metadata.source_reputation).toBe(78);

      const thresholdViolation = featuredResult.violations.find(v => v.type === 'threshold');
      expect(thresholdViolation).toBeDefined();
      expect(thresholdViolation?.message).toContain('featured');
    });
  });

  describe('Content Quality Assessment', () => {
    it('should score content based on metadata completeness', () => {
      const richItem: Item = {
        id: 'test-12',
        domain: 'recipes',
        title: 'Delicious Recipe',
        description: 'A comprehensive guide to making this amazing dish with detailed instructions and tips.',
        url: 'https://seriouseats.com/recipe/123',
        source: {
          name: 'Serious Eats',
          url: 'https://seriouseats.com',
          reputation_score: 95,
        },
        topics: ['cooking', 'baking', 'desserts'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {
          prep_time: 15,
          cook_time: 30,
          servings: 6,
          difficulty: 'medium',
          rating: 4.8,
          image_url: 'https://example.com/image.jpg',
        },
      };

      const poorItem: Item = {
        id: 'test-13',
        domain: 'recipes',
        title: 'Recipe',
        url: 'https://example.com/recipe/123',
        source: {
          name: 'Example',
          url: 'https://example.com',
          reputation_score: 95,
        },
        topics: [],
        published_at: new Date().toISOString(),
        sponsored: true,
        meta: {},
      };

      const richResult = engine.check(richItem, 'ingest');
      const poorResult = engine.check(poorItem, 'ingest');

      expect(richResult.metadata.content_quality).toBeGreaterThan(
        poorResult.metadata.content_quality!
      );
    });
  });

  describe('Allowlists', () => {
    it('should bypass checks for trusted domains', () => {
      const item: Item = {
        id: 'test-14',
        domain: 'learning',
        title: 'Wikipedia Article',
        url: 'https://en.wikipedia.org/wiki/Machine_Learning',
        source: {
          name: 'Wikipedia',
          url: 'https://en.wikipedia.org',
        },
        topics: ['machine-learning'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {},
      };

      const result = engine.check(item, 'ingest');

      // Wikipedia is in trusted_domains allowlist
      expect(result.metadata.source_reputation).toBe(100); // Gets max reputation score
      expect(result.tier).toBe('trusted');
      expect(result.passed).toBe(true);
    });

    it('should recognize verified creators', () => {
      const item: Item = {
        id: 'test-15',
        domain: 'learning',
        title: 'Machine Learning Course',
        url: 'https://coursera.org/course/123',
        source: {
          name: 'Andrew Ng',
          url: 'https://coursera.org',
        },
        topics: ['machine-learning', 'ai'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {},
      };

      const result = engine.check(item, 'ingest');

      // Andrew Ng is in verified_creators for learning
      expect(result.metadata.source_reputation).toBe(100);
      expect(result.tier).toBe('trusted');
    });
  });

  describe('Action Determination', () => {
    it('should reject items with critical violations', () => {
      const item: Item = {
        id: 'test-16',
        domain: 'news',
        title: 'Article',
        url: 'https://fake-news-site.com/article/123',
        source: {
          name: 'fake-news-site.com',
          url: 'https://fake-news-site.com',
        },
        topics: ['news'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {},
      };

      const result = engine.check(item, 'ingest');

      expect(result.action).toBe('reject');
      expect(result.passed).toBe(false);
    });

    it('should quarantine items with multiple high severity violations', () => {
      const item: Item = {
        id: 'test-17',
        domain: 'news',
        title: 'You won\'t believe this doctors hate trick!',
        description: 'Click here now! Get rich quick with medical advice!',
        url: 'https://example.com/article/123',
        source: {
          name: 'Unknown',
          url: 'https://example.com',
          reputation_score: 35,
        },
        topics: ['health'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {},
      };

      const result = engine.check(item, 'ingest');

      // Should have multiple high severity violations
      const highViolations = result.violations.filter(v => v.severity === 'high');
      expect(highViolations.length).toBeGreaterThanOrEqual(2);
      expect(result.action).toBe('quarantine');
    });

    it('should have proper action determination logic', () => {
      // Test that action determination follows the rules:
      // - critical violations = reject
      // - 2+ high violations = quarantine
      // - 1 high violation = flag
      // - no major issues = allow

      const lowRepItem: Item = {
        id: 'test-18',
        domain: 'news',
        title: 'News Article',
        description: 'A well-written article with good content',
        url: 'https://example.com/article/123',
        source: {
          name: 'Low Reputation Source',
          url: 'https://example.com',
          reputation_score: 25, // Below minimum - triggers violations
        },
        topics: ['technology', 'news', 'analysis'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {
          author: 'John Doe',
          image_url: 'https://example.com/image.jpg',
        },
      };

      const result = engine.check(lowRepItem, 'ingest');

      // Low reputation items get multiple high violations (reputation + threshold)
      const highViolations = result.violations.filter(v => v.severity === 'high');
      expect(highViolations.length).toBeGreaterThanOrEqual(1);

      // With score 25, tier is 'blocked' (below 30), so action is reject
      expect(result.tier).toBe('blocked');
      expect(result.action).toBe('reject');
    });

    it('should allow clean items from good sources', () => {
      const item: Item = {
        id: 'test-19',
        domain: 'news',
        title: 'Climate Change Report',
        description: 'Comprehensive analysis of recent climate data',
        url: 'https://reuters.com/article/123',
        source: {
          name: 'Reuters',
          url: 'https://reuters.com',
          reputation_score: 98,
        },
        topics: ['environment', 'science'],
        published_at: new Date().toISOString(),
        sponsored: false,
        meta: {
          author: 'Science Team',
          credibility_tier: 'trusted',
        },
      };

      const result = engine.check(item, 'ingest');

      expect(result.action).toBe('allow');
      expect(result.passed).toBe(true);
      expect(result.tier).toBe('trusted');
    });
  });
});
