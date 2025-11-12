# ADR 0001: Architecture Overview

**Status**: Accepted
**Date**: 2025-01-12
**Authors**: Solutions Architecture Team
**Reviewers**: Product & Engineering

---

## Context

Curator is an AI-powered content discovery platform that surfaces personalized recommendations across 5 domains (Music, News, Recipes, Learning, Events). The platform must support:

- **Natural language input** → AI-interpreted recommendations
- **Multi-domain content** from heterogeneous APIs (Spotify, News API, Spoonacular, etc.)
- **Context-aware ranking** (time of day, weather, user history, mood)
- **Real-time analytics** tracking (Match Discovery Rate, engagement metrics)
- **Low latency** (<3s P95 for recommendations)
- **Scale**: MVP targets ~1000 DAU, future: 100k+ DAU

### Key Requirements
1. Modular architecture supporting independent domain adapters
2. Separation of concerns: intent interpretation, candidate generation, ranking
3. Pluggable Vector DB for semantic search (undecided: Pinecone, Weaviate, Qdrant)
4. Observability from day one (OpenTelemetry)
5. Feature flags for gradual rollouts
6. No vendor lock-in for analytics

---

## Decision

We adopt a **microservices-inspired architecture** with clear service boundaries, organized as a monorepo for MVP simplicity.

### Service Boundaries

#### 1. **Frontend Layer**
- **Web App** (Next.js 14, App Router)
  - Server-side rendering for SEO
  - Client-side analytics tracking
  - Optimistic UI updates

#### 2. **API Gateway** (Express.js)
- **Responsibilities**:
  - Authentication (JWT, OAuth with Spotify/Google)
  - Rate limiting (Redis-backed, per-user quotas)
  - CORS handling
  - Request routing to backend services
- **Deployment**: Single Node.js process (MVP), later: separate container

#### 3. **Recommendation Engine** (Core Service)
Sub-components implemented as internal modules:

##### 3a. Intent Interpretation
- **Input**: Natural language query (e.g., "upbeat electronic music for focus")
- **Process**: Call Anthropic Claude API to extract structured features
- **Output**: `{ mood, energy, genres, familiarity, filters }`
- **Caching**: Redis (TTL: 1h for similar queries)

##### 3b. Embeddings Service
- **Input**: Query features + user context
- **Process**: Generate vector embeddings (OpenAI ada-002 or local model)
- **Output**: 1536-dim embedding vector
- **Storage**: Vector DB

##### 3c. Candidate Generation
- **Input**: Query embeddings + domain constraints
- **Process**:
  - Parallel calls to domain adapters (Music, News, Recipes, Learning, Events)
  - Each adapter fetches ~50 candidates
- **Output**: ~250 total candidates across domains
- **Timeout**: 2s hard limit per adapter

##### 3d. Ranking & Packing
- **Input**: Candidates + context (time, weather, user prefs)
- **Process**:
  - Score candidates using learned model (phase 2) or heuristics (MVP)
  - Apply diversity constraints (no more than 2 consecutive from same domain)
  - Apply novelty weighting (2x boost for new content)
- **Output**: Top 20 ranked recommendations

#### 4. **Context Engine**
- **Responsibilities**:
  - Fetch weather for user location (OpenWeather API)
  - Determine time of day (morning/afternoon/evening/night)
  - Retrieve user listening/reading history
- **Caching**: Redis (TTL: 15min for weather, 5min for history)

#### 5. **User Service**
- **Responsibilities**:
  - CRUD operations for user profiles
  - Manage preferences (genres, dietary restrictions, etc.)
  - Sync with OAuth providers
- **Storage**: PostgreSQL

#### 6. **Domain Adapters** (Pluggable)
Each adapter implements `IDomainAdapter` interface:
```typescript
interface IDomainAdapter {
  domain: DomainType;
  fetchCandidates(query: QueryFeatures, limit: number): Promise<Candidate[]>;
  enrichMetadata(candidateIds: string[]): Promise<CandidateMetadata[]>;
}
```

Adapters:
- **MusicAdapter**: Spotify API (OAuth, playlist generation)
- **NewsAdapter**: News API (keyword + category search)
- **RecipeAdapter**: Spoonacular API (ingredient-based search)
- **LearningAdapter**: Coursera/Udemy APIs (skill + topic search)
- **EventsAdapter**: Eventbrite/Ticketmaster APIs (location + category search)

#### 7. **Background Workers**

##### 7a. Ingestion Worker
- **Input**: Analytics events from `/api/analytics/track`
- **Process**: Validate schema, enrich with metadata, batch write to Postgres
- **Queue**: Redis Streams (or BullMQ)
- **Throughput**: 1000 events/sec (MVP)

##### 7b. Embedding Worker
- **Input**: New content (songs, articles, recipes) from domain APIs
- **Process**: Generate embeddings, upsert to Vector DB
- **Schedule**: Hourly batch job + on-demand for new user queries

##### 7c. Cache Warmer
- **Input**: Popular queries from analytics
- **Process**: Pre-compute recommendations, store in Redis
- **Schedule**: Daily at 3 AM UTC

#### 8. **Storage Layer**

##### PostgreSQL
- **Schema**:
  - `users`: id, email, display_name, created_at
  - `user_preferences`: user_id, genres[], dietary_restrictions[], etc.
  - `events`: event, timestamp, user_id, session_id, properties (JSONB)
  - `recommendations`: recommendation_id, user_id, domain, rank, metadata (JSONB)
- **Indexes**: user_id, timestamp, event type
- **Partitioning**: Time-based (monthly) for events table

##### Vector DB (TBD: Pinecone vs. Weaviate)
- **Collections**: `queries`, `content_music`, `content_news`, etc.
- **Metadata**: domain, timestamp, popularity_score
- **Query**: ANN search (k=50 neighbors)

##### Redis
- **Use cases**:
  - Session storage (TTL: 24h)
  - Rate limit counters (sliding window)
  - Query result cache (TTL: 1h)
  - Pre-computed recommendations (TTL: 6h)
- **Eviction**: LRU policy

---

## Observability & Operations

### OpenTelemetry
- **Traces**: End-to-end request flow (frontend → gateway → services → storage)
- **Metrics**:
  - `curator.recommendations.latency` (P50, P95, P99)
  - `curator.cache.hit_rate`
  - `curator.api.rate_limit_exceeded_total`
- **Logs**: Structured JSON (trace_id, user_id, error_code)
- **Exporter**: Datadog (or Grafana Cloud)

### Feature Flags
- **Provider**: LaunchDarkly (or Flagsmith for self-hosted)
- **Flags**:
  - `enable_embeddings_search`: Boolean (fallback to keyword search)
  - `novelty_weight`: Float (0.0 - 3.0, default 2.0)
  - `max_candidates_per_domain`: Int (10 - 100, default 50)
- **Targeting**: By user_id, % rollout, geolocation

---

## Service Dependency Graph

```
Web → API Gateway → Recommendation Engine → Domain Adapters → External APIs
                  ↓                      ↓
                User Service         Context Engine
                  ↓                      ↓
              PostgreSQL              Weather API
                  ↓
              Redis Cache
                  ↑
           Ingestion Worker
```

---

## Deployment Strategy (MVP)

### Phase 1: Monolith (Weeks 1-4)
- Single Next.js app with API routes (`/api/*`)
- Embedded workers (in-process background tasks)
- Shared PostgreSQL + Redis instances
- **Pros**: Fast iteration, simple debugging
- **Cons**: No independent scaling

### Phase 2: Services Split (Weeks 5-8)
- Extract API Gateway + Recommendation Engine into separate services
- Deploy workers as cron jobs (Vercel Cron or GitHub Actions)
- Introduce Vector DB (Pinecone managed service)
- **Pros**: Independent deployment, better observability
- **Cons**: Increased operational complexity

### Phase 3: Containerization (Post-MVP)
- Dockerize all services
- Kubernetes or Fly.io deployment
- Auto-scaling based on metrics
- **Pros**: Production-grade, multi-region support
- **Cons**: Higher infrastructure cost

---

## Consequences

### Positive
1. **Clear Boundaries**: Each service has well-defined responsibilities
2. **Testability**: Services can be unit/integration tested independently
3. **Scalability**: Critical paths (Recommendation Engine) can scale independently
4. **Domain Flexibility**: Easy to add new domains (e.g., Podcasts) via adapter pattern
5. **Observability**: OpenTelemetry provides end-to-end visibility
6. **Vendor Flexibility**: No lock-in for Vector DB, analytics, or feature flags

### Negative
1. **Complexity**: Microservices introduce network latency & failure modes
2. **Debugging**: Distributed tracing required to diagnose issues
3. **Deployment**: More moving parts (API Gateway, workers, databases)
4. **Cost**: Multiple services = higher cloud costs (mitigated by monolith MVP)

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Vector DB Vendor Lock-In** | High | Abstract behind `IVectorStore` interface, support multiple backends |
| **External API Rate Limits** | Medium | Redis-backed circuit breaker, exponential backoff, cached fallbacks |
| **Cold Start (Serverless)** | Low | Keep API Gateway warm via cron ping, pre-warm Lambda functions |
| **Data Consistency** | Medium | Use idempotency keys for events, eventual consistency for embeddings |

---

## Alternatives Considered

### 1. **Serverless-First (AWS Lambda + API Gateway)**
- **Pros**: Zero ops, auto-scaling, pay-per-use
- **Cons**: Cold start latency, vendor lock-in, complex debugging
- **Decision**: Rejected for MVP due to cold starts hurting P95 latency

### 2. **Monolith with Job Queue (Rails-style)**
- **Pros**: Simple deployment, shared database transactions
- **Cons**: Tight coupling, harder to scale specific components
- **Decision**: Accepted for MVP Phase 1, migrate to services in Phase 2

### 3. **GraphQL Federation**
- **Pros**: Unified schema, client-friendly, batch queries
- **Cons**: Steeper learning curve, caching complexity
- **Decision**: Rejected for MVP, consider for Phase 3

---

## Implementation Roadmap

### Week 1-2: Foundation
- [ ] Set up monorepo structure (`packages/*`)
- [ ] Implement API Gateway (Express.js)
- [ ] Integrate Anthropic Claude for intent interpretation
- [ ] Build MusicAdapter (Spotify) + NewsAdapter

### Week 3-4: Core Engine
- [ ] Implement Candidate Generation pipeline
- [ ] Build Ranking & Packing logic (heuristic-based)
- [ ] Integrate Context Engine (weather, time of day)
- [ ] Add Redis caching layer

### Week 5-6: Analytics & Workers
- [ ] Implement Ingestion Worker (event processing)
- [ ] Set up PostgreSQL schema + migrations
- [ ] Build metrics dashboard (integrate with existing `/metrics` page)
- [ ] Add OpenTelemetry instrumentation

### Week 7-8: Polish & Deploy
- [ ] Integrate Vector DB (Pinecone pilot)
- [ ] Implement Embedding Worker
- [ ] Add feature flags (LaunchDarkly)
- [ ] Load testing + performance tuning
- [ ] Production deployment (Vercel + Supabase)

---

## References

- [Curator MVP Scope](../product/mvp_scope.md)
- [Metrics Dictionary v1.0](../../analytics/metrics_dictionary.yaml)
- [Architecture Diagram](../curator_architecture.mmd)
- [Spotify API Docs](https://developer.spotify.com/documentation/web-api)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference)

---

## Review & Update

- **Review Cadence**: Bi-weekly during MVP (Weeks 1-8), monthly post-launch
- **Next Review**: 2025-01-26
- **Update Trigger**: Major architectural changes, new service introductions, Vector DB selection

---

_This ADR follows the [MADR template](https://adr.github.io/madr/)._
