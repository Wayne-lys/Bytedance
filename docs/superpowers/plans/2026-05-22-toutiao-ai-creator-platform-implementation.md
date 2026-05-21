# Toutiao AI Creator Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js full-stack AI creator assistance and content distribution platform covering the PDF's required core features and advanced challenges.

**Architecture:** Use a single Next.js App Router project with focused domain modules under `src/features/*`, Route Handlers under `src/app/api/*`, Prisma for persistence, and a provider-based AI layer that can call OpenAI-compatible APIs or fall back to deterministic mocks. The implementation prioritizes one visible loop: login -> materials -> AI creation -> autosave/offline sync -> moderation/quality -> publish -> rankings/details -> evaluation.

**Tech Stack:** Next.js, React, TypeScript, Prisma, SQLite for local development, PostgreSQL-ready Prisma schema, Tailwind CSS, Vitest, Playwright, OpenAI-compatible API integration with mock fallback.

---

## Scope Check

The approved spec covers several product areas, but they are not independent products. They form one evaluable vertical slice around short image-text content creation and distribution. This plan keeps all tasks tied to that slice and avoids unrelated enterprise admin, real SMS delivery, real content-platform distribution, or production object-storage integration beyond documented deployment boundaries.

## File Structure

Create the project in `C:\Users\13093\Desktop\toutiao-ai-creator-platform`.

Planned top-level files:

- `package.json`: scripts and dependencies.
- `next.config.mjs`: Next.js config.
- `tsconfig.json`: TypeScript config.
- `tailwind.config.ts`: Tailwind config.
- `postcss.config.mjs`: PostCSS config.
- `vitest.config.ts`: unit/API test config.
- `playwright.config.ts`: E2E config.
- `.env.example`: documented environment variables.
- `.gitignore`: ignore dependencies, env files, generated DB/files.
- `README.md`: setup, scripts, demo account, feature map.

Application structure:

- `src/app/layout.tsx`: root layout.
- `src/app/page.tsx`: authenticated creator dashboard redirect/landing.
- `src/app/(auth)/login/page.tsx`: login/register UI.
- `src/app/(workspace)/create/page.tsx`: creation studio.
- `src/app/(workspace)/materials/page.tsx`: material library.
- `src/app/(workspace)/posts/page.tsx`: content management.
- `src/app/(workspace)/review/page.tsx`: moderation and quality view.
- `src/app/(workspace)/rankings/page.tsx`: hot/viral/recommended rankings.
- `src/app/(workspace)/rules/page.tsx`: safety and quality rules.
- `src/app/(workspace)/evaluation/page.tsx`: evaluation dashboard.
- `src/app/content/[id]/page.tsx`: public content detail.

API structure:

- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/phone-code/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/materials/route.ts`
- `src/app/api/prompts/route.ts`
- `src/app/api/drafts/route.ts`
- `src/app/api/posts/route.ts`
- `src/app/api/posts/[id]/route.ts`
- `src/app/api/moderation/review/route.ts`
- `src/app/api/moderation/rewrite/route.ts`
- `src/app/api/moderation/evaluate/route.ts`
- `src/app/api/ranking/route.ts`
- `src/app/api/ai/generate/route.ts`

Domain modules:

- `src/lib/db.ts`: Prisma client singleton.
- `src/lib/auth.ts`: password hashing, session cookie helpers, current user lookup.
- `src/lib/http.ts`: shared JSON response helpers.
- `src/lib/validation.ts`: shared zod schemas.
- `src/features/ai/provider.ts`: provider interface and provider selection.
- `src/features/ai/openai-compatible.ts`: real API provider.
- `src/features/ai/mock-provider.ts`: deterministic mock provider.
- `src/features/materials/material-service.ts`: upload metadata and material compliance.
- `src/features/prompts/prompt-service.ts`: prompt template CRUD.
- `src/features/drafts/draft-service.ts`: autosave, restore, conflict checks.
- `src/features/moderation/rules.ts`: safety rules and local classifiers.
- `src/features/moderation/moderation-service.ts`: AI/rule review and rewrite orchestration.
- `src/features/quality/quality-service.ts`: quality scoring and normalization.
- `src/features/ranking/ranking-service.ts`: score calculation and pagination.
- `src/features/evaluation/evaluation-service.ts`: test-set accuracy and report data.

Shared UI:

- `src/components/app-shell.tsx`
- `src/components/status-badge.tsx`
- `src/components/quality-score-card.tsx`
- `src/components/moderation-panel.tsx`
- `src/components/ranking-list.tsx`
- `src/components/offline-sync-indicator.tsx`
- `src/components/material-picker.tsx`
- `src/components/prompt-picker.tsx`

Database and seed:

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `public/demo-materials/*`: small committed demo sample images or generated static assets.

Tests:

- `tests/unit/ranking-service.test.ts`
- `tests/unit/quality-service.test.ts`
- `tests/unit/moderation-rules.test.ts`
- `tests/unit/draft-conflict.test.ts`
- `tests/api/auth.test.ts`
- `tests/api/content-flow.test.ts`
- `tests/e2e/creator-flow.spec.ts`
- `tests/performance/lcp.spec.ts`

Docs:

- `docs/architecture.md`
- `docs/safety-and-quality.md`
- `docs/evaluation-report.md`
- `docs/deployment.md`

---

### Task 1: Scaffold Next.js Project Baseline

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Create package and config files**

Create a Next.js App Router project configured for TypeScript, Tailwind, Vitest, Playwright, Prisma, bcrypt-compatible password hashing, zod validation, and OpenAI-compatible API calls.

Minimum scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 2: Add initial app shell**

Implement `src/app/layout.tsx`, `src/app/globals.css`, and `src/app/page.tsx` with a minimal Chinese UI shell and links to the planned sections.

- [ ] **Step 3: Run baseline checks**

Run:

```bash
npm install
npm run build
```

Expected: dependencies install and the empty app builds.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json next.config.mjs tsconfig.json tailwind.config.ts postcss.config.mjs vitest.config.ts playwright.config.ts .env.example .gitignore src/app
git commit -m "chore: scaffold next app baseline"
```

### Task 2: Add Prisma Schema and Seed Data

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Modify: `.env.example`
- Create: `src/lib/db.ts`

- [ ] **Step 1: Define Prisma models**

Create models for `User`, `PhoneCode`, `Material`, `PromptTemplate`, `Draft`, `Post`, `ModerationResult`, `QualityScore`, `RankingMetric`, `AuditRule`, and `EvaluationCase`.

Critical fields:

```prisma
model Post {
  id          String   @id @default(cuid())
  authorId    String
  title       String
  coverUrl    String?
  body        String
  tags        String
  status      String
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

- [ ] **Step 2: Add seed data**

Seed:

- One demo user.
- Prompt templates for 种草、小红书风格、头条信息流、清单体.
- Audit rules for 黄赌毒、敏感信息、低俗、广告导流、隐私泄露.
- Evaluation cases with safe, low-risk, and high-risk examples.
- Demo posts and ranking metrics.

- [ ] **Step 3: Generate and push database**

Run:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

Expected: local SQLite database is created and seeded.

- [ ] **Step 4: Commit**

```bash
git add prisma src/lib/db.ts .env.example
git commit -m "feat: add prisma schema and seed data"
```

### Task 3: Implement Authentication

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/phone-code/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Test: `tests/api/auth.test.ts`

- [ ] **Step 1: Write auth API tests**

Test:

- email/password registration.
- duplicate email rejection.
- email/password login.
- phone code request and login.
- logout clears session cookie.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test -- tests/api/auth.test.ts
```

Expected: FAIL because auth routes do not exist.

- [ ] **Step 3: Implement auth helpers and routes**

Use hashed passwords, HTTP-only session cookie, and a demo-visible phone code. Return Chinese error messages precise enough for UI display.

- [ ] **Step 4: Implement login/register page**

UI supports two tabs:

- 邮箱登录/注册
- 手机验证码登录

Include safe logout behavior in the app shell later.

- [ ] **Step 5: Run auth tests**

Run:

```bash
npm run test -- tests/api/auth.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth 'src/app/(auth)/login' tests/api/auth.test.ts
git commit -m "feat: add email and phone auth"
```

### Task 4: Build App Shell and Navigation

**Files:**
- Create: `src/components/app-shell.tsx`
- Create: `src/components/status-badge.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/(workspace)/create/page.tsx`
- Create: `src/app/(workspace)/materials/page.tsx`
- Create: `src/app/(workspace)/posts/page.tsx`
- Create: `src/app/(workspace)/review/page.tsx`
- Create: `src/app/(workspace)/rankings/page.tsx`
- Create: `src/app/(workspace)/rules/page.tsx`
- Create: `src/app/(workspace)/evaluation/page.tsx`

- [ ] **Step 1: Add app shell**

Create Chinese navigation:

- 创作台
- 素材库
- 内容管理
- 审核与质量
- 热点榜单
- 规则体系
- 效果评估

- [ ] **Step 2: Add dashboard metrics from seed data**

Root page should show:

- 草稿数
- 已发布数
- 平均质量分
- 审核通过率

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app src/components
git commit -m "feat: add workspace shell and navigation"
```

### Task 5: Implement Materials Library

**Files:**
- Create: `src/features/materials/material-service.ts`
- Create: `src/app/api/materials/route.ts`
- Modify: `src/app/(workspace)/materials/page.tsx`
- Create: `src/components/material-picker.tsx`
- Test: `tests/unit/moderation-rules.test.ts`
- Test: `tests/api/content-flow.test.ts`

- [ ] **Step 1: Write material compliance tests**

Test file type, size, risky filename words, and blocked status.

- [ ] **Step 2: Implement material service**

Service responsibilities:

- validate metadata.
- persist material records.
- assign `safe`, `warning`, or `blocked`.
- support local demo storage and pre-seeded materials.

- [ ] **Step 3: Implement materials API**

`GET /api/materials` lists materials.

`POST /api/materials` accepts upload metadata or multipart data for local mode.

- [ ] **Step 4: Implement materials page**

Show upload action, material cards, compliance badge, risk reason, and “用于创作”.

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm run test -- tests/unit/moderation-rules.test.ts tests/api/content-flow.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/materials src/app/api/materials 'src/app/(workspace)/materials' src/components/material-picker.tsx tests
git commit -m "feat: add material library and compliance checks"
```

### Task 6: Implement Prompt Templates

**Files:**
- Create: `src/features/prompts/prompt-service.ts`
- Create: `src/app/api/prompts/route.ts`
- Create: `src/components/prompt-picker.tsx`
- Modify: `src/app/(workspace)/create/page.tsx`

- [ ] **Step 1: Add prompt service**

Support list, create, update, and disable. Keep seeded templates available for demo.

- [ ] **Step 2: Add prompt API**

`GET /api/prompts` returns active templates.

`POST /api/prompts` creates a new template.

- [ ] **Step 3: Add prompt picker**

The creation page can choose templates and preview the prompt content.

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/prompts src/app/api/prompts src/components/prompt-picker.tsx 'src/app/(workspace)/create/page.tsx'
git commit -m "feat: add prompt template management"
```

### Task 7: Implement AI Provider Layer

**Files:**
- Create: `src/features/ai/provider.ts`
- Create: `src/features/ai/openai-compatible.ts`
- Create: `src/features/ai/mock-provider.ts`
- Create: `src/app/api/ai/generate/route.ts`
- Modify: `.env.example`

- [ ] **Step 1: Define AI provider interface**

Interface methods:

- `generateShortPost(input)`
- `moderateContent(input)`
- `rewriteCompliant(input)`
- `scoreQuality(input)`

- [ ] **Step 2: Implement mock provider**

Return deterministic Chinese short image-text content with title, body, tags, cover suggestion, and publish advice.

- [ ] **Step 3: Implement OpenAI-compatible provider**

Read:

- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`

If missing or request fails, provider selection falls back to mock.

- [ ] **Step 4: Add generate route**

`POST /api/ai/generate` validates creation inputs and returns generated draft content.

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/ai src/app/api/ai/generate .env.example
git commit -m "feat: add ai provider fallback layer"
```

### Task 8: Build Creation Studio and Autosave

**Files:**
- Create: `src/features/drafts/draft-service.ts`
- Create: `src/app/api/drafts/route.ts`
- Create: `src/components/offline-sync-indicator.tsx`
- Modify: `src/app/(workspace)/create/page.tsx`
- Test: `tests/unit/draft-conflict.test.ts`

- [ ] **Step 1: Write draft conflict tests**

Test:

- newer local version wins when user chooses local.
- newer cloud version wins when user chooses cloud.
- same version syncs without conflict.

- [ ] **Step 2: Implement draft service**

Support:

- create/update draft.
- restore latest draft.
- version and timestamp conflict checks.

- [ ] **Step 3: Implement drafts API**

`GET /api/drafts?latest=true` restores latest draft.

`POST /api/drafts` saves draft with version.

- [ ] **Step 4: Implement creation studio**

UI fields:

- 选题
- 受众
- 平台
- 风格
- Prompt
- 素材
- 标题
- 正文
- 标签

Client behavior:

- call AI generate.
- autosave every 30 seconds.
- save to localStorage while offline.
- listen to `online` event and sync.

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test -- tests/unit/draft-conflict.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/drafts src/app/api/drafts 'src/app/(workspace)/create/page.tsx' src/components/offline-sync-indicator.tsx tests/unit/draft-conflict.test.ts
git commit -m "feat: add creation studio autosave and offline sync"
```

### Task 9: Implement Moderation, Quality Scoring, and Rewrite

**Files:**
- Create: `src/features/moderation/rules.ts`
- Create: `src/features/moderation/moderation-service.ts`
- Create: `src/features/quality/quality-service.ts`
- Create: `src/app/api/moderation/review/route.ts`
- Create: `src/app/api/moderation/rewrite/route.ts`
- Create: `src/components/moderation-panel.tsx`
- Create: `src/components/quality-score-card.tsx`
- Modify: `src/app/(workspace)/review/page.tsx`
- Modify: `src/app/(workspace)/create/page.tsx`
- Test: `tests/unit/moderation-rules.test.ts`
- Test: `tests/unit/quality-service.test.ts`

- [ ] **Step 1: Write moderation and quality tests**

Test high-risk examples for gambling, drugs, pornography, sensitive info, lowbrow phrasing, and privacy leakage.

Test quality scoring normalizes to 0-100 and exposes dimension scores.

- [ ] **Step 2: Implement rules and quality service**

Rules must return risk type, level, matched reason, and suggested action.

Quality service returns:

- originality
- structure
- information density
- clarity
- interaction potential
- platform fit
- total score

- [ ] **Step 3: Implement moderation service**

Orchestrate:

- local rule check.
- AI provider review when available.
- safe fallback if AI fails.
- rewrite request.

- [ ] **Step 4: Add API routes**

`POST /api/moderation/review`

`POST /api/moderation/rewrite`

- [ ] **Step 5: Add UI panel**

Creation and review pages show risk level, reasons, quality score, and one-click compliant rewrite.

- [ ] **Step 6: Run tests**

Run:

```bash
npm run test -- tests/unit/moderation-rules.test.ts tests/unit/quality-service.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/moderation src/features/quality src/app/api/moderation src/components/moderation-panel.tsx src/components/quality-score-card.tsx 'src/app/(workspace)/review' 'src/app/(workspace)/create/page.tsx' tests/unit
git commit -m "feat: add moderation quality scoring and rewrite"
```

### Task 10: Implement Publish, Content Management, and Details

**Files:**
- Create: `src/app/api/posts/route.ts`
- Create: `src/app/api/posts/[id]/route.ts`
- Modify: `src/app/(workspace)/posts/page.tsx`
- Create: `src/app/content/[id]/page.tsx`
- Test: `tests/api/content-flow.test.ts`

- [ ] **Step 1: Write content flow API tests**

Test:

- high-risk content cannot publish.
- reviewed safe content can publish.
- published content can be edited and re-reviewed.
- content detail returns author, time, cover, body, tags, quality summary.

- [ ] **Step 2: Implement posts API**

`POST /api/posts` publishes only if moderation allows.

`GET /api/posts` lists drafts/published/rejected by status.

`GET /api/posts/[id]` returns details.

`PATCH /api/posts/[id]` updates content and requires re-review.

- [ ] **Step 3: Implement posts page**

Tabs:

- 草稿
- 已发布
- 被驳回

Actions:

- 二次编辑
- 重新审核
- 更新发布

- [ ] **Step 4: Implement detail page**

Show publisher, publish time, cover, body, tags, read count, quality summary.

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test -- tests/api/content-flow.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/posts 'src/app/(workspace)/posts' src/app/content tests/api/content-flow.test.ts
git commit -m "feat: add publishing content management and detail pages"
```

### Task 11: Implement Ranking and Infinite Scroll

**Files:**
- Create: `src/features/ranking/ranking-service.ts`
- Create: `src/app/api/ranking/route.ts`
- Create: `src/components/ranking-list.tsx`
- Modify: `src/app/(workspace)/rankings/page.tsx`
- Test: `tests/unit/ranking-service.test.ts`

- [ ] **Step 1: Write ranking tests**

Assert formula:

```text
综合分 = 质量分 * 0.45 + 热度分 * 0.30 + 新鲜度 * 0.15 + 反馈分 * 0.10 - 风险惩罚
```

Test pagination and sorting stability.

- [ ] **Step 2: Implement ranking service**

Return sorted items with explanation:

- quality contribution
- heat contribution
- freshness contribution
- feedback contribution
- risk penalty

- [ ] **Step 3: Implement ranking API**

`GET /api/ranking?type=hot|viral|recommended&cursor=...`

- [ ] **Step 4: Implement ranking page**

Tabs:

- 热点榜
- 爆文榜
- 推荐流

Use infinite scroll and lightweight cards.

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test -- tests/unit/ranking-service.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/ranking src/app/api/ranking src/components/ranking-list.tsx 'src/app/(workspace)/rankings' tests/unit/ranking-service.test.ts
git commit -m "feat: add intelligent rankings and infinite scroll"
```

### Task 12: Implement Rules and Evaluation Pages

**Files:**
- Create: `src/features/evaluation/evaluation-service.ts`
- Create: `src/app/api/moderation/evaluate/route.ts`
- Modify: `src/app/(workspace)/rules/page.tsx`
- Modify: `src/app/(workspace)/evaluation/page.tsx`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Implement rules page**

Show audit categories and quality scoring dimensions with clear boundaries and handling strategy.

- [ ] **Step 2: Implement evaluation service**

Calculate:

- total evaluation cases.
- high-risk accuracy.
- false positives.
- false negatives.
- rewrite before/after samples.
- ranking factor contributions.

- [ ] **Step 3: Implement evaluation API**

`GET /api/moderation/evaluate` returns computed metrics from `EvaluationCase`.

- [ ] **Step 4: Implement evaluation page**

Show:

- 90%+ high-risk recognition metric.
- prompt tuning notes.
- rewrite comparisons.
- ranking explanation summary.
- LCP section that shows a pending state until Task 14 writes measured results.

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/evaluation src/app/api/moderation/evaluate 'src/app/(workspace)/rules' 'src/app/(workspace)/evaluation' prisma/seed.ts
git commit -m "feat: add rules and evaluation dashboards"
```

### Task 13: Add End-to-End Creator Flow

**Files:**
- Create: `tests/e2e/creator-flow.spec.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Write E2E test**

Flow:

1. Open login page.
2. Login with demo account.
3. Open material library and select demo material.
4. Open creation studio.
5. Generate content with mock AI.
6. Review content.
7. Publish content.
8. Open rankings and verify content appears.
9. Open detail page.

- [ ] **Step 2: Run E2E test and verify failure**

Run:

```bash
npm run test:e2e -- tests/e2e/creator-flow.spec.ts
```

Expected: initially fix selectors/data until PASS.

- [ ] **Step 3: Stabilize selectors**

Use accessible names and `data-testid` only where accessible names are insufficient.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/creator-flow.spec.ts playwright.config.ts src
git commit -m "test: add creator flow e2e coverage"
```

### Task 14: Add Performance Verification

**Files:**
- Create: `tests/performance/lcp.spec.ts`
- Modify: `src/app/(workspace)/rankings/page.tsx`
- Modify: `src/app/content/[id]/page.tsx`
- Modify: `docs/evaluation-report.md`

- [ ] **Step 1: Add LCP measurement test**

Use Playwright browser performance APIs to record LCP for rankings and content detail.

- [ ] **Step 2: Optimize rankings and detail**

Apply:

- server-render first page of rankings.
- paginate after first screen.
- optimize image dimensions.
- avoid blocking client-only waterfalls.
- use skeletons only for below-the-fold sections.

- [ ] **Step 3: Run performance check**

Run:

```bash
npm run build
npm run start
npm run test:e2e -- tests/performance/lcp.spec.ts
```

Expected: recorded LCP <= 2.5s on local production build, or documented local machine caveat with measured values.

- [ ] **Step 4: Commit**

```bash
git add tests/performance/lcp.spec.ts 'src/app/(workspace)/rankings' src/app/content docs/evaluation-report.md
git commit -m "perf: verify ranking and detail lcp"
```

### Task 15: Write Delivery Documentation

**Files:**
- Create: `README.md`
- Create: `docs/architecture.md`
- Create: `docs/safety-and-quality.md`
- Create: `docs/evaluation-report.md`
- Create: `docs/deployment.md`

- [ ] **Step 1: Write README**

Include:

- project summary.
- feature coverage table against PDF.
- setup steps.
- scripts.
- demo account.
- AI environment variables.
- local/online storage caveat.

- [ ] **Step 2: Write architecture document**

Cover:

- Next.js single-project architecture.
- API boundaries.
- data model.
- AI provider fallback.
- production evolution path.

- [ ] **Step 3: Write safety and quality document**

Cover:

- audit rule categories.
- risk levels.
- quality scoring dimensions.
- intervention strategy.

- [ ] **Step 4: Write evaluation report**

Cover:

- generation examples.
- moderation accuracy from test set.
- prompt tuning iterations.
- rewrite before/after examples.
- ranking formula and optimization.
- LCP measurement.

- [ ] **Step 5: Write deployment document**

Cover:

- local run.
- Vercel deployment.
- PostgreSQL migration.
- object storage setup.
- fallback to preloaded materials if object storage unavailable.

- [ ] **Step 6: Commit**

```bash
git add README.md docs
git commit -m "docs: add delivery documentation"
```

### Task 16: Final Verification and Handoff

**Files:**
- Modify as needed based on verification failures only.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run test
npm run build
npm run test:e2e
```

Expected: all pass.

- [ ] **Step 2: Check PDF coverage**

Confirm README and docs cover:

- all required core features.
- all advanced challenges.
- public URL dependency.
- GitHub main/master requirement.
- LCP and 90%+ accuracy evidence.

- [ ] **Step 3: Check Git status**

Run:

```bash
git status --short
```

Expected: clean working tree.

- [ ] **Step 4: Commit final fixes if any**

```bash
git add .
git commit -m "chore: finalize platform delivery"
```

Only commit if verification required fixes.
