# Delivery Checklist

This checklist maps the PDF deliverables to the repository artifacts and the remaining external handoff items.

## Required Deliverables

| PDF deliverable | Status | Evidence |
| --- | --- | --- |
| Runnable creator assistance and distribution platform | Code complete | Next.js app, Prisma schema, API routes, tests |
| Public online URL or QR code | Needs final external input | Fill the deployed URL below after Vercel/GitHub Pages provider is updated |
| Technical architecture document in Feishu | Draft ready | `docs/feishu-technical-solution.md` |
| Evaluation and distribution optimization report in Feishu | Draft ready | `docs/feishu-evaluation-summary.md` |
| Safety rules and quality evaluation system | Draft ready | `docs/feishu-safety-quality-system.md` |
| GitHub-hosted code on main/master | Complete | `https://github.com/Wayne-lys/Bytedance`, branch `master` |
| Source code archive | Prepared locally | `deliverables/toutiao-ai-creator-platform-source.zip` |

## Deployment Fields To Fill

- Public URL: `https://bytedance-theta.vercel.app`
- QR code: optional. Generate from the public URL only if the submission page asks for it.
- Latest deployed commit: use the latest `Ready / Production` commit shown in Vercel Deployments. Feature verification commit: `5b49b19`.
- Database sync: Neon `DATABASE_URL` is configured in Vercel. Build command should run `npm run db:push && npm run build`; run `npm run db:seed` only once when intentionally resetting demo data.

## Verification Commands

```bash
npm run test
npm run build
npm run test:e2e -- tests/performance/lcp.spec.ts
```

Latest local verification:

- `npm run test`: 137 tests passed.
- `npm run build`: passed, with only existing Next.js `<img>` optimization warnings.

## Feature Coverage Summary

- User center: email/password, email code registration, phone code login/auto-registration, logout.
- Creation: Prompt templates, material selection, AI generation, publish advice, one-click publish, second edit/update.
- Drafting: local cache, 30-second cloud autosave, recovery, offline continuation and sync.
- Safety: local rules plus Ark/OpenAI-compatible moderation when configured, blocking, rewrite, persisted review records.
- Quality: six-dimension score persisted with published content.
- Ranking: hot by real reads, latest by publish time, recommended by quality, heat, freshness, feedback, and risk penalty.
- Feedback: detail page views increment reads; likes and comments update feedback score.
- Governance: offline, withdrawal, rollback, and exclusion from ranking surfaces.
- External distribution: published and review-passed content can be simulated as synced to Douyin image-text content, with persisted external work ID and sync status.

## Optional Bonus Status

- Douyin/Toutiao Open API: sandbox adapter complete. Published, review-passed posts can be simulated as synced to Douyin image-text content with a persisted mock external work ID. Real live access still requires platform application, domain, OAuth callback, and business/individual merchant credentials.
