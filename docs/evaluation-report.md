# Evaluation Report

## Safety Accuracy

The evaluation dashboard computes metrics from `EvaluationCase` records at runtime.

- High-risk recognition target: 90%+
- Reported metrics: total cases, high-risk accuracy, false positives, false negatives, risk distribution
- Review loop: risky samples are passed through the same local moderation rules used by publishing
- Rewrite loop: medium/high risk cases include before/after compliant rewrite samples

Current automated evaluation is covered by:

```bash
npm run test -- tests/unit/evaluation-service.test.ts tests/api/evaluation.test.ts
```

The seeded test set includes safe, medium-risk, and high-risk cases. High-risk cases are expected to be identified at 90%+ accuracy.

## Generation Examples

The creation studio can generate short image-text content from:

- Topic
- Audience
- Platform
- Style
- Prompt template
- Optional materials

The prompt library is not static: creators can add new templates in the creation desk, then immediately select the new template for generation.

When external AI configuration is absent or unstable, deterministic mock generation keeps the demo flow available. This is intentional for review stability.

## Prompt Tuning Notes

- Put platform, audience, risk boundary, and material constraints in the prompt.
- Treat `medium` and `high` moderation hits as rewrite triggers.
- Ask for concrete scenes and numbered suggestions to improve structure and information density.
- Keep interaction prompts compliant and avoid private-contact or gambling-like language.

## Ranking Formula

The ranking score is calculated as:

```text
score = quality * 0.45 + heat * 0.30 + freshness * 0.15 + feedback * 0.10 - riskPenalty
```

The UI exposes the contribution from each factor so reviewers can explain why an item appears in the hot, latest, or recommended views. Hot ranking sorts by real detail-page reads first; latest ranking sorts by publish time; recommended ranking uses the weighted score above. Likes and comments refresh the feedback score used by recommended ranking.

## Advanced Challenge Coverage

- Short image-text creative editor: structured inputs plus Prompt and material context generate complete title, body, tags, cover suggestion, and publish advice.
- High-precision safety recognition: the rules and evaluation dashboard target 90%+ high-risk recognition and expose false-positive / false-negative metrics.
- Content governance: content management supports offline, withdrawal, and rollback actions; non-published content is excluded from ranking feeds.
- Intelligent ranking: rankings combine quality, real read heat, freshness, reader feedback, and risk penalty, with visible contribution explanations and cursor-based infinite loading. Likes and comments update the feedback score used by recommended ranking.

## LCP Verification

Automated check:

```bash
npm run test:e2e -- tests/performance/lcp.spec.ts
```

The test publishes a lightweight demo post, measures Largest Contentful Paint for `/rankings` and the generated `/content/[id]` detail page, and enforces:

```text
LCP <= 2500ms
```

Latest local verification target:

- `/rankings`: <= 2500ms
- generated `/content/[id]`: <= 2500ms

Exact millisecond values are also printed by the Playwright test because local hardware and background load can vary.

## Performance Design Notes

- Rankings render the first page server-side, then use cursor pagination for additional content.
- Content detail uses stable image dimensions to reduce layout shift.
- Below-the-fold supporting panels are lightweight and do not block first content paint.
- The performance test runs separately from Vitest so browser metrics are measured in a real Chromium context.
