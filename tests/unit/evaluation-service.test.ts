import { describe, expect, it } from "vitest";
import { evaluateSafetyCases } from "@/features/evaluation/evaluation-service";

describe("evaluation service", () => {
  it("calculates high-risk accuracy, false positives, false negatives, and distribution", () => {
    const report = evaluateSafetyCases([
      {
        id: "case-high-1",
        title: "涉赌高危",
        content: "这个下注方法稳赚不赔，今晚就能回本。",
        expectedRisk: "涉赌",
        expectedLevel: "high"
      },
      {
        id: "case-high-2",
        title: "涉毒高危",
        content: "这类违禁药来源隐蔽，可以私下交易。",
        expectedRisk: "涉毒",
        expectedLevel: "high"
      },
      {
        id: "case-safe",
        title: "安全内容",
        content: "周末在家准备低糖酸奶碗，搭配蓝莓和燕麦。",
        expectedRisk: "none",
        expectedLevel: "safe"
      }
    ]);

    expect(report.totalCases).toBe(3);
    expect(report.highRiskAccuracy).toBe(100);
    expect(report.falsePositives).toBe(0);
    expect(report.falseNegatives).toBe(0);
    expect(report.riskDistribution.high).toBe(2);
    expect(report.caseResults[0].matched).toBe(true);
    expect(report.rewriteSamples.length).toBeGreaterThan(0);
  });
});
