/**
 * Unified Item Schema - Zod Validators
 *
 * Runtime validation for item payloads using Zod.
 * Generates JSON Schema for API documentation.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { Domain, ItemAction } from '@curator/types';

/**
 * Domain enum
 */
export const DomainSchema = z.enum(['music', 'news', 'recipes', 'learning', 'events']);

/**
 * Item action enum
 */
export const ItemActionSchema = z.enum(['save', 'try', 'attend', 'purchase']);

/**
 * Source schema
 */
export const SourceSchema = z.object({
  name: z.string().min(1, 'Source name is required'),
  id: z.string().min(1, 'Source ID is required'),
  url: z.string().url('Invalid source URL').optional(),
  reputation_score: z.number().min(0).max(100).optional(),
});

/**
 * Music metadata schema
 */
export const MusicMetadataSchema = z.object({
  domain: z.literal('music'),
  spotify_id: z.string().optional(),
  artists: z.array(z.string()).min(1, 'At least one artist required'),
  album: z.string().optional(),
  duration_seconds: z.number().positive().optional(),
  genres: z.array(z.string()),
  mood: z.array(z.string()).optional(),
  release_date: z.string().optional(),
  popularity: z.number().min(0).max(100).optional(),
  preview_url: z.string().url().optional(),
  image_url: z.string().url().optional(),
});

/**
 * News metadata schema
 */
export const NewsMetadataSchema = z.object({
  domain: z.literal('news'),
  author: z.string().optional(),
  publication: z.string().min(1, 'Publication name required'),
  published_at: z.string().datetime('Invalid ISO 8601 date'),
  category: z.string().min(1, 'Category required'),
  bias: z.enum(['left', 'center-left', 'center', 'center-right', 'right']).optional(),
  credibility_tier: z.enum(['trusted', 'verified', 'unverified', 'risky', 'blocked']).optional(),
  read_time_minutes: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  breaking: z.boolean().optional(),
});

/**
 * Recipe metadata schema
 */
export const RecipeMetadataSchema = z.object({
  domain: z.literal('recipes'),
  author: z.string().optional(),
  cuisine: z.array(z.string()).min(1, 'At least one cuisine required'),
  dietary: z.array(
    z.enum(['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo'])
  ),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  prep_time_minutes: z.number().nonnegative(),
  cook_time_minutes: z.number().nonnegative(),
  total_time_minutes: z.number().nonnegative(),
  servings: z.number().positive(),
  ingredients: z.array(z.string()).min(1, 'At least one ingredient required'),
  instructions: z.array(z.string()).optional(),
  nutrition: z.object({
    calories: z.number().nonnegative().optional(),
    protein_g: z.number().nonnegative().optional(),
    carbs_g: z.number().nonnegative().optional(),
    fat_g: z.number().nonnegative().optional(),
  }).optional(),
  image_url: z.string().url().optional(),
});

/**
 * Learning metadata schema
 */
export const LearningMetadataSchema = z.object({
  domain: z.literal('learning'),
  instructor: z.string().min(1, 'Instructor name required'),
  platform: z.string().min(1, 'Platform name required'),
  type: z.enum(['course', 'tutorial', 'article', 'video', 'book']),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'all-levels']),
  duration: z.object({
    hours: z.number().positive().optional(),
    weeks: z.number().positive().optional(),
  }).optional(),
  skills: z.array(z.string()).min(1, 'At least one skill required'),
  price_usd: z.number().nonnegative(),
  rating: z.number().min(0).max(5).optional(),
  enrollments: z.number().nonnegative().optional(),
  certificate: z.boolean().optional(),
  image_url: z.string().url().optional(),
});

/**
 * Event metadata schema
 */
export const EventMetadataSchema = z.object({
  domain: z.literal('events'),
  organizer: z.string().min(1, 'Organizer name required'),
  type: z.enum(['concert', 'meetup', 'workshop', 'conference', 'festival', 'sports', 'other']),
  event_date: z.string().datetime('Invalid ISO 8601 date'),
  event_end_date: z.string().datetime('Invalid ISO 8601 date').optional(),
  venue: z.string().min(1, 'Venue name required'),
  location: z.object({
    city: z.string().min(1, 'City required'),
    state: z.string().optional(),
    country: z.string().min(1, 'Country required'),
    address: z.string().optional(),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }).optional(),
  }),
  price_range: z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
  }).optional(),
  tickets_available: z.boolean().optional(),
  capacity: z.number().positive().optional(),
  age_restriction: z.string().optional(),
  image_url: z.string().url().optional(),
});

/**
 * Domain metadata discriminated union
 */
export const DomainMetadataSchema = z.discriminatedUnion('domain', [
  MusicMetadataSchema,
  NewsMetadataSchema,
  RecipeMetadataSchema,
  LearningMetadataSchema,
  EventMetadataSchema,
]);

/**
 * Base item schema
 */
export const BaseItemSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
  domain: DomainSchema,
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  source: SourceSchema,
  embeddings: z.array(z.number()).length(1536, 'Embeddings must be 1536 dimensions').optional(),
  topics: z.array(z.string()).min(1, 'At least one topic required'),
  actions: z.array(ItemActionSchema).min(1, 'At least one action required'),
  sponsored: z.boolean(),
  created_at: z.string().datetime('Invalid ISO 8601 date'),
  updated_at: z.string().datetime('Invalid ISO 8601 date').optional(),
  meta: DomainMetadataSchema,
});

/**
 * Complete item schema with metadata validation
 */
const ItemSchemaRefined = BaseItemSchema.refine(
  (item) => item.domain === item.meta.domain,
  {
    message: 'Item domain must match metadata domain',
    path: ['meta', 'domain'],
  }
);

export const ItemSchema = ItemSchemaRefined;

/**
 * Item creation payload schema (without system-generated fields)
 */
export const CreateItemSchema = BaseItemSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).refine(
  (item) => item.domain === item.meta.domain,
  {
    message: 'Item domain must match metadata domain',
    path: ['meta', 'domain'],
  }
);

/**
 * Item update payload schema (partial fields)
 */
export const UpdateItemSchema = BaseItemSchema.partial().omit({
  id: true,
  created_at: true,
}).refine(
  (item) => !item.meta || !item.domain || item.domain === item.meta.domain,
  {
    message: 'Item domain must match metadata domain',
    path: ['meta', 'domain'],
  }
);

/**
 * Validate an item payload
 */
export function validateItem(data: unknown) {
  return ItemSchema.parse(data);
}

/**
 * Validate a create item payload
 */
export function validateCreateItem(data: unknown) {
  return CreateItemSchema.parse(data);
}

/**
 * Validate an update item payload
 */
export function validateUpdateItem(data: unknown) {
  return UpdateItemSchema.parse(data);
}

/**
 * Safe validation with error handling
 */
export function safeValidateItem(data: unknown) {
  return ItemSchema.safeParse(data);
}

/**
 * Generate JSON Schema from Zod schema
 */
export function toJSONSchema() {
  return zodToJsonSchema(ItemSchema, {
    name: 'Item',
    $refStrategy: 'none',
  });
}

// Schemas are already exported above
