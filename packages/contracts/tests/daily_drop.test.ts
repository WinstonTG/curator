/**
 * Daily Drop Package Contract Tests
 *
 * These tests validate that the Daily Drop package contract is:
 * 1. Well-formed and parseable
 * 2. Enforces required fields and types
 * 3. Validates business rules (scores, counts, consistency)
 * 4. Rejects invalid payloads
 */

import { describe, it, expect } from 'vitest';
import {
  validateDailyDropPackage,
  safeParseDailyDropPackage,
  isDailyDropPackage,
  type DailyDropPackage,
  type DailyDropSection,
  type DailyDropItem,
} from '@curator/types/src/daily_drop';
import fs from 'fs';
import path from 'path';

describe('Daily Drop Package Contract', () => {
  // Load sample JSON (from repository root)
  const samplePath = path.join(process.cwd(), '../../samples/daily_drop/2025-11-12.json');
  const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));

  describe('Valid Package', () => {
    it('should validate a complete valid package', () => {
      const result = validateDailyDropPackage(sampleData);
      expect(result).toBeDefined();
      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440100');
      expect(result.user_id).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should pass with safeParse', () => {
      const result = safeParseDailyDropPackage(sampleData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.delivery_date).toBe('2025-11-12');
      }
    });

    it('should pass type guard', () => {
      expect(isDailyDropPackage(sampleData)).toBe(true);
    });

    it('should validate all required top-level fields', () => {
      const pkg = validateDailyDropPackage(sampleData);
      expect(pkg.id).toBeDefined();
      expect(pkg.user_id).toBeDefined();
      expect(pkg.generated_at).toBeDefined();
      expect(pkg.expires_at).toBeDefined();
      expect(pkg.delivery_date).toBeDefined();
      expect(pkg.version).toBeDefined();
      expect(pkg.personalization).toBeDefined();
      expect(pkg.sections).toBeDefined();
      expect(pkg.metadata).toBeDefined();
    });

    it('should validate personalization metadata structure', () => {
      const pkg = validateDailyDropPackage(sampleData);
      expect(pkg.personalization.preference_vectors_used).toBeInstanceOf(Array);
      expect(pkg.personalization.interests_matched).toBeInstanceOf(Array);
      expect(pkg.personalization.constraints_applied).toBeInstanceOf(Array);
      expect(pkg.personalization.diversity_score).toBeGreaterThanOrEqual(0);
      expect(pkg.personalization.diversity_score).toBeLessThanOrEqual(1);
      expect(pkg.personalization.exploration_ratio).toBeGreaterThanOrEqual(0);
      expect(pkg.personalization.exploration_ratio).toBeLessThanOrEqual(1);
    });

    it('should validate sections structure', () => {
      const pkg = validateDailyDropPackage(sampleData);
      expect(pkg.sections.length).toBeGreaterThan(0);
      pkg.sections.forEach((section: DailyDropSection) => {
        expect(section.domain).toBeDefined();
        expect(section.title).toBeDefined();
        expect(section.items).toBeInstanceOf(Array);
        expect(section.items.length).toBeGreaterThan(0);
        expect(section.section_score).toBeGreaterThanOrEqual(0);
        expect(section.section_score).toBeLessThanOrEqual(1);
      });
    });

    it('should validate item structure', () => {
      const pkg = validateDailyDropPackage(sampleData);
      const firstSection = pkg.sections[0];
      const firstItem = firstSection.items[0];

      expect(firstItem.item_id).toBeDefined();
      expect(firstItem.rank).toBeGreaterThan(0);
      expect(firstItem.score).toBeGreaterThanOrEqual(0);
      expect(firstItem.score).toBeLessThanOrEqual(1);
      expect(firstItem.reasons).toBeInstanceOf(Array);
      expect(firstItem.reasons.length).toBeGreaterThan(0);
      expect(typeof firstItem.sponsored).toBe('boolean');
      expect(firstItem.explanation_type).toBeDefined();
    });

    it('should validate package metadata', () => {
      const pkg = validateDailyDropPackage(sampleData);
      expect(pkg.metadata.total_items).toBeGreaterThan(0);
      expect(pkg.metadata.domains_included).toBeInstanceOf(Array);
      expect(pkg.metadata.generation_time_ms).toBeGreaterThanOrEqual(0);
      expect(pkg.metadata.ranker_version).toBeDefined();
      expect(typeof pkg.metadata.has_sponsored).toBe('boolean');
      expect(pkg.metadata.average_score).toBeGreaterThanOrEqual(0);
      expect(pkg.metadata.average_score).toBeLessThanOrEqual(1);
    });
  });

  describe('Field Validation', () => {
    it('should require valid UUID for id', () => {
      const invalid = { ...sampleData, id: 'not-a-uuid' };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should require valid UUID for user_id', () => {
      const invalid = { ...sampleData, user_id: 'invalid-user' };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should require ISO 8601 datetime for generated_at', () => {
      const invalid = { ...sampleData, generated_at: '2025-11-12' };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should require YYYY-MM-DD format for delivery_date', () => {
      const invalid = { ...sampleData, delivery_date: '11/12/2025' };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should require positive version number', () => {
      const invalid = { ...sampleData, version: 0 };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should require diversity_score in range 0-1', () => {
      const invalid = {
        ...sampleData,
        personalization: { ...sampleData.personalization, diversity_score: 1.5 },
      };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should require exploration_ratio in range 0-1', () => {
      const invalid = {
        ...sampleData,
        personalization: { ...sampleData.personalization, exploration_ratio: -0.1 },
      };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should require valid domain enum values', () => {
      const invalid = {
        ...sampleData,
        sections: [
          {
            ...sampleData.sections[0],
            domain: 'invalid_domain',
          },
        ],
      };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should require valid explanation_type enum values', () => {
      const invalid = {
        ...sampleData,
        sections: [
          {
            ...sampleData.sections[0],
            items: [
              {
                ...sampleData.sections[0].items[0],
                explanation_type: 'invalid_type',
              },
            ],
          },
        ],
      };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should require at least one reason per item', () => {
      const invalid = {
        ...sampleData,
        sections: [
          {
            ...sampleData.sections[0],
            items: [
              {
                ...sampleData.sections[0].items[0],
                reasons: [],
              },
            ],
          },
        ],
      };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should require positive rank', () => {
      const invalid = {
        ...sampleData,
        sections: [
          {
            ...sampleData.sections[0],
            items: [
              {
                ...sampleData.sections[0].items[0],
                rank: 0,
              },
            ],
          },
        ],
      };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should require item score in range 0-1', () => {
      const invalid = {
        ...sampleData,
        sections: [
          {
            ...sampleData.sections[0],
            items: [
              {
                ...sampleData.sections[0].items[0],
                score: 2.5,
              },
            ],
          },
        ],
      };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Business Rule Validation', () => {
    it('should enforce section item_count matches items array length', () => {
      const invalid = {
        ...sampleData,
        sections: [
          {
            ...sampleData.sections[0],
            item_count: 999, // Wrong count
          },
          ...sampleData.sections.slice(1),
        ],
      };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('item_count');
      }
    });

    it('should enforce metadata.total_items matches sum of section items', () => {
      const invalid = {
        ...sampleData,
        metadata: {
          ...sampleData.metadata,
          total_items: 999, // Wrong count
        },
      };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('total_items');
      }
    });

    it('should enforce metadata.domains_included matches sections', () => {
      const invalid = {
        ...sampleData,
        metadata: {
          ...sampleData.metadata,
          domains_included: ['music', 'invalid_domain'],
        },
      };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should require at least one section', () => {
      const invalid = {
        ...sampleData,
        sections: [],
        metadata: {
          ...sampleData.metadata,
          total_items: 0,
          domains_included: [],
        },
      };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should require at least one item per section', () => {
      const invalid = {
        ...sampleData,
        sections: [
          {
            ...sampleData.sections[0],
            items: [],
            item_count: 0,
          },
        ],
        metadata: {
          ...sampleData.metadata,
          total_items: 0,
        },
      };
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Missing Fields', () => {
    it('should reject package without id', () => {
      const { id, ...invalid } = sampleData;
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject package without user_id', () => {
      const { user_id, ...invalid } = sampleData;
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject package without sections', () => {
      const { sections, ...invalid } = sampleData;
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject package without metadata', () => {
      const { metadata, ...invalid } = sampleData;
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject package without personalization', () => {
      const { personalization, ...invalid } = sampleData;
      const result = safeParseDailyDropPackage(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Type Guard', () => {
    it('should return false for non-object', () => {
      expect(isDailyDropPackage(null)).toBe(false);
      expect(isDailyDropPackage(undefined)).toBe(false);
      expect(isDailyDropPackage('string')).toBe(false);
      expect(isDailyDropPackage(123)).toBe(false);
      expect(isDailyDropPackage([])).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isDailyDropPackage({})).toBe(false);
    });

    it('should return true for valid package', () => {
      expect(isDailyDropPackage(sampleData)).toBe(true);
    });
  });
});
