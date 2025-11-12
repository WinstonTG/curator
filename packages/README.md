# Curator Packages

This directory contains future backend services and shared packages for the Curator platform.

## Planned Structure

Based on the [Architecture Overview ADR](../docs/architecture/ADRs/0001-architecture-overview.md), the following packages will be created:

### Core Services
- `@curator/api-gateway` - Express.js API Gateway with auth, rate limiting, and CORS
- `@curator/recommendation-engine` - Core recommendation pipeline (intent, embeddings, candidates, ranking)
- `@curator/context-engine` - Context service (weather, time, user history)
- `@curator/user-service` - User management and preferences

### Domain Adapters
- `@curator/adapter-music` - Spotify integration
- `@curator/adapter-news` - News API integration
- `@curator/adapter-recipes` - Spoonacular integration
- `@curator/adapter-learning` - Coursera/Udemy integration
- `@curator/adapter-events` - Eventbrite/Ticketmaster integration

### Workers
- `@curator/worker-ingestion` - Analytics event processing
- `@curator/worker-embeddings` - Vector embedding generation
- `@curator/worker-cache` - Cache warming service

### Shared Libraries
- `@curator/types` - Shared TypeScript types and interfaces
- `@curator/db` - Database clients (Postgres, Redis, Vector DB)
- `@curator/telemetry` - OpenTelemetry instrumentation
- `@curator/feature-flags` - Feature flag client wrapper

## Current Packages

The following packages are currently in development outside this directory:
- `@curator/web` - Next.js frontend (in `/web`)
- `@curator/scripts` - Utility scripts (in `/scripts`)

## Development

Each package should:
1. Export a clear public API
2. Include unit tests (>80% coverage target)
3. Have a README.md with usage examples
4. Follow the shared TypeScript config (`tsconfig.json`)
5. Be independently deployable (where applicable)

## Adding a New Package

```bash
# Create package structure
mkdir -p packages/my-package/src
cd packages/my-package

# Initialize package.json
pnpm init

# Install as workspace dependency in another package
cd ../other-package
pnpm add @curator/my-package --workspace
```
