# Safety and Quality

## Audit Categories

The audit rule system covers:

- 涉黄
- 涉赌
- 涉毒
- 敏感信息
- 广告导流
- 低俗内容

Each rule has a category, risk level, regex pattern, and action.

## Risk Levels

- `safe`: allow publishing.
- `low`: warn but can continue.
- `medium`: requires rewrite or manual review before publishing.
- `high`: block publishing.

Publishing rejects medium/high content. Safe and low-risk content can proceed.

## Intervention Strategy

1. Generate or edit content.
2. Run moderation.
3. Run quality scoring.
4. If high-risk: block.
5. If medium-risk: require rewrite/review.
6. If safe/low-risk: allow publish.
7. Persist moderation result and quality score with the post.
8. If content later needs governance intervention, use content management actions to take it offline, withdraw it, or roll it back to the latest published state.

## Quality Dimensions

The quality score is normalized to 0-100 across:

- Originality
- Structure
- Information density
- Clarity
- Interaction potential
- Platform fit

The total score is used by the review UI and ranking formula.

## Rewrite Loop

`/api/moderation/rewrite` replaces risky phrases with compliant alternatives. The evaluation report data keeps before/after examples so reviewers can inspect whether the rewrite keeps the content useful while reducing risk.

## Distribution Governance

`/api/posts/[id]/status` supports:

- `offline`: take published content out of recommendation and ranking surfaces.
- `withdraw`: mark content as withdrawn by the creator/operator.
- `rollback`: restore governed content to the published state after review.

The ranking API only reads `published` content, so offline and withdrawn content immediately leaves the hot, latest, and recommended feeds.
