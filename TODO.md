# Curator MVP - Follow-Up TODOs

## Immediate Next Steps

### 1. Backend Infrastructure (Week 1-2)
- [ ] Set up Express.js API server with authentication (Spotify OAuth, Google)
- [ ] Implement rate limiting & caching layer
- [ ] Connect to PostgreSQL database (Supabase)
- [ ] Create analytics event ingestion endpoint (`POST /api/analytics/track`)
- [ ] Wire metrics dashboard to real event data (replace synthetic)

### 2. Domain Implementation (Week 1-4)
- [ ] **Music Domain** (Spotify integration)
  - [ ] Natural language → playlist generation flow
  - [ ] Context engine (time of day, weather, mood)
  - [ ] Save/Try action tracking
- [ ] **News Domain** (News API)
  - [ ] Article recommendation engine
  - [ ] Topic tracking & personalization
- [ ] **Recipes Domain** (Spoonacular)
  - [ ] Meal planning with dietary preferences
  - [ ] Ingredient-based search
- [ ] **Learning Domain** (Coursera, Udemy APIs)
  - [ ] Course discovery & recommendations
  - [ ] Purchase tracking
- [ ] **Events Domain** (Eventbrite, Ticketmaster)
  - [ ] Local event recommendations
  - [ ] Attend/Purchase actions

### 3. AI/ML Layer (Week 2-3)
- [ ] Integrate Anthropic Claude API for intent interpretation
- [ ] Implement embedding generation for content
- [ ] Evaluate vector DB options (Pinecone, Weaviate, Qdrant)
- [ ] Build context engine (time, weather, user history)

### 4. Frontend Enhancement (Week 3-4)
- [ ] Design & implement main discovery UI
- [ ] Build recommendation card components
- [ ] Add action buttons (Save/Try/Attend/Buy) with tracking
- [ ] Create user profile & preferences page
- [ ] Mobile-responsive design

### 5. Testing & QA (Week 4-5)
- [ ] Run Playwright E2E tests successfully
- [ ] Achieve >80% unit test coverage
- [ ] Load testing for API endpoints
- [ ] Security audit (API keys, auth flows)
- [ ] Accessibility audit (WCAG compliance)

### 6. Analytics & Monitoring (Week 4-5)
- [ ] Set up production analytics pipeline
- [ ] Configure alerting for error rate threshold (>5%)
- [ ] Add P95 response time monitoring
- [ ] Create admin dashboard for system health

### 7. Beta Launch (Week 5-6)
- [ ] Deploy to Vercel production
- [ ] Onboard 10 beta users
- [ ] Run 7-day monitoring period
- [ ] Collect feedback & iterate
- [ ] Document API endpoints

## Technical Debt / Nice-to-Haves
- [ ] Add CI/CD pipeline (GitHub Actions)
- [ ] Set up error tracking (Sentry)
- [ ] Implement request logging & analytics
- [ ] Add feature flags system
- [ ] Create component library / design system
- [ ] Add internationalization (i18n)
- [ ] Set up database migrations
- [ ] Add API documentation (Swagger/OpenAPI)

## Post-MVP Features (Out of Scope for Now)
- [ ] Social features (sharing, collaborative playlists)
- [ ] Mobile native apps
- [ ] Advanced ML personalization
- [ ] Multi-user accounts/workspaces
- [ ] Subscription/payment processing
- [ ] Email/push notifications
- [ ] Third-party integrations (Zapier, IFTTT)

## Open Questions / Decisions Needed
1. **Vector DB Selection**: Pinecone (easiest), Weaviate (self-hosted), or Qdrant (performant)?
2. **Context Engine**: Start with explicit user input or infer from signals?
3. **Cache Strategy**: Redis, in-memory, or Vercel Edge Cache?
4. **Error Handling**: Graceful degradation vs. hard failures for API limits?
5. **Data Retention**: 90 days for raw events—is this enough for ML training?

## Metrics to Watch (First 30 Days)
- Daily Active Users (DAU)
- Match Discovery Rate (target: ≥3 MD/day)
- Engagement Conversion (Save: 15%, Action: 5%)
- Time-to-Action (target: <2 min)
- Completion Rate (target: >60%)
- Error Rate (target: <1%)
- P95 Response Time (target: <3s)

---

**Last Updated**: 2025-01-12
**Commit**: 385b1c1
