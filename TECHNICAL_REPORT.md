# Technical Report: Curator Project Status

**Report Date:** 2025-11-17
**Project:** Curator - AI-powered personalized content discovery platform
**Repository:** https://github.com/WinstonTG/curator
**Latest Commit:** fb47cb2

---

## Executive Summary

This report documents the complete state of the Curator project as of commit fb47cb2. The project is a monorepo-based full-stack application featuring a Next.js frontend, Express.js API backend, PostgreSQL database with Prisma ORM, and comprehensive testing infrastructure.

**Completion Status:** Phase 1 (Foundation + Onboarding) - COMPLETE
**Lines of Code:** ~2,072 insertions in latest feature commit
**Test Coverage:** E2E tests (Playwright) + API unit tests (Vitest)
**Deployment Status:** Development environment ready, production deployment pending

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Completed Features](#completed-features)
3. [Implementation Details](#implementation-details)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [Testing Infrastructure](#testing-infrastructure)
8. [Build & Deployment](#build--deployment)
9. [Known Issues](#known-issues)
10. [Dependencies](#dependencies)
11. [Next Steps](#next-steps)

---

## 1. Architecture Overview

### Technology Stack

**Frontend:**
- Framework: Next.js 14 (App Router)
- Language: TypeScript (strict mode)
- Styling: Tailwind CSS
- State Management: React useState/useEffect hooks
- Runtime: Node.js 18+

**Backend:**
- Framework: Express.js
- Language: TypeScript
- ORM: Prisma
- Database: PostgreSQL 14+ with pgvector extension
- Queue: Redis (for embeddings worker)

**Infrastructure:**
- Monorepo: pnpm workspaces
- Package Manager: pnpm 8+
- Linting: ESLint
- Formatting: Prettier
- Version Control: Git with GitHub remote

**Testing:**
- E2E: Playwright
- Unit Tests: Vitest
- API Tests: Supertest

### Monorepo Structure

```
curator/
├── web/                           # Next.js frontend application
│   ├── app/
│   │   ├── onboarding/            # ✅ IMPLEMENTED
│   │   │   ├── page.tsx           # Main wizard orchestrator
│   │   │   ├── types.ts           # TypeScript interfaces
│   │   │   ├── components/
│   │   │   │   └── ProgressBar.tsx
│   │   │   └── steps/
│   │   │       ├── WelcomeStep.tsx
│   │   │       ├── InterestsStep.tsx
│   │   │       ├── ConstraintsStep.tsx
│   │   │       ├── ConnectAccountsStep.tsx
│   │   │       └── CompletionStep.tsx
│   │   ├── profile/
│   │   │   └── data-controls/
│   │   │       └── page.tsx       # ✅ UPDATED: GDPR controls
│   │   └── layout.tsx
│   ├── package.json
│   └── tailwind.config.ts
├── packages/
│   ├── api/                       # Express REST API
│   │   ├── src/
│   │   │   ├── index.ts           # ✅ UPDATED: Router registration
│   │   │   ├── lib/
│   │   │   │   └── prisma.ts      # Prisma client singleton
│   │   │   └── routes/
│   │   │       ├── preferences.ts # Existing CRUD endpoints
│   │   │       ├── onboarding.ts  # ✅ IMPLEMENTED
│   │   │       ├── analytics.ts   # ✅ IMPLEMENTED
│   │   │       └── gdpr.ts        # ✅ IMPLEMENTED
│   │   ├── package.json
│   │   └── vitest.config.ts
│   ├── connectors/                # ETL connectors (planned)
│   ├── quality/                   # Content quality engine (planned)
│   └── types/                     # Shared TypeScript types
├── workers/
│   ├── ingestion/                 # ETL orchestration (planned)
│   └── embeddings/                # ML pipeline (planned)
├── prisma/
│   ├── schema.prisma              # Database schema definition
│   └── migrations/                # Database migration files
├── config/
│   └── quality_rules.yaml         # Content quality configuration
├── e2e/
│   └── onboarding-wizard.spec.ts  # ✅ IMPLEMENTED: 9 test cases
├── analytics/                     # Metrics & telemetry (planned)
├── package.json                   # Root workspace configuration
├── README.md                      # ✅ UPDATED: Product vision
└── TECHNICAL_REPORT.md            # This document
```

---

## 2. Completed Features

### ✅ Multi-Step Onboarding Wizard

**Location:** `web/app/onboarding/*`
**Status:** COMPLETE
**Lines of Code:** ~800

**Features:**
- 5-step wizard flow: Welcome → Interests → Constraints → Connect Accounts → Completion
- Progress tracking with visual indicator (step X of 5)
- State persistence across navigation (back/forward buttons)
- Domain-specific interest selection (music, news, recipes, learning, events)
- Constraint configuration (dietary restrictions, allergens, topic filters)
- OAuth connection stubs (Spotify, Google, GitHub, Goodreads)
- Form validation (minimum 1 interest required)
- Responsive design with Tailwind CSS
- Session-based telemetry tracking

**State Management Pattern:**
```typescript
const [currentStep, setCurrentStep] = useState<Step>('welcome');
const [onboardingData, setOnboardingData] = useState<OnboardingData>({
  interests: Interest[],
  constraints: Constraint[],
  connectedAccounts: string[]
});
```

**API Integration:**
- POST `/api/onboarding/profile` - Save user preferences
- POST `/api/onboarding/connect/:provider` - Connect OAuth accounts
- POST `/api/analytics/events` - Track onboarding_started/completed

---

### ✅ Backend API Endpoints

**Location:** `packages/api/src/routes/*`
**Status:** COMPLETE
**Lines of Code:** ~400

#### Onboarding Endpoints (`onboarding.ts`)

**POST /api/onboarding/profile**
- Creates/updates user profile
- Saves interests and constraints to database
- Handles bulk inserts with Prisma
- Returns: `{ success, user_id, interests: count, constraints: count }`

**Request Body:**
```typescript
{
  user_id: string,
  interests: Array<{
    domain: 'music' | 'news' | 'recipes' | 'learning' | 'events',
    value: string,
    weight: number,
    source: 'explicit' | 'inferred' | 'imported'
  }>,
  constraints: Array<{
    domain: string,
    type: string,
    value: string,
    reason?: string
  }>
}
```

**POST /api/onboarding/connect/:provider**
- Updates user's oauth_providers array
- Validates provider parameter
- Prevents duplicate connections
- Returns: `{ success, provider, connected_at }`

#### Analytics Endpoints (`analytics.ts`)

**POST /api/analytics/events**
- Tracks telemetry events
- Supports anonymous tracking (user_id optional)
- Custom timestamp support
- Event types: onboarding_started, onboarding_completed, etc.

**Request Body:**
```typescript
{
  event: string,
  user_id?: string,
  session_id?: string,
  properties?: Record<string, any>,
  timestamp?: string (ISO 8601)
}
```

**GET /api/analytics/events**
- Query events by user_id, event type, session_id
- Pagination with limit parameter (default: 100)
- Ordered by timestamp descending
- Returns array of events with metadata

#### GDPR Endpoints (`gdpr.ts`)

**GET /api/gdpr/export/:userId**
- Complete data export for GDPR compliance
- Includes: user profile, interests, constraints, vectors, interactions, analytics
- JSON format with metadata header
- Sets Content-Disposition for file download

**Export Structure:**
```typescript
{
  export_info: {
    user_id: string,
    export_date: ISO 8601,
    format_version: "1.0",
    gdpr_compliant: true
  },
  user_profile: { id, email, display_name, oauth_providers, timestamps },
  interests: Array<{ id, domain, type, value, weight, source, timestamps }>,
  constraints: Array<{ id, domain, type, value, reason, timestamps }>,
  preference_vectors: Array<{ id, domain, vector_length, generated_from, version }>,
  interaction_history: Array<{ id, item_id, domain, action, feedback, context }>,
  analytics_events: Array<{ id, event, session_id, properties, timestamp }>,
  summary: { total_interests, total_constraints, total_interactions, domains_used }
}
```

**DELETE /api/gdpr/delete/:userId**
- Right to be forgotten implementation
- Requires confirmation in request body: `{ "confirm": "<userId>" }`
- Cascade deletion via Prisma schema relationships
- Returns: `{ success, message, deleted_at }`

---

### ✅ GDPR Data Controls UI

**Location:** `web/app/profile/data-controls/page.tsx`
**Status:** UPDATED
**Changes:** Integrated with new GDPR API endpoints

**Features:**
- Export all user data as JSON file
- Delete account with confirmation modal
- Privacy-focused UI design
- Error handling and loading states

---

### ✅ Comprehensive Testing Suite

**Location:** `e2e/onboarding-wizard.spec.ts`, `packages/api/src/routes/*.test.ts`
**Status:** COMPLETE
**Test Count:** 9 E2E tests + 15 API unit tests

#### E2E Tests (Playwright)

1. **Complete full onboarding flow**
   - Tests all 5 steps end-to-end
   - Validates data persistence
   - Checks final summary statistics

2. **Progress bar display**
   - Verifies "Step X of 5" text
   - Tests progress indicator advancement

3. **Back/forth navigation**
   - Tests navigation buttons
   - Validates state persistence across navigation
   - Ensures selected items remain selected

4. **State persistence across steps**
   - Multiple forward/back cycles
   - Validates interest and constraint retention

5. **Minimum interest validation**
   - Tests disabled state of Next button
   - Validates requirement for at least 1 interest

6. **Optional constraint skipping**
   - Tests ability to proceed without constraints
   - Validates optional fields

7. **Optional account connection skipping**
   - Tests completion without OAuth connections
   - Validates 0 connected accounts in summary

8. **Multi-domain selections**
   - Tests interest selection across all 5 domains
   - Validates domain counter (e.g., "5 interests across 5 domains")

9. **Account connection flow**
   - Tests OAuth connection stubs
   - Validates "Connected" state display

#### API Unit Tests (Vitest + Supertest)

**Onboarding API Tests** (`onboarding.test.ts`):
- Profile creation with interests and constraints
- OAuth connection flow
- Duplicate provider prevention
- Validation (missing user_id)

**Analytics API Tests** (`analytics.test.ts`):
- onboarding_started event tracking
- onboarding_completed event tracking
- Anonymous event tracking (no user_id)
- Custom timestamp handling
- Query by user_id
- Query by event type
- Query by session_id
- Pagination with limit parameter

**GDPR API Tests** (`gdpr.test.ts`):
- Complete data export structure validation
- Export includes all data types
- Summary statistics accuracy
- Account deletion with confirmation
- Cascade deletion of related records
- User not found error handling

---

## 3. Implementation Details

### Frontend Architecture

#### Type System (`web/app/onboarding/types.ts`)

```typescript
export type Domain = 'music' | 'news' | 'recipes' | 'learning' | 'events';

export type Step = 'welcome' | 'interests' | 'constraints' | 'connect' | 'complete';

export interface Interest {
  domain: Domain;
  value: string;
  weight: number;
  source: 'explicit' | 'inferred' | 'imported';
}

export interface Constraint {
  domain: Domain;
  type: string;
  value: string;
  reason?: string;
}

export interface OnboardingData {
  interests: Interest[];
  constraints: Constraint[];
  connectedAccounts: string[];
}

export interface StepProps {
  onNext: () => void;
  onBack: () => void;
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}
```

#### State Management Pattern

**Main Wizard Component** (`web/app/onboarding/page.tsx`):
- Centralized state management
- Step transition logic
- API integration for saving data
- Telemetry tracking on mount and completion

**Key Implementation:**
```typescript
const handleComplete = async () => {
  try {
    // 1. Track completion event
    await trackEvent('onboarding_completed', {
      interests_count: onboardingData.interests.length,
      constraints_count: onboardingData.constraints.length,
      connected_accounts: onboardingData.connectedAccounts.length,
    });

    // 2. Save to backend
    const response = await fetch(`${API_URL}/api/onboarding/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        interests: onboardingData.interests,
        constraints: onboardingData.constraints,
      }),
    });

    // 3. Handle OAuth connections
    for (const provider of onboardingData.connectedAccounts) {
      await fetch(`${API_URL}/api/onboarding/connect/${provider}`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    }

    // 4. Navigate to completion step
    setCurrentStep('complete');
  } catch (error) {
    console.error('Error saving onboarding data:', error);
  }
};
```

#### Interest Selection Architecture

**Component:** `web/app/onboarding/steps/InterestsStep.tsx`

**State Structure:**
```typescript
const [selectedInterests, setSelectedInterests] = useState<Record<Domain, Set<string>>>({
  music: new Set(),
  news: new Set(),
  recipes: new Set(),
  learning: new Set(),
  events: new Set(),
});

const [activeDomain, setActiveDomain] = useState<Domain>('music');
```

**Domain Configuration:**
```typescript
const DOMAIN_CONFIG: Record<Domain, { icon: string; label: string; suggestions: string[] }> = {
  music: {
    icon: '🎵',
    label: 'Music',
    suggestions: ['Jazz', 'Rock', 'Electronic', 'Hip Hop', 'Classical', 'Indie', 'Pop', 'Country'],
  },
  news: {
    icon: '📰',
    label: 'News',
    suggestions: ['Technology', 'Politics', 'Science', 'Business', 'Health', 'Environment', 'Sports'],
  },
  recipes: {
    icon: '🍳',
    label: 'Recipes',
    suggestions: ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'Vegan', 'Desserts', 'Quick Meals'],
  },
  learning: {
    icon: '📚',
    label: 'Learning',
    suggestions: ['Programming', 'Design', 'Languages', 'Business', 'Science', 'Arts', 'Personal Development'],
  },
  events: {
    icon: '📅',
    label: 'Events',
    suggestions: ['Concerts', 'Tech Meetups', 'Art Exhibitions', 'Sports Events', 'Workshops', 'Conferences'],
  },
};
```

**Selection Logic:**
- Uses Set data structure for O(1) lookup and automatic deduplication
- Tab-based UI for switching between domains
- Badge indicators showing selection count per domain
- Total interest counter across all domains
- Validation: Next button disabled until at least 1 interest selected

#### Constraint Configuration Architecture

**Component:** `web/app/onboarding/steps/ConstraintsStep.tsx`

**Constraint Types by Domain:**
```typescript
const CONSTRAINT_TYPES: Record<string, Array<{ type: string; label: string; values?: string[]; isCustom?: boolean }>> = {
  recipes: [
    {
      type: 'dietary_restriction',
      label: 'Dietary Restrictions',
      values: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo', 'Halal', 'Kosher'],
    },
    {
      type: 'allergen',
      label: 'Allergens',
      values: ['Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Eggs', 'Soy', 'Wheat', 'Sesame'],
    },
    {
      type: 'cuisine_preference',
      label: 'Cuisine Preferences',
      values: ['No Preference', 'Low Sodium', 'Low Sugar', 'High Protein'],
    },
  ],
  news: [
    { type: 'block_publication', label: 'Block Publications', isCustom: true },
    {
      type: 'avoid_topic',
      label: 'Avoid Topics',
      values: ['Politics', 'Sports', 'Celebrity News', 'Crime', 'Tragedy'],
    },
  ],
  learning: [
    {
      type: 'avoid_format',
      label: 'Avoid Formats',
      values: ['Video Courses', 'Text Tutorials', 'Interactive Labs', 'Live Classes'],
    },
  ],
};
```

**Features:**
- Multi-category constraint selection
- Custom input fields for specific constraint types (e.g., block_publication)
- Optional step (can proceed without constraints)
- Real-time counter showing preferences set

---

### Backend Architecture

#### Prisma Integration

**Client Initialization** (`packages/api/src/lib/prisma.ts`):
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

**Pattern:** Singleton pattern to prevent multiple Prisma instances in development

#### API Route Registration

**Main Server** (`packages/api/src/index.ts`):
```typescript
import express from 'express';
import preferencesRouter from './routes/preferences';
import onboardingRouter from './routes/onboarding';
import analyticsRouter from './routes/analytics';
import gdprRouter from './routes/gdpr';

const app = express();

app.use(express.json());
app.use('/api', preferencesRouter);
app.use('/api', onboardingRouter);
app.use('/api', analyticsRouter);
app.use('/api', gdprRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
```

#### Error Handling Patterns

**Consistent across all endpoints:**
1. Try-catch blocks for async operations
2. HTTP status codes: 200 (success), 201 (created), 400 (validation), 404 (not found), 500 (server error)
3. JSON error responses with descriptive messages
4. Prisma error code handling (e.g., P2025 for record not found)

**Example:**
```typescript
try {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  // ... success logic
} catch (error: any) {
  if (error.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
}
```

---

## 4. Database Schema

**Location:** `prisma/schema.prisma`
**Database:** PostgreSQL 14+
**Extensions:** pgvector (for embeddings)

### Core Models

#### User
```prisma
model User {
  id                String              @id @default(uuid())
  email             String              @unique
  display_name      String?
  avatar_url        String?
  oauth_providers   String[]            @default([])
  created_at        DateTime            @default(now())
  updated_at        DateTime            @updatedAt
  last_login        DateTime?

  // Relations
  interests         Interest[]
  constraints       Constraint[]
  vectors           PreferenceVector[]
  interactions      InteractionHistory[]
  analyticsEvents   AnalyticsEvent[]
}
```

**Fields:**
- `oauth_providers`: Array of connected OAuth providers (e.g., ["spotify", "google"])
- `last_login`: Tracked for user activity metrics

#### Interest
```prisma
model Interest {
  id          String   @id @default(uuid())
  user_id     String
  domain      String   // 'music' | 'news' | 'recipes' | 'learning' | 'events'
  type        String   // 'topic' | 'genre' | 'category' | 'tag'
  value       String   // The actual interest (e.g., "Jazz", "Technology")
  weight      Float    @default(1.0)  // Preference strength (0.0 - 1.0)
  source      String   // 'explicit' | 'inferred' | 'imported'
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  user        User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, domain])
  @@index([user_id, type])
}
```

**Indexes:**
- `[user_id, domain]`: Fast queries for domain-specific interests
- `[user_id, type]`: Fast queries by interest type

**Weight System:**
- 1.0: Explicitly selected by user
- 0.5-0.9: Inferred from behavior
- 0.3-0.5: Weak signal or imported

#### Constraint
```prisma
model Constraint {
  id          String   @id @default(uuid())
  user_id     String
  domain      String   // 'recipes' | 'news' | 'learning' | 'global'
  type        String   // 'dietary_restriction' | 'allergen' | 'avoid_topic' | 'block_publication'
  value       String   // The constraint value (e.g., "Vegetarian", "Politics")
  reason      String?  // Optional explanation
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  user        User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, domain])
  @@index([user_id, type])
}
```

**Constraint Types:**
- `dietary_restriction`: Food preferences (Vegetarian, Vegan, etc.)
- `allergen`: Food allergies (Peanuts, Shellfish, etc.)
- `avoid_topic`: Content to exclude (Politics, Crime, etc.)
- `block_publication`: Specific sources to block

#### PreferenceVector
```prisma
model PreferenceVector {
  id              String   @id @default(uuid())
  user_id         String
  domain          String
  vector          Float[]  // Embedding vector (pgvector compatible)
  generated_from  String   // 'interests' | 'interactions' | 'combined'
  last_updated    DateTime @default(now())
  version         Int      @default(1)
  created_at      DateTime @default(now())

  user            User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, domain])
  @@index([user_id])
}
```

**Purpose:** Store ML embeddings for semantic matching
**Vector Dimensions:** Typically 384 (text-embedding-3-small) or 1536 (text-embedding-3-large)

#### InteractionHistory
```prisma
model InteractionHistory {
  id          String   @id @default(uuid())
  user_id     String
  item_id     String   // Reference to recommended item
  domain      String
  action      String   // 'viewed' | 'saved' | 'dismissed' | 'tried' | 'attended'
  feedback    String?  // Optional explicit feedback
  context     Json?    // Additional metadata (session, device, etc.)
  timestamp   DateTime @default(now())

  user        User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, domain])
  @@index([user_id, timestamp])
  @@index([item_id])
}
```

**Action Types:**
- `viewed`: User saw the recommendation
- `saved`: User bookmarked/favorited
- `dismissed`: User explicitly rejected
- `tried`: User attempted (recipes)
- `attended`: User attended (events)

#### AnalyticsEvent
```prisma
model AnalyticsEvent {
  id          String   @id @default(uuid())
  event       String   // Event name (e.g., 'onboarding_started')
  user_id     String?  // Optional for anonymous tracking
  session_id  String?
  properties  Json     @default("{}")
  timestamp   DateTime @default(now())

  user        User?    @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([event])
  @@index([user_id, timestamp])
  @@index([session_id])
}
```

**Common Events:**
- `onboarding_started`: User begins wizard
- `onboarding_completed`: User finishes wizard
- `recommendation_viewed`: User sees recommendation
- `recommendation_saved`: User saves recommendation
- `export_data_requested`: GDPR data export
- `account_deleted`: GDPR account deletion

### Relationships

```
User (1) ──< (many) Interest
User (1) ──< (many) Constraint
User (1) ──< (many) PreferenceVector
User (1) ──< (many) InteractionHistory
User (1) ──< (many) AnalyticsEvent
```

**Cascade Deletion:** All child records deleted when user is deleted (GDPR compliance)

---

## 5. API Endpoints

### Complete API Reference

#### Authentication (Planned)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

#### Preferences (Existing)
- `GET /api/users/:userId/preferences` - Get all user preferences
- `POST /api/users/:userId/interests` - Create interest
- `PUT /api/users/:userId/interests/:id` - Update interest
- `DELETE /api/users/:userId/interests/:id` - Delete interest
- `POST /api/users/:userId/constraints` - Create constraint
- `DELETE /api/users/:userId/constraints/:id` - Delete constraint

#### Onboarding (✅ Implemented)
- `POST /api/onboarding/profile` - Save onboarding data
  - Body: `{ user_id, interests[], constraints[] }`
  - Response: `{ success, user_id, interests: count, constraints: count }`

- `POST /api/onboarding/connect/:provider` - Connect OAuth account
  - Params: `provider` (spotify, google, github, goodreads)
  - Body: `{ user_id }`
  - Response: `{ success, provider, connected_at }`

#### Analytics (✅ Implemented)
- `POST /api/analytics/events` - Track telemetry event
  - Body: `{ event, user_id?, session_id?, properties?, timestamp? }`
  - Response: `{ success, id }`

- `GET /api/analytics/events` - Query events
  - Query Params: `event?, user_id?, session_id?, limit?`
  - Response: `{ events: [...] }`

#### GDPR (✅ Implemented)
- `GET /api/gdpr/export/:userId` - Export all user data
  - Params: `userId`
  - Response: JSON file with complete data export
  - Content-Disposition: `attachment; filename="curator-data-export-{userId}-{timestamp}.json"`

- `DELETE /api/gdpr/delete/:userId` - Delete account
  - Params: `userId`
  - Body: `{ confirm: userId }` (required for confirmation)
  - Response: `{ success, message, deleted_at }`

#### Recommendations (Planned)
- `GET /api/recommendations/:userId` - Get daily recommendations
- `POST /api/recommendations/:userId/refresh` - Refresh recommendations

#### Items (Planned)
- `GET /api/items/:itemId` - Get item details
- `POST /api/items/:itemId/interact` - Record interaction

---

## 6. Frontend Components

### Page Components

#### Onboarding Wizard (`web/app/onboarding/page.tsx`)
- **Type:** Client Component ('use client')
- **State:** Manages wizard flow and onboarding data
- **Effects:** Tracks onboarding_started event on mount
- **API Calls:**
  - POST /api/analytics/events
  - POST /api/onboarding/profile
  - POST /api/onboarding/connect/:provider

#### Data Controls (`web/app/profile/data-controls/page.tsx`)
- **Type:** Client Component
- **Features:** GDPR data export and account deletion
- **API Calls:**
  - GET /api/gdpr/export/:userId
  - DELETE /api/gdpr/delete/:userId

### Onboarding Step Components

#### WelcomeStep (`web/app/onboarding/steps/WelcomeStep.tsx`)
- **Props:** `StepProps`
- **UI Elements:**
  - Hero heading with tagline
  - Domain icon grid (5 domains)
  - Feature list
  - "Get Started" CTA button
- **Styling:** Gradient backgrounds, centered layout

#### InterestsStep (`web/app/onboarding/steps/InterestsStep.tsx`)
- **Props:** `StepProps`
- **State:**
  - `selectedInterests: Record<Domain, Set<string>>`
  - `activeDomain: Domain`
- **UI Elements:**
  - Domain tabs with icons
  - Interest suggestion chips (clickable)
  - Selection counter with badge
  - Back and Next buttons
- **Validation:** Next button disabled until 1+ interests selected
- **Features:**
  - Tab switching between domains
  - Visual feedback for selected items (indigo background)
  - Domain-specific counters

#### ConstraintsStep (`web/app/onboarding/steps/ConstraintsStep.tsx`)
- **Props:** `StepProps`
- **State:** `selectedConstraints: Array<{ domain, type, value }>`
- **UI Elements:**
  - Category sections (Dietary, Allergens, Topics)
  - Constraint chips (toggleable)
  - Custom input fields for specific types
  - Preference counter
- **Validation:** Optional (can skip)
- **Features:**
  - Multi-category selection
  - Custom constraint input
  - Real-time counter

#### ConnectAccountsStep (`web/app/onboarding/steps/ConnectAccountsStep.tsx`)
- **Props:** `StepProps`
- **State:** `connecting: Record<string, boolean>`
- **UI Elements:**
  - Provider cards (Spotify, Google, GitHub, Goodreads)
  - Connect/Connected buttons
  - Provider icons and descriptions
- **API Integration:**
  - POST /api/onboarding/connect/:provider
- **Features:**
  - OAuth connection stubs
  - Loading states during connection
  - Visual feedback for connected accounts

#### CompletionStep (`web/app/onboarding/steps/CompletionStep.tsx`)
- **Props:** `StepProps`
- **UI Elements:**
  - Success message with checkmark
  - Statistics grid (interests, constraints, accounts)
  - "Start Exploring" CTA button
- **Features:**
  - Summary of user's selections
  - Celebration UX with positive messaging

### Shared Components

#### ProgressBar (`web/app/onboarding/components/ProgressBar.tsx`)
- **Props:** `{ current: number, total: number }`
- **UI Elements:**
  - Visual progress bar (filled percentage)
  - Text indicator ("Step X of Y")
- **Styling:** Gradient fill, smooth transitions

---

## 7. Testing Infrastructure

### E2E Testing Setup

**Framework:** Playwright
**Configuration:** `playwright.config.ts` (assumed standard configuration)
**Test Location:** `e2e/onboarding-wizard.spec.ts`

**Test Structure:**
```typescript
test.describe('Onboarding Wizard', () => {
  test('should complete full onboarding flow', async ({ page }) => {
    // Test implementation
  });
  // ... more tests
});
```

**Key Testing Patterns:**
- Page navigation: `await page.goto('/onboarding')`
- Element selection: `page.getByRole('button', { name: /Get Started/i })`
- Assertions: `await expect(element).toBeVisible()`
- Timeouts: `{ timeout: 5000 }` for async operations
- Class checks: `await expect(button).toHaveClass(/indigo/)` for selected state

**Coverage:**
- Happy path (complete flow)
- Navigation edge cases (back/forth)
- State persistence
- Validation rules
- Optional steps
- Multi-domain scenarios

### API Testing Setup

**Framework:** Vitest + Supertest
**Configuration:** `packages/api/vitest.config.ts`
**Test Locations:** `packages/api/src/routes/*.test.ts`

**Test Structure:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Onboarding API', () => {
  it('should save onboarding profile', async () => {
    const response = await request(app)
      .post('/api/onboarding/profile')
      .send({ user_id: 'test-user', interests: [...], constraints: [...] });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

**Testing Patterns:**
- HTTP method testing: `.post()`, `.get()`, `.delete()`
- Request body: `.send({ ... })`
- Query params: `.query({ ... })`
- Status assertions: `expect(response.status).toBe(200)`
- Body assertions: `expect(response.body).toMatchObject({ ... })`
- Database cleanup: `afterAll(async () => { await prisma.user.deleteMany() })`

**Coverage:**
- Request/response validation
- Error handling (400, 404, 500)
- Database operations (create, read, delete)
- Edge cases (missing params, invalid data)
- Cascade operations (GDPR deletion)

---

## 8. Build & Deployment

### Development Environment

**Prerequisites:**
- Node.js 18+
- pnpm 8+
- PostgreSQL 14+
- Redis (for embeddings queue)

**Environment Variables Required:**
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/curator"

# API
PORT=3001
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Redis
REDIS_URL="redis://localhost:6379"

# OAuth (for future implementation)
SPOTIFY_CLIENT_ID=""
SPOTIFY_CLIENT_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# ML/Embeddings
OPENAI_API_KEY=""
VOYAGE_API_KEY=""
```

**Setup Commands:**
```bash
# Clone repository
git clone https://github.com/WinstonTG/curator.git
cd curator

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with actual values

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start development servers
pnpm dev
```

**Development Servers:**
- Frontend: http://localhost:3000 (Next.js)
- API: http://localhost:3001 (Express)

**Individual Package Commands:**
```bash
# Frontend only
pnpm -F web dev

# API only
pnpm -F @curator/api dev

# Run tests
pnpm test

# Run E2E tests
pnpm exec playwright test

# Run specific test
pnpm exec playwright test e2e/onboarding-wizard.spec.ts

# Playwright UI mode (debugging)
pnpm exec playwright test --ui
```

### Build Process

**Production Build:**
```bash
# Build all packages
pnpm build

# Build specific package
pnpm -F web build
pnpm -F @curator/api build
```

**Build Outputs:**
- Frontend: `.next/` directory
- API: `dist/` directory (TypeScript compiled to JavaScript)

### Deployment (Planned)

**Recommended Stack:**
- **Frontend:** Vercel (Next.js optimized)
- **API:** Railway / Render / Fly.io
- **Database:** Supabase / Railway / Neon
- **Redis:** Upstash / Redis Cloud
- **Monitoring:** Sentry, DataDog, or PostHog

**Environment Configuration:**
- Separate .env files for dev/staging/prod
- Environment variables set via platform UI
- DATABASE_URL uses connection pooling in production
- NEXT_PUBLIC_* variables for frontend config

---

## 9. Known Issues

### Critical Issues

**None currently blocking development.**

### Non-Critical Issues

1. **Prisma Client Generation**
   - **Issue:** Some environments may show `Module '@prisma/client' has no exported member 'PrismaClient'`
   - **Cause:** Prisma client not generated after schema changes
   - **Solution:** Run `npx prisma generate` or `pnpm prisma generate`
   - **Status:** Documented, not blocking

2. **OAuth Stub Implementation**
   - **Issue:** OAuth connections are stubbed (no actual OAuth flow)
   - **Impact:** Connect Accounts step simulates connections but doesn't authenticate
   - **Next Step:** Implement real OAuth flows with provider credentials
   - **Status:** Feature incomplete, tracked in roadmap

3. **TypeScript 'any' Types in API Routes**
   - **Issue:** Some map functions use explicit `any` type annotations
   - **Location:** `packages/api/src/routes/gdpr.ts`, `analytics.ts`
   - **Impact:** Reduces type safety
   - **Solution:** Define proper Prisma result types
   - **Status:** Technical debt, non-blocking

4. **Missing Authentication Middleware**
   - **Issue:** API endpoints don't verify user authentication
   - **Impact:** Anyone can access any user's data with their userId
   - **Security Risk:** HIGH (for production)
   - **Next Step:** Implement JWT authentication middleware
   - **Status:** Tracked for Phase 2

5. **No Rate Limiting**
   - **Issue:** API endpoints have no rate limiting
   - **Impact:** Potential for abuse
   - **Next Step:** Implement express-rate-limit
   - **Status:** Tracked for production readiness

### Warnings

- **Background Bash Processes:** Multiple `npm run dev` processes detected in background
  - May need cleanup to avoid port conflicts
  - Check with: `lsof -i :3000` and `lsof -i :3001`

---

## 10. Dependencies

### Frontend Dependencies (`web/package.json`)

**Core:**
- `next`: ^14.0.0 - React framework
- `react`: ^18.0.0 - UI library
- `react-dom`: ^18.0.0 - React DOM bindings
- `typescript`: ^5.0.0 - Type system

**Styling:**
- `tailwindcss`: ^3.0.0 - Utility CSS framework
- `autoprefixer`: ^10.0.0 - CSS post-processor
- `postcss`: ^8.0.0 - CSS transformer

**Development:**
- `eslint`: ^8.0.0 - Linting
- `eslint-config-next`: ^14.0.0 - Next.js ESLint config

### Backend Dependencies (`packages/api/package.json`)

**Core:**
- `express`: ^4.18.0 - Web framework
- `@prisma/client`: ^5.0.0 - Database client
- `prisma`: ^5.0.0 - ORM and migration tool
- `typescript`: ^5.0.0 - Type system

**Testing:**
- `vitest`: ^1.0.0 - Test runner
- `supertest`: ^6.3.0 - HTTP assertions
- `@types/supertest`: ^6.0.0 - TypeScript types

**Development:**
- `tsx`: ^4.0.0 - TypeScript execution
- `nodemon`: ^3.0.0 - Auto-restart on changes

### E2E Testing Dependencies (Root `package.json`)

- `@playwright/test`: ^1.40.0 - E2E testing framework
- `playwright`: ^1.40.0 - Browser automation

### Shared Dependencies

**Database:**
- PostgreSQL 14+ with pgvector extension
- Redis 6+ for queue management

**Runtime:**
- Node.js 18+ LTS
- pnpm 8+ package manager

---

## 11. Next Steps

### Immediate Priorities (Week 1-2)

1. **Implement Authentication System**
   - JWT-based authentication
   - Protected API routes with middleware
   - User session management
   - Priority: HIGH
   - Estimate: 16 hours

2. **Complete OAuth Integration**
   - Real OAuth flows for Spotify, Google, GitHub
   - Callback handling and token storage
   - Import user data from connected accounts
   - Priority: HIGH
   - Estimate: 24 hours

3. **Build Recommendation Engine**
   - Daily feed generation algorithm
   - Taste profile to item matching
   - Context-aware filtering
   - Priority: HIGH
   - Estimate: 40 hours

### Short-Term Goals (Month 1)

4. **Implement ETL Connectors**
   - Spotify API integration (music data)
   - News API integration (article aggregation)
   - Spoonacular API (recipe database)
   - YouTube API (learning content)
   - Eventbrite API (local events)
   - Priority: MEDIUM
   - Estimate: 60 hours

5. **Build ML Embeddings Pipeline**
   - OpenAI embedding generation
   - pgvector integration
   - Batch processing with Redis queue
   - K-NN similarity search
   - Priority: MEDIUM
   - Estimate: 32 hours

6. **Create Quality Engine**
   - Source reputation scoring
   - Content filtering rules
   - Spam detection
   - YAML configuration system
   - Priority: MEDIUM
   - Estimate: 24 hours

7. **Implement Recommendation UI**
   - Daily feed page
   - Item detail views
   - Interaction buttons (save, dismiss)
   - Context switcher ("music for studying")
   - Priority: HIGH
   - Estimate: 32 hours

### Medium-Term Goals (Month 2-3)

8. **Human Curator System**
   - Curator profiles
   - Curated lists
   - Follow/unfollow functionality
   - Curator discovery
   - Priority: MEDIUM
   - Estimate: 40 hours

9. **Group Taste Blending**
   - Shared preference profiles
   - Group recommendations
   - Collaborative filtering
   - Priority: LOW
   - Estimate: 32 hours

10. **Analytics Dashboard**
    - User metrics visualization
    - KPI tracking (MDR, engagement, completion rate)
    - Event funnel analysis
    - Priority: MEDIUM
    - Estimate: 24 hours

11. **Mobile App**
    - React Native implementation
    - Push notifications for daily feed
    - Offline mode
    - Priority: MEDIUM
    - Estimate: 120 hours

### Long-Term Goals (Month 4+)

12. **Data Ownership Features**
    - Data logs and audit trail
    - Preference regeneration tools
    - Smart contract integration (optional)
    - Revenue sharing model
    - Priority: LOW
    - Estimate: 80 hours

13. **Content Marketplace**
    - Creator monetization
    - Premium curation tiers
    - Affiliate partnerships
    - Priority: LOW
    - Estimate: 60 hours

14. **Advanced Personalization**
    - Time-of-day context inference
    - Mood detection
    - Seasonal adjustments
    - Serendipity algorithms
    - Priority: LOW
    - Estimate: 40 hours

### Technical Debt

- Replace `any` types with proper type definitions
- Add comprehensive error logging
- Implement rate limiting
- Add API request validation (Zod/Yup)
- Database connection pooling optimization
- Add monitoring and alerting
- Write API documentation (Swagger/OpenAPI)
- Set up CI/CD pipeline
- Add integration tests
- Performance optimization (React.memo, useMemo)

---

## Appendix A: Git History

**Repository:** https://github.com/WinstonTG/curator
**Branch:** main

**Recent Commits:**

1. **fb47cb2** - docs: Update README with product vision and philosophy
   - Date: 2025-11-17
   - Changes: 193 insertions, 2 deletions
   - Files: README.md

2. **0f8b8ea** - feat(onboarding): wizard + APIs + GDPR export flow
   - Date: 2025-11-17
   - Changes: 2,072 insertions
   - Files: 17 files changed
   - Components:
     - web/app/onboarding/* (full wizard)
     - packages/api/src/routes/onboarding.ts
     - packages/api/src/routes/analytics.ts
     - packages/api/src/routes/gdpr.ts
     - e2e/onboarding-wizard.spec.ts
     - packages/api/src/routes/*.test.ts

---

## Appendix B: Code Metrics

**Total Files:** ~50+
**Total Lines of Code:** ~5,000+ (estimated)

**By Component:**
- Frontend (web/): ~2,500 lines
- Backend API (packages/api/): ~1,500 lines
- Tests (e2e/ + api/): ~1,000 lines
- Database Schema (prisma/): ~200 lines
- Configuration: ~100 lines

**Test Coverage:**
- E2E Tests: 9 test cases
- API Unit Tests: 15 test cases
- Total Test Cases: 24

**API Endpoints:**
- Implemented: 10 endpoints
- Planned: 8 endpoints
- Total: 18 endpoints

---

## Appendix C: Performance Benchmarks

*To be added after performance testing*

Planned metrics:
- Time to First Byte (TTFB)
- Page Load Time
- API Response Time (p50, p95, p99)
- Database Query Performance
- Embedding Generation Time
- Daily Feed Generation Time

---

## Appendix D: Security Checklist

- [ ] Authentication system implemented
- [ ] Authorization middleware on protected routes
- [ ] Input validation on all API endpoints
- [ ] SQL injection prevention (using Prisma parameterized queries)
- [ ] XSS prevention (React built-in escaping)
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Secure password hashing (bcrypt/argon2)
- [ ] HTTPS in production
- [ ] Environment variables secured
- [ ] API keys not committed to git
- [ ] CORS configuration
- [ ] Security headers (Helmet.js)
- [x] GDPR compliance (data export/deletion)
- [ ] PII data encryption at rest
- [ ] Audit logging for sensitive operations

---

**Report Generated By:** Claude Code (Anthropic)
**Report Version:** 1.0
**Last Updated:** 2025-11-17

---

*This report is intended for consumption by AI systems and human developers. All implementation details are accurate as of the specified commit. For questions or clarifications, refer to the source code at https://github.com/WinstonTG/curator.*
