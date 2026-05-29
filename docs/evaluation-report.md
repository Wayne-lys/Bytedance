# Evaluation Report

## Safety Accuracy

The evaluation dashboard computes metrics from `EvaluationCase` records at runtime.

- High-risk recognition target: 90%+
- Reported metrics: total cases, high-risk accuracy, false positives, false negatives, risk distribution
- Review loop: risky samples are passed through the same local moderation rules used by publishing
- Rewrite loop: medium/high risk cases include before/after compliant rewrite samples

## Ranking Formula

The ranking score is calculated as:

```text
score = quality * 0.45 + heat * 0.30 + freshness * 0.15 + feedback * 0.10 - riskPenalty
```

The UI exposes the contribution from each factor so reviewers can explain why an item appears in the hot, viral, or recommended views.

## LCP Verification

Automated check:

```bash
npm run test:e2e -- tests/performance/lcp.spec.ts
```

The test publishes a lightweight demo post, measures Largest Contentful Paint for `/rankings` and the generated `/content/[id]` detail page, and enforces:

```text
LCP <= 2500ms
```

Latest local verification on 2026-05-29:

- `/rankings`: 444ms
- `/content/[id]`: 1144ms

Exact millisecond values are also printed by the Playwright test because local hardware and background load can vary.

## Performance Design Notes

- Rankings render the first page server-side, then use cursor pagination for additional content.
- Content detail uses stable image dimensions to reduce layout shift.
- Below-the-fold supporting panels are lightweight and do not block first content paint.
- The performance test runs separately from Vitest so browser metrics are measured in a real Chromium context.
