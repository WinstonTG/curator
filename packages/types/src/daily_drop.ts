/**
 * Daily Drop Package Contract
 *
 * Represents a curated daily package of personalized recommendations
 * delivered to a user. Contains multiple items across domains with
 * ranking, scoring, and personalization metadata.
 */

import { z } from 'zod';
import type { Domain } from './item';

/**
 * Daily Drop Package
 * The complete package of recommendations for a specific user and date
 */
export interface DailyDropPackage {
  /** Unique identifier for this package */
  id: string; // UUID

  /** User this package is generated for */
  user_id: string; // UUID

  /** When this package was generated */
  generated_at: string; // ISO 8601

  /** When this package expires (typically 24 hours after generation) */
  expires_at: string; // ISO 8601

  /** Delivery date (YYYY-MM-DD) */
  delivery_date: string;

  /** Schema version for compatibility */
  version: number;

  /** Personalization metadata */
  personalization: PersonalizationMetadata;

  /** Content sections (one per domain) */
  sections: DailyDropSection[];

  /** Package-level metadata */
  metadata: PackageMetadata;
}

/**
 * Personalization metadata
 * Information about how this package was personalized
 */
export interface PersonalizationMetadata {
  /** IDs of preference vectors used for matching */
  preference_vectors_used: string[]; // UUIDs

  /** IDs of interests that were matched */
  interests_matched: string[]; // UUIDs

  /** IDs of constraints that were applied */
  constraints_applied: string[]; // UUIDs

  /** Diversity score (0-1, higher = more diverse across domains/topics) */
  diversity_score: number;

  /** Exploration vs exploitation ratio (0 = pure exploitation, 1 = pure exploration) */
  exploration_ratio: number;
}

/**
 * Content section for a specific domain
 */
export interface DailyDropSection {
  /** Content domain */
  domain: Domain;

  /** Section title (e.g., "Your Daily Music Mix") */
  title: string;

  /** Section description/subtitle */
  description?: string;

  /** Items in this section */
  items: DailyDropItem[];

  /** Section-level score (0-1, average relevance of items) */
  section_score: number;

  /** Total items in this section */
  item_count: number;
}

/**
 * Individual item in a Daily Drop section
 */
export interface DailyDropItem {
  /** Reference to the Item ID */
  item_id: string; // UUID

  /** Rank/position in the section (1-indexed) */
  rank: number;

  /** Match score (0-1, higher = better match) */
  score: number;

  /** Human-readable reasons for recommendation */
  reasons: string[];

  /** Whether this item is sponsored/promoted */
  sponsored: boolean;

  /** Explanation category for primary reason */
  explanation_type: ExplanationType;
}

/**
 * Explanation types for why an item was recommended
 */
export type ExplanationType =
  | 'interest_match' // Matches user's stated interests
  | 'behavioral' // Based on interaction history
  | 'similarity' // Similar to items user liked
  | 'trending' // Popular/trending content
  | 'diversity' // Added for variety/exploration
  | 'sponsored'; // Promoted content

/**
 * Package-level metadata
 */
export interface PackageMetadata {
  /** Total number of items across all sections */
  total_items: number;

  /** Domains included in this package */
  domains_included: Domain[];

  /** Time taken to generate package (milliseconds) */
  generation_time_ms: number;

  /** Ranker algorithm version */
  ranker_version: string;

  /** Whether package includes sponsored content */
  has_sponsored: boolean;

  /** Average score across all items */
  average_score: number;
}

// ========================================
// Zod Validation Schemas
// ========================================

const DomainSchema = z.enum(['music', 'news', 'recipes', 'learning', 'events']);

const ExplanationTypeSchema = z.enum([
  'interest_match',
  'behavioral',
  'similarity',
  'trending',
  'diversity',
  'sponsored',
]);

const PersonalizationMetadataSchema = z.object({
  preference_vectors_used: z.array(z.string().uuid()),
  interests_matched: z.array(z.string().uuid()),
  constraints_applied: z.array(z.string().uuid()),
  diversity_score: z.number().min(0).max(1),
  exploration_ratio: z.number().min(0).max(1),
});

const DailyDropItemSchema = z.object({
  item_id: z.string().uuid(),
  rank: z.number().int().positive(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()).min(1),
  sponsored: z.boolean(),
  explanation_type: ExplanationTypeSchema,
});

const DailyDropSectionSchema = z.object({
  domain: DomainSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(DailyDropItemSchema).min(1),
  section_score: z.number().min(0).max(1),
  item_count: z.number().int().min(0),
});

const PackageMetadataSchema = z.object({
  total_items: z.number().int().min(0),
  domains_included: z.array(DomainSchema).min(1),
  generation_time_ms: z.number().int().min(0),
  ranker_version: z.string().min(1),
  has_sponsored: z.boolean(),
  average_score: z.number().min(0).max(1),
});

export const DailyDropPackageSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  generated_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  version: z.number().int().positive(),
  personalization: PersonalizationMetadataSchema,
  sections: z.array(DailyDropSectionSchema).min(1),
  metadata: PackageMetadataSchema,
});

// Refinement: Validate that item_count matches actual items array length
export const DailyDropPackageSchemaRefined = DailyDropPackageSchema.refine(
  (pkg) => {
    return pkg.sections.every((section) => section.item_count === section.items.length);
  },
  {
    message: 'Section item_count must match items array length',
  }
).refine(
  (pkg) => {
    const totalItems = pkg.sections.reduce((sum, section) => sum + section.items.length, 0);
    return pkg.metadata.total_items === totalItems;
  },
  {
    message: 'Package metadata.total_items must match sum of all section items',
  }
).refine(
  (pkg) => {
    const domainsInSections = new Set(pkg.sections.map((s) => s.domain));
    const domainsInMetadata = new Set(pkg.metadata.domains_included);
    return (
      domainsInSections.size === domainsInMetadata.size &&
      [...domainsInSections].every((d) => domainsInMetadata.has(d))
    );
  },
  {
    message: 'Package metadata.domains_included must match domains in sections',
  }
);

// ========================================
// Validation Helper Functions
// ========================================

/**
 * Validate a Daily Drop package
 * @throws {ZodError} if validation fails
 */
export function validateDailyDropPackage(data: unknown): DailyDropPackage {
  return DailyDropPackageSchemaRefined.parse(data);
}

/**
 * Safely validate a Daily Drop package
 * @returns Validation result with success/error
 */
export function safeParseDailyDropPackage(data: unknown) {
  return DailyDropPackageSchemaRefined.safeParse(data);
}

// ========================================
// Type Guards
// ========================================

export function isDailyDropPackage(value: unknown): value is DailyDropPackage {
  return DailyDropPackageSchemaRefined.safeParse(value).success;
}

// ========================================
// Export Zod Schemas
// ========================================

export {
  DomainSchema,
  ExplanationTypeSchema,
  PersonalizationMetadataSchema,
  DailyDropItemSchema,
  DailyDropSectionSchema,
  PackageMetadataSchema,
};
