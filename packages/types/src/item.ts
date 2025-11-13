/**
 * Unified Item Schema - TypeScript Types
 *
 * Represents content items across all 5 domains:
 * - Music (songs, playlists, albums)
 * - News (articles, blog posts)
 * - Recipes (meal plans, cooking instructions)
 * - Learning (courses, tutorials, resources)
 * - Events (concerts, meetups, workshops)
 */

/**
 * Content domains supported by Curator
 */
export type Domain = 'music' | 'news' | 'recipes' | 'learning' | 'events';

/**
 * User actions available for items
 */
export type ItemAction = 'save' | 'try' | 'attend' | 'purchase';

/**
 * Base item interface - common fields across all domains
 */
export interface BaseItem {
  /** Unique identifier for the item */
  id: string;

  /** Content domain */
  domain: Domain;

  /** Item title/name */
  title: string;

  /** Brief description or snippet */
  description?: string;

  /** Source of the item (API, partner, user-generated) */
  source: {
    /** Source name (e.g., "Spotify", "News API", "Spoonacular") */
    name: string;
    /** Source identifier (e.g., API provider ID) */
    id: string;
    /** URL to original content */
    url?: string;
    /** Source reputation score (0-100, from safety standards) */
    reputation_score?: number;
  };

  /** Vector embeddings for semantic search (1536-dim for OpenAI ada-002) */
  embeddings?: number[];

  /** Topics, tags, or categories */
  topics: string[];

  /** Available actions for this item */
  actions: ItemAction[];

  /** Whether this is sponsored/promoted content */
  sponsored: boolean;

  /** Timestamps */
  created_at: string; // ISO 8601
  updated_at?: string; // ISO 8601

  /** Domain-specific metadata */
  meta: DomainMetadata;
}

/**
 * Domain-specific metadata union type
 */
export type DomainMetadata =
  | MusicMetadata
  | NewsMetadata
  | RecipeMetadata
  | LearningMetadata
  | EventMetadata;

/**
 * Music domain metadata
 */
export interface MusicMetadata {
  domain: 'music';
  /** Spotify track/playlist/album ID */
  spotify_id?: string;
  /** Artist name(s) */
  artists: string[];
  /** Album name */
  album?: string;
  /** Duration in seconds */
  duration_seconds?: number;
  /** Musical genres */
  genres: string[];
  /** Mood/vibe (upbeat, chill, energetic, etc.) */
  mood?: string[];
  /** Release date */
  release_date?: string;
  /** Popularity score (0-100) */
  popularity?: number;
  /** Preview audio URL */
  preview_url?: string;
  /** Album artwork URL */
  image_url?: string;
}

/**
 * News domain metadata
 */
export interface NewsMetadata {
  domain: 'news';
  /** Article author/byline */
  author?: string;
  /** Publication name */
  publication: string;
  /** Published date */
  published_at: string; // ISO 8601
  /** Article category (tech, politics, business, etc.) */
  category: string;
  /** Political bias (from Media Bias/Fact Check) */
  bias?: 'left' | 'center-left' | 'center' | 'center-right' | 'right';
  /** Source credibility tier (from safety standards) */
  credibility_tier?: 'trusted' | 'verified' | 'unverified' | 'risky' | 'blocked';
  /** Estimated read time (minutes) */
  read_time_minutes?: number;
  /** Featured image URL */
  image_url?: string;
  /** Whether this is breaking news */
  breaking?: boolean;
}

/**
 * Recipe domain metadata
 */
export interface RecipeMetadata {
  domain: 'recipes';
  /** Recipe author/chef */
  author?: string;
  /** Cuisine type (italian, thai, mexican, etc.) */
  cuisine: string[];
  /** Dietary restrictions/labels */
  dietary: ('vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'keto' | 'paleo')[];
  /** Difficulty level */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Prep time (minutes) */
  prep_time_minutes: number;
  /** Cook time (minutes) */
  cook_time_minutes: number;
  /** Total time (minutes) */
  total_time_minutes: number;
  /** Number of servings */
  servings: number;
  /** Ingredient list */
  ingredients: string[];
  /** Step-by-step instructions */
  instructions?: string[];
  /** Nutritional information */
  nutrition?: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  };
  /** Recipe image URL */
  image_url?: string;
}

/**
 * Learning domain metadata
 */
export interface LearningMetadata {
  domain: 'learning';
  /** Instructor/author name */
  instructor: string;
  /** Platform (Coursera, Udemy, YouTube, etc.) */
  platform: string;
  /** Course type */
  type: 'course' | 'tutorial' | 'article' | 'video' | 'book';
  /** Skill level */
  level: 'beginner' | 'intermediate' | 'advanced' | 'all-levels';
  /** Duration/length */
  duration?: {
    hours?: number;
    weeks?: number;
  };
  /** Skills/topics covered */
  skills: string[];
  /** Price (USD, 0 for free) */
  price_usd: number;
  /** Student rating (0-5) */
  rating?: number;
  /** Number of enrollments/students */
  enrollments?: number;
  /** Certificate offered */
  certificate?: boolean;
  /** Thumbnail image URL */
  image_url?: string;
}

/**
 * Events domain metadata
 */
export interface EventMetadata {
  domain: 'events';
  /** Event organizer */
  organizer: string;
  /** Event type */
  type: 'concert' | 'meetup' | 'workshop' | 'conference' | 'festival' | 'sports' | 'other';
  /** Event date/time */
  event_date: string; // ISO 8601
  /** Event end date/time (for multi-day events) */
  event_end_date?: string; // ISO 8601
  /** Venue name */
  venue: string;
  /** Location */
  location: {
    city: string;
    state?: string;
    country: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  /** Ticket price range (USD) */
  price_range?: {
    min: number;
    max: number;
  };
  /** Ticket availability */
  tickets_available?: boolean;
  /** Capacity */
  capacity?: number;
  /** Age restriction */
  age_restriction?: string;
  /** Event image/poster URL */
  image_url?: string;
}

/**
 * Complete Item type
 */
export type Item = BaseItem;

/**
 * Item creation payload (without system-generated fields)
 */
export type CreateItemPayload = Omit<Item, 'id' | 'created_at' | 'updated_at'>;

/**
 * Item update payload (partial fields)
 */
export type UpdateItemPayload = Partial<Omit<Item, 'id' | 'created_at'>>;
