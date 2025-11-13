# Curator Safety Standards

**Version**: 1.0
**Last Updated**: 2025-01-12
**Status**: MVP Implementation

---

## Table of Contents
1. [Overview](#overview)
2. [Source Reputation Scoring](#source-reputation-scoring)
3. [Health & Medical Content Guardrails](#health--medical-content-guardrails)
4. [News Content Guardrails](#news-content-guardrails)
5. [Content Moderation Pipeline](#content-moderation-pipeline)
6. [User Safety Controls](#user-safety-controls)
7. [Incident Response](#incident-response)

---

## Overview

Curator aggregates content from third-party sources across multiple domains. To protect users from misinformation, harmful content, and low-quality sources, we implement **source reputation scoring** and **content guardrails** at the recommendation pipeline level.

### Safety Principles
1. **Source Quality First**: Only recommend content from reputable, verified sources
2. **Health Information Caution**: Never recommend unverified medical advice
3. **News Integrity**: Deprioritize sensationalism and misinformation
4. **Transparency**: Clearly label AI-generated insights and source credibility
5. **User Control**: Allow users to block sources or domains

---

## Source Reputation Scoring

Each content source receives a **Reputation Score** (0-100) based on multiple factors:

### Scoring Criteria

| Factor | Weight | Description | Example |
|--------|--------|-------------|---------|
| **Domain Authority** | 30% | Established brand with fact-checking standards | Reuters: 95, Random blog: 20 |
| **Content Accuracy** | 25% | Historical fact-check rating from independent orgs | MBFC rating, NewsGuard score |
| **User Trust Signals** | 20% | User feedback (thumbs up/down, reported flags) | High save rate: +10, Many reports: -30 |
| **Freshness** | 10% | How recently the source was updated | Active: 100, Stale (6mo+): 50 |
| **Bias Transparency** | 10% | Discloses political/commercial bias | Transparent: 90, Hidden agenda: 30 |
| **Expert Review** | 5% | Citations, peer review, bylined authors | Peer-reviewed: 100, Anonymous: 40 |

### Reputation Tiers

| Tier | Score Range | Action | Examples |
|------|-------------|--------|----------|
| **Trusted** | 80-100 | Boost in ranking (+30%) | AP News, NIH, Coursera, AllRecipes |
| **Verified** | 60-79 | Normal ranking | Medium blogs, indie news sites |
| **Unverified** | 40-59 | Rank lower (-20%), show warning badge | User-generated platforms, new sources |
| **Risky** | 20-39 | Require explicit opt-in to view | Known for misinformation, low quality |
| **Blocked** | 0-19 | Never recommend | Hate speech, scams, confirmed fake news |

### Implementation

```typescript
interface SourceReputation {
  source_id: string;
  domain: string;
  reputation_score: number; // 0-100
  tier: 'trusted' | 'verified' | 'unverified' | 'risky' | 'blocked';
  last_evaluated: string; // ISO timestamp
  factors: {
    domain_authority: number;
    accuracy_rating: number;
    user_trust: number;
    freshness: number;
    bias_transparency: number;
    expert_review: number;
  };
  flags: string[]; // e.g., ['misinformation', 'sensationalism']
}
```

**Data Sources**:
- [Media Bias/Fact Check (MBFC)](https://mediabiasfactcheck.com/) - News credibility
- [NewsGuard](https://www.newsguardtech.com/) - Journalism trust ratings
- [HealthNewsReview](https://www.healthnewsreview.org/) - Medical reporting quality
- User feedback loop (save rate, time-on-page, explicit flags)

---

## Health & Medical Content Guardrails

### Policy
**We do NOT recommend**:
- ❌ Unverified medical advice (e.g., "cure cancer with lemon water")
- ❌ Anti-vaccine misinformation
- ❌ Dangerous diets or supplements without disclaimers
- ❌ Mental health advice from non-licensed sources

### Approved Health Sources (Tier: Trusted)
- **Government**: NIH, CDC, WHO, FDA
- **Medical Institutions**: Mayo Clinic, Cleveland Clinic, Johns Hopkins
- **Peer-Reviewed**: PubMed, The Lancet, JAMA
- **Vetted Publishers**: WebMD (with editorial oversight), Healthline

### Content Filters

#### Recipe Domain
- **Allergen Warnings**: Highlight peanuts, shellfish, gluten, dairy
- **Dietary Claims**: Flag "detox", "miracle", "cure" language
- **Nutritional Info**: Require calorie counts for any diet-specific recipes

#### Learning Domain (Health Courses)
- **Instructor Credentials**: Verify MD, RN, PhD for medical courses
- **Disclaimers**: All health courses must include "This is educational, not medical advice" notice

### Warning Labels
Content from Unverified sources with health keywords triggers:

```
⚠️ Health Information Notice
This content is from an unverified source. Always consult a licensed healthcare provider
before making medical decisions. Learn more about our [Safety Standards].
```

---

## News Content Guardrails

### Policy
**We deprioritize**:
- 🚫 Clickbait headlines (e.g., "You won't believe what happened next!")
- 🚫 Conspiracy theories (e.g., flat earth, QAnon)
- 🚫 Hyper-partisan sources (far-left/far-right with no fact-checking)
- 🚫 Unverified claims during breaking news (first 6 hours)

### News Source Evaluation

| Source Type | Reputation Tier | Example |
|-------------|-----------------|---------|
| **Legacy Media** | Trusted (85-95) | NYT, WSJ, BBC, Reuters, AP |
| **Digital Native** | Verified (70-80) | ProPublica, The Intercept, Axios |
| **Indie Journalists** | Unverified (50-65) | Substack writers, YouTube journalists |
| **Aggregators** | Context-Dependent | Google News (pull from original sources) |

### Misinformation Detection

1. **Fact-Check API Integration** (Phase 2)
   - Query ClaimReview API (Google Fact Check)
   - Flag articles with debunked claims

2. **Sensationalism Scoring** (Heuristic)
   - Excessive caps, exclamation marks: -10 points
   - Emotional trigger words ("shocking", "devastating"): -5 points
   - Lack of byline or publish date: -15 points

3. **Breaking News Delay**
   - Wait 6 hours before recommending unverified breaking news
   - Prioritize "updates" from Trusted sources after initial reports

### Bias Labeling
We label political bias but **do NOT censor viewpoints**:
- `Left`, `Center-Left`, `Center`, `Center-Right`, `Right` (from MBFC)
- Users can filter by bias preference in Settings

---

## Content Moderation Pipeline

### 1. Pre-Ingestion Filters (Domain Adapters)
```
External API → Source Reputation Check → Accept/Reject
                          ↓
                   Reputation < 40? → Block
                   Reputation 40-59? → Add Warning Flag
                   Reputation 60+?   → Proceed
```

### 2. Content Analysis (Embedding Worker)
- **Keyword Scanning**: Detect hate speech, violence, NSFW content
- **Toxicity Scoring**: Use Perspective API (Google Jigsaw)
  - Toxicity > 0.8 → Block
  - Toxicity 0.5-0.8 → Require opt-in (user sets "Show Sensitive Content" in Settings)

### 3. Ranking Adjustments (Rank & Pack)
- Trusted sources: **+30% boost** in ranking
- Unverified sources: **-20% penalty**
- Flagged sources: Rank at bottom, require click-through warning

### 4. User Reporting
- **Report Button**: "This content is harmful/inaccurate/spam"
- Auto-review threshold: 5 reports → Manual review queue
- Action: Update reputation score or add to blocklist

---

## User Safety Controls

### Settings → Content Preferences

| Control | Options | Default |
|---------|---------|---------|
| **Source Trust Level** | Trusted only / Verified+ / All | Verified+ |
| **Sensitive Content** | Hide / Warn / Show | Warn |
| **Political Bias Filter** | Center only / All viewpoints | All viewpoints |
| **Health Content** | Verified sources only / All | Verified only |
| **Blocked Sources** | Custom list | Empty |

### Example User Flow
1. User sees news article from "The Daily Outrage" (Reputation: 45, Tier: Unverified)
2. Article shows badge: **⚠️ Unverified Source**
3. Click reveals: "This source has mixed fact-checking history. [View our criteria]"
4. User can:
   - Report content (feeds into reputation system)
   - Block source (never show again)
   - Dismiss warning (proceed to read)

---

## Incident Response

### Escalation Levels

| Level | Trigger | Response Time | Action |
|-------|---------|---------------|--------|
| **P0 - Critical** | Malicious content (malware links, phishing) | Immediate | Remove source, notify affected users |
| **P1 - High** | Health misinformation (e.g., fake COVID cures) | 2 hours | Block source, add to global blocklist |
| **P2 - Medium** | Sensationalism / clickbait spike | 24 hours | Lower reputation score, review manually |
| **P3 - Low** | User complaint about bias | 7 days | Log for quarterly review |

### Incident Log
Track all safety interventions:
```typescript
interface SafetyIncident {
  incident_id: string;
  timestamp: string;
  level: 'P0' | 'P1' | 'P2' | 'P3';
  source_id: string;
  domain: Domain;
  description: string;
  action_taken: 'blocked' | 'flagged' | 'reviewed' | 'no_action';
  reviewed_by: string; // Staff member
}
```

### Quarterly Safety Review
- Audit top 100 sources by impression count
- Re-evaluate reputation scores with updated MBFC/NewsGuard data
- Review user reports for false positives (good sources wrongly flagged)
- Publish transparency report: "X sources blocked, Y incidents resolved"

---

## MVP Implementation Checklist

- [x] Define reputation scoring criteria
- [ ] Integrate MBFC API for news sources (or manual seed data)
- [ ] Build `SourceReputation` database table
- [ ] Add reputation check in Domain Adapters (before returning candidates)
- [ ] Implement ranking boost/penalty in Rank & Pack service
- [ ] Add warning badges to frontend (React components)
- [ ] Create user report flow (`POST /api/content/report`)
- [ ] Build admin dashboard for incident review

---

## References

- [Media Bias/Fact Check Methodology](https://mediabiasfactcheck.com/methodology/)
- [NewsGuard Nutrition Labels](https://www.newsguardtech.com/ratings/rating-process-criteria/)
- [Google Fact Check Tools](https://toolbox.google.com/factcheck/explorer)
- [Perspective API (Toxicity Detection)](https://perspectiveapi.com/)
- [W3C Credibility Coalition](https://credibilitycoalition.org/)

---

**Next Review**: 2025-02-12
**Owner**: Product & Privacy Engineering Team
