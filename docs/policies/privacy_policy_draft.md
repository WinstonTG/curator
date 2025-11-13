# Curator Privacy Policy (MVP Draft)

**Last Updated**: 2025-01-12
**Status**: Draft (Pre-Launch)
**Effective Date**: TBD

---

## Plain-English Summary

Curator helps you discover personalized content across music, news, recipes, learning, and events. Here's how we handle your data:

### What We Collect
- **Account Info**: Email, display name, and profile picture (from Google/Spotify login)
- **Preferences**: Your favorite genres, dietary restrictions, learning interests, and location
- **Activity Data**: What you view, save, try, or purchase through Curator
- **Technical Data**: Device type, browser, IP address, and error logs

### Why We Collect It
- To give you better recommendations that match your taste and context (time of day, weather, mood)
- To improve our AI models and fix bugs
- To measure engagement and understand what's working

### What We DON'T Do
- ❌ We **don't sell** your data to advertisers or third parties
- ❌ We **don't track** you outside Curator (no cross-site tracking)
- ❌ We **don't use** your data for unrelated products
- ❌ We **don't share** your listening/reading habits without permission

### Your Rights
- **Export**: Download all your data in JSON format anytime
- **Delete**: Request permanent deletion of your account and all associated data
- **Opt-Out**: Disable personalization and use generic recommendations
- **Control**: Manage what domains and types of content we track

---

## 1. Introduction

Curator ("we", "us", "our") provides an AI-powered content discovery platform. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our services.

By creating an account or using Curator, you agree to the terms of this policy. If you disagree, please do not use our services.

---

## 2. Information We Collect

### 2.1 Information You Provide
- **Account Registration**: Email address, display name, password (hashed), profile picture
- **OAuth Login**: When you sign in with Spotify or Google, we receive your email, name, and profile photo
- **Preferences**:
  - Music: Genres, artists, mood preferences
  - News: Topics of interest, preferred sources
  - Recipes: Dietary restrictions (vegetarian, gluten-free, etc.), cuisine preferences
  - Learning: Skills to learn, course difficulty levels
  - Events: Location, event types (concerts, meetups, workshops)

### 2.2 Automatically Collected Data
- **Usage Analytics**: Events tracked per our [Metrics Dictionary](../../analytics/metrics_dictionary.yaml)
  - Recommendations viewed, saved, tried, or purchased
  - Session duration and completion rate
  - Time to action (how quickly you engage with content)
  - Search queries and filters applied
- **Technical Data**:
  - Device type (mobile, desktop), browser, operating system
  - IP address (used for location inference, then discarded)
  - Error logs and performance metrics
  - Cookies and session identifiers

### 2.3 Third-Party Data
- **Spotify**: Your playlists, listening history, and saved tracks (with your permission)
- **Weather APIs**: Current weather for your location (to improve context-aware recommendations)
- **Domain APIs**: Metadata from News API, Spoonacular, Coursera, etc. (we don't share your personal data with them)

---

## 3. How We Use Your Data

### 3.1 Core Services
- **Personalized Recommendations**: Match your preferences with content from 5 domains
- **Context-Aware Ranking**: Use time of day, weather, and recent activity to prioritize results
- **Natural Language Understanding**: Interpret queries like "upbeat electronic music for focus"
- **Action Tracking**: Save your preferences across sessions

### 3.2 Product Improvement
- **Analytics**: Measure Match Discovery Rate, engagement conversion, and error rates
- **A/B Testing**: Test new recommendation algorithms (with feature flags)
- **Model Training**: Improve our AI models using anonymized interaction data

### 3.3 Communication
- **Transactional Emails**: Password resets, account confirmations, data export notifications
- **Product Updates** (Opt-In Only): New features, domain launches, weekly digests

---

## 4. Data Sharing & Disclosure

### 4.1 We Share Data With:
- **AI Providers**: Anthropic Claude (for intent interpretation) – we send queries and context, NOT your personal identity
- **Infrastructure Providers**:
  - Vercel (hosting)
  - Supabase (PostgreSQL database)
  - Pinecone/Weaviate (vector database for embeddings)
  - Redis Labs (caching)
- **Analytics Tools**: OpenTelemetry exporters (self-hosted or Datadog/Grafana Cloud)

### 4.2 We DO NOT Share:
- Your data with advertisers or marketing platforms
- Your listening/reading habits with third parties (except aggregated, anonymized reports)
- Your personal information for training third-party AI models

### 4.3 Legal Disclosure
We may disclose your data if required by law, court order, or to protect our rights and safety.

---

## 5. Data Retention

- **Active Accounts**: We retain your data as long as your account is active
- **Deleted Accounts**: 30-day grace period, then permanent deletion (backups purged after 90 days)
- **Analytics Events**: Retained for 90 days (then aggregated and anonymized)
- **Logs**: Error logs retained for 30 days, performance logs for 7 days

---

## 6. Your Privacy Rights

### 6.1 Access & Export
- Visit **Settings → Data Controls** to download your data in JSON format
- Export includes: account info, preferences, recommendations, and analytics events
- Processing time: Immediate (for MVP), up to 48 hours (post-launch)

### 6.2 Delete Your Data
- Visit **Settings → Data Controls → Delete Account**
- Deletes: Account, preferences, saved items, analytics events
- Keeps: Anonymized metrics (no user_id linkage)
- Irreversible after 30-day grace period

### 6.3 Opt-Out of Personalization
- Toggle **Settings → Privacy → Generic Recommendations Mode**
- Disables: User history tracking, context engine, personalized ranking
- You'll receive trending/popular content instead

### 6.4 Correct Your Data
- Update preferences anytime via **Settings → Preferences**
- Email corrections to: privacy@curator.example (response within 7 days)

---

## 7. Security Measures

- **Encryption**: TLS 1.3 for data in transit, AES-256 for data at rest
- **Authentication**: OAuth 2.0 (Spotify, Google), JWT for session management
- **Access Control**: Role-based access (only authorized engineers can query production data)
- **Monitoring**: Intrusion detection, rate limiting, automated security scans
- **Incident Response**: Notify affected users within 72 hours of a breach

---

## 8. Children's Privacy

Curator is not intended for users under 13 years old. We do not knowingly collect data from children. If you believe we have collected data from a child, contact us immediately at privacy@curator.example.

---

## 9. International Users

- **Data Location**: Hosted in US data centers (Vercel, Supabase)
- **GDPR Compliance** (Future): We will support EU users with explicit consent flows and data localization
- **CCPA Compliance**: California residents have additional rights (see Section 10)

---

## 10. California Privacy Rights (CCPA)

If you are a California resident, you have the right to:
1. **Know** what personal information we collect and how we use it
2. **Delete** your personal information (with exceptions for legal obligations)
3. **Opt-Out** of data sales (we don't sell data, so this doesn't apply)
4. **Non-Discrimination** for exercising your rights

To exercise these rights, visit **Settings → Data Controls** or email privacy@curator.example.

---

## 11. Changes to This Policy

We may update this policy as we add features or change data practices. We'll notify you via:
- Email (for material changes affecting your rights)
- In-app banner (for minor updates)
- Updated "Last Updated" date at the top of this page

Continued use after changes constitutes acceptance of the updated policy.

---

## 12. Contact Us

- **Privacy Questions**: privacy@curator.example
- **Data Requests**: dataprotection@curator.example
- **Security Issues**: security@curator.example
- **General Support**: support@curator.example

**Mailing Address**:
Curator Privacy Team
[Address TBD]
San Francisco, CA 94101

---

## Appendix: Data Processing Details

### A. Cookies We Use
| Cookie Name | Purpose | Duration |
|-------------|---------|----------|
| `curator_session` | Session authentication | 24 hours |
| `curator_prefs` | UI preferences (theme, language) | 1 year |
| `curator_consent` | Tracking consent status | 1 year |

### B. Third-Party Subprocessors
| Provider | Service | Data Shared | Location |
|----------|---------|-------------|----------|
| Anthropic | Claude API (intent interpretation) | Query text, context | US |
| Vercel | Hosting (Next.js) | Request metadata | US |
| Supabase | PostgreSQL database | All user data | US |
| Pinecone | Vector database | Embeddings (no PII) | US |
| Redis Labs | Caching | Session data | US |

---

_This is a draft policy for MVP launch. Final version will be reviewed by legal counsel before public release._
