import { describe, expect, it } from "vitest";
import {
  buildAiModerationCompletionParams,
  reviewAndScoreContent,
  verifyReviewToken
} from "@/features/moderation/moderation-service";

describe("moderation service", () => {
  it("builds Ark moderation requests without unsupported JSON response_format", () => {
    const params = buildAiModerationCompletionParams(
      {
        title: "我要吸毒",
        body: "我要吸毒",
        tags: ["测试"],
        platform: "头条"
      },
      {
        model: "ep-test",
        user: "reviewer@example.com"
      }
    );

    expect(params).not.toHaveProperty("response_format");
    expect(params.model).toBe("ep-test");
    expect(params.messages).toHaveLength(2);
  });

  it("reports local rules and Ark AI as separate audit providers", async () => {
    const result = await reviewAndScoreContent(
      {
        title: "健康作息",
        body: "分享白领午休和通勤补能建议。",
        tags: ["白领生活"],
        platform: "头条"
      },
      {
        reviewWithAi: async () => ({
          riskLevel: "medium",
          riskTypes: ["AI 语义复核"],
          matchedRules: ["semantic-review"],
          reason: "Ark AI 建议人工复核。",
          suggestedAction: "review",
          provider: "openai-compatible"
        })
      }
    );

    expect(result.moderation.riskLevel).toBe("medium");
    expect(result.moderation.providers).toEqual([
      "local-rules",
      "openai-compatible"
    ]);
    expect(result.localModeration.provider).toBe("local-rules");
    expect(result.aiModeration?.provider).toBe("openai-compatible");
    expect(result.auditProviders).toEqual({
      local: { provider: "local-rules", status: "completed" },
      ai: { provider: "openai-compatible", status: "completed" }
    });
  });

  it("issues a review token bound to the reviewed content", async () => {
    const input = {
      title: "通勤补能",
      body: "提前准备低糖咖啡和阅读清单，让早高峰更可控。",
      tags: ["通勤", "效率"],
      platform: "头条"
    };
    const result = await reviewAndScoreContent(input);

    expect(result.reviewToken).toEqual(expect.any(String));
    expect(
      verifyReviewToken(input, result.moderation.riskLevel, result.reviewToken)
    ).toBe(true);
    expect(
      verifyReviewToken(
        { ...input, body: "审核之后修改过的正文" },
        result.moderation.riskLevel,
        result.reviewToken
      )
    ).toBe(false);
  });
});
