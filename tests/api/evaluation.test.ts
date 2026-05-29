import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

describe("evaluation api", () => {
  beforeEach(async () => {
    await prisma.evaluationCase.deleteMany();
    await prisma.evaluationCase.createMany({
      data: [
        {
          title: "涉赌高危样例",
          content: "这个下注方法稳赚不赔，今晚就能回本。",
          expectedRisk: "涉赌",
          expectedLevel: "high"
        },
        {
          title: "涉毒高危样例",
          content: "这类违禁药来源隐蔽，可以私下交易。",
          expectedRisk: "涉毒",
          expectedLevel: "high"
        },
        {
          title: "安全种草内容",
          content: "周末在家准备低糖酸奶碗，搭配蓝莓和燕麦。",
          expectedRisk: "none",
          expectedLevel: "safe"
        }
      ]
    });
  });

  it("returns computed evaluation metrics from evaluation cases", async () => {
    const { GET } = await import("@/app/api/moderation/evaluate/route");

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.totalCases).toBe(3);
    expect(payload.data.highRiskAccuracy).toBeGreaterThanOrEqual(90);
    expect(payload.data.falsePositives).toBe(0);
    expect(payload.data.falseNegatives).toBe(0);
    expect(payload.data.caseResults).toHaveLength(3);
    expect(payload.data.rankingFactors.qualityWeight).toBe(0.45);
  });
});
