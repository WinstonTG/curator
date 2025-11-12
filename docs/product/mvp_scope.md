# Curator MVP Scope

**Version**: 0.1.0
**Last Updated**: 2025-01-12
**Owner**: Product & Engineering

## Vision

Curator is an AI-powered content discovery platform that surfaces personalized recommendations across 5 domains: Music, News, Recipes, Learning, and Events. Users describe their intent in natural language, and Curator delivers contextually-aware suggestions that drive immediate action.

## In Scope (MVP)

### Core Features
- **Natural Language Input**: Free-text description of preferences/needs
- **5-Domain Coverage**:
  - **Music**: Playlist generation, track discovery (Spotify integration)
  - **News**: Article recommendations, topic tracking (News API)
  - **Recipes**: Meal planning, dietary preferences (Spoonacular)
  - **Learning**: Course/resource discovery (Coursera, Udemy APIs)
  - **Events**: Local event recommendations (Eventbrite, Ticketmaster)
- **Context Engine**: Time of day, weather, user history, mood detection
- **Action Tracking**: Save, Try, Attend, Purchase buttons per recommendation
- **Basic Analytics**: User-level metrics dashboard (internal)

### User Flows
1. User inputs intent → AI interprets → Recommendations displayed
2. User takes action (Save/Try/etc.) → Event tracked → Used for refinement
3. Admin views metrics dashboard → Identifies drop-off points → Iterates

### Technical Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, Anthropic Claude API
- **Storage**: PostgreSQL (user prefs), Vector DB (embeddings - undecided)
- **Analytics**: Custom event tracking (no vendor lock-in initially)

## Out of Scope (Post-MVP)

- Social features (sharing, collaborative playlists)
- Mobile native apps (web-first)
- Advanced ML personalization (beyond context + embeddings)
- Multi-user accounts/workspaces
- Subscription/payment processing (free tier only)
- Email/push notifications
- Third-party integrations (Zapier, IFTTT)

## Success Metrics

### Primary KPIs
1. **Match Discovery Rate (MD/day)**: Avg successful recommendations per active user per day
   - **Target**: ≥3 MD/day by Week 4
2. **Engagement Conversion**: % of viewed recommendations → action taken
   - **Save**: 15%
   - **Try/Attend/Buy**: 5%
3. **Time-to-Action (TTA)**: Median time from discovery → first action
   - **Target**: <2 minutes
4. **Drop-off Completion**: % of users completing intent → action flow
   - **Target**: >60% complete flow

### Secondary Metrics
- Weekly Active Users (WAU)
- Domain-specific engagement (which domains get most traction)
- Error rate (<1% API failures)
- P95 response time (<3s for recommendations)

## Dependencies

### External
- **APIs**: Spotify, News API, Spoonacular, Learning platforms, Event aggregators
- **AI Model**: Anthropic Claude (fallback: OpenAI GPT-4)
- **Infrastructure**: Vercel (hosting), Supabase (DB)

### Internal
- Authentication system (OAuth with Spotify/Google)
- Rate limiting & caching layer
- Event ingestion pipeline

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **API Rate Limits** | High | Implement caching, rate limit UI warnings, stagger requests |
| **Cold Start Problem** | Medium | Use trending/popular content as fallback, prompt for explicit prefs |
| **Data Quality** | Medium | Manual curation of initial seed data, user feedback loop |
| **Context Accuracy** | Low | Start with explicit context (user selects), add inference later |

## Definition of Done

- [ ] All 5 domains return recommendations for test inputs
- [ ] User can complete full flow: input → view → action
- [ ] Analytics dashboard displays 4 primary KPIs with live data
- [ ] <1% error rate in production over 7-day period
- [ ] Unit test coverage >80% for core logic
- [ ] E2E tests pass for critical paths
- [ ] Documentation complete (README, API docs, deployment guide)
- [ ] 10 beta users complete successful session

## Timeline

- **Week 1-2**: Core infrastructure, Music + News domains
- **Week 3-4**: Recipes + Learning + Events domains, analytics
- **Week 5**: Testing, bug fixes, beta launch
- **Week 6**: Iterate based on beta feedback

---

**Next Steps**: See `analytics/metrics_dictionary.yaml` for event schema and `web/app/(internal)/metrics` for KPI dashboard.
