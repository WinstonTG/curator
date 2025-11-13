/**
 * Preference Graph Types
 *
 * User preferences stored as a graph structure with:
 * - Interests (what users like)
 * - Constraints (what users avoid/restrict)
 * - Vectors (semantic embeddings for matching)
 * - History (interaction tracking)
 */

import type { Domain } from './item';

/**
 * User profile with authentication info
 */
export interface User {
  id: string; // UUID
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  last_login?: string; // ISO 8601
  oauth_providers: ('spotify' | 'google')[];
}

/**
 * User interest/preference
 * Represents things a user likes or wants to discover
 */
export interface Interest {
  id: string; // UUID
  user_id: string;
  domain: Domain;
  type: InterestType;
  value: string; // Genre, topic, cuisine, etc.
  weight: number; // 0-1, strength of preference
  source: InterestSource;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export type InterestType =
  // Music
  | 'genre'
  | 'artist'
  | 'mood'
  // News
  | 'topic'
  | 'publication'
  | 'category'
  // Recipes
  | 'cuisine'
  | 'dish_type'
  // Learning
  | 'skill'
  | 'subject'
  // Events
  | 'event_type'
  | 'location';

export type InterestSource =
  | 'explicit' // User directly specified
  | 'inferred' // Learned from behavior
  | 'imported'; // From OAuth (e.g., Spotify history)

/**
 * User constraint/restriction
 * Represents things a user wants to avoid or filter out
 */
export interface Constraint {
  id: string; // UUID
  user_id: string;
  domain: Domain;
  type: ConstraintType;
  value: string;
  reason?: string; // Optional explanation
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export type ConstraintType =
  // Music
  | 'dislike_genre'
  | 'dislike_artist'
  // News
  | 'block_publication'
  | 'block_topic'
  | 'bias_filter' // Filter by political bias
  // Recipes
  | 'dietary_restriction' // vegetarian, vegan, etc.
  | 'allergen' // nuts, shellfish, etc.
  | 'dislike_cuisine'
  // Learning
  | 'skill_level_max' // Don't show advanced if beginner
  | 'price_max' // Budget constraint
  // Events
  | 'location_exclude'
  | 'age_restriction';

/**
 * Preference vector for semantic matching
 * Stores embeddings derived from user preferences
 */
export interface PreferenceVector {
  id: string; // UUID
  user_id: string;
  domain: Domain;
  vector: number[]; // 1536-dim embedding
  metadata: {
    generated_from: string[]; // IDs of interests/constraints used
    last_updated: string; // ISO 8601
    version: number;
  };
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * User interaction history
 * Tracks user actions for preference learning
 */
export interface InteractionHistory {
  id: string; // UUID
  user_id: string;
  item_id: string; // Reference to recommended item
  domain: Domain;
  action: 'viewed' | 'saved' | 'tried' | 'attended' | 'purchased' | 'dismissed';
  feedback?: 'liked' | 'disliked' | 'irrelevant'; // Optional explicit feedback
  context?: {
    time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
    weather?: string;
    location?: string;
  };
  timestamp: string; // ISO 8601
}

/**
 * Complete user preference graph
 */
export interface UserPreferences {
  user: User;
  interests: Interest[];
  constraints: Constraint[];
  vectors: PreferenceVector[];
  recent_history: InteractionHistory[];
}

/**
 * Preference creation payloads (without system-generated fields)
 */
export type CreateUserPayload = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type CreateInterestPayload = Omit<Interest, 'id' | 'created_at' | 'updated_at'>;
export type CreateConstraintPayload = Omit<Constraint, 'id' | 'created_at' | 'updated_at'>;
export type CreatePreferenceVectorPayload = Omit<PreferenceVector, 'id' | 'created_at' | 'updated_at'>;
export type CreateInteractionHistoryPayload = Omit<InteractionHistory, 'id'>;

/**
 * Preference update payloads
 */
export type UpdateUserPayload = Partial<Omit<User, 'id' | 'created_at'>>;
export type UpdateInterestPayload = Partial<Omit<Interest, 'id' | 'user_id' | 'created_at'>>;
export type UpdateConstraintPayload = Partial<Omit<Constraint, 'id' | 'user_id' | 'created_at'>>;
export type UpdatePreferenceVectorPayload = Partial<Omit<PreferenceVector, 'id' | 'user_id' | 'created_at'>>;

/**
 * Query filters for preferences
 */
export interface PreferenceQueryFilters {
  domain?: Domain;
  type?: InterestType | ConstraintType;
  source?: InterestSource;
  min_weight?: number;
  max_weight?: number;
  created_after?: string; // ISO 8601
  created_before?: string; // ISO 8601
}
