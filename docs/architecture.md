# Architecture

## Overview

The project uses a single Next.js App Router codebase for UI, route handlers, domain services, tests, and documentation. This keeps the training-camp MVP easy to run locally while still preserving clear boundaries.

## Layers

- `src/app`: pages and API route handlers.
- `src/components`: shared UI components such as shell, badges, pickers, moderation panels, ranking list.
- `src/features`: domain services for AI, materials, prompts, drafts, moderation, quality, posts, ranking, evaluation.
- `src/lib`: database, auth, and HTTP response helpers.
- `prisma`: schema and seed data.
- `tests`: Vitest API/unit tests, Playwright E2E tests, Playwright performance tests.

## API Boundaries

- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/phone-code`, `/api/auth/logout`
- Assets: `/api/materials`
- Prompt templates: `/api/prompts`
- Drafts: `/api/drafts`
- AI generation: `/api/ai/generate`
- Moderation: `/api/moderation/review`, `/api/moderation/rewrite`, `/api/moderation/evaluate`
- Publishing: `/api/posts`, `/api/posts/[id]`
- Ranking: `/api/ranking`

## Data Model

Core Prisma models:

- `User`
- `PhoneCode`
- `Material`
- `PromptTemplate`
- `Draft`
- `Post`
- `ModerationResult`
- `QualityScore`
- `RankingMetric`
- `AuditRule`
- `EvaluationCase`

The central content entity is `Post`. A published post owns one moderation result, one quality score, and one ranking metric.

## AI Provider Strategy

`src/features/ai/provider.ts` selects an OpenAI-compatible provider only when all required environment variables exist:

- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`

Otherwise it uses a deterministic mock provider. The creation studio also includes a client-side fallback so demo flow remains stable if an external AI service is unavailable.

## Production Evolution

The current MVP is local-first. A production version should evolve toward:

- PostgreSQL instead of SQLite.
- Redis or a queue for autosave, generation, review, and publish jobs.
- Object storage for uploaded images.
- Dedicated auth/session storage.
- External content platform APIs for actual Toutiao/Douyin distribution.
- Observability around AI latency, moderation decisions, publish failures, and ranking drift.
