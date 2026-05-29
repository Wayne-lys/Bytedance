import { reviewContentWithRules } from "@/features/moderation/rules";
import { rewriteCompliantContent } from "@/features/moderation/moderation-service";

export type EvaluationCaseInput = {
  id: string;
  title: string;
  content: string;
  expectedRisk: string;
  expectedLevel: string;
};

const riskLevels = ["safe", "low", "medium", "high"] as const;

function emptyDistribution() {
  return {
    safe: 0,
    low: 0,
    medium: 0,
    high: 0
  };
}

function isRiskLevel(level: string): level is (typeof riskLevels)[number] {
  return riskLevels.includes(level as (typeof riskLevels)[number]);
}

function isFalsePositive(expectedLevel: string, actualLevel: string) {
  return (
    (expectedLevel === "safe" || expectedLevel === "low") &&
    (actualLevel === "medium" || actualLevel === "high")
  );
}

function isFalseNegative(expectedLevel: string, actualLevel: string) {
  return expectedLevel === "high" && actualLevel !== "high";
}

export function evaluateSafetyCases(cases: EvaluationCaseInput[]) {
  const caseResults = cases.map((item) => {
    const moderation = reviewContentWithRules(item.content);
    const actualLevel = moderation.riskLevel;
    const matched = item.expectedLevel === actualLevel;

    return {
      id: item.id,
      title: item.title,
      content: item.content,
      expectedRisk: item.expectedRisk,
      expectedLevel: item.expectedLevel,
      actualRisk: moderation.riskTypes.join(","),
      actualLevel,
      matched,
      reason: moderation.reason,
      suggestedAction: moderation.suggestedAction
    };
  });

  const highRiskCases = caseResults.filter((item) => item.expectedLevel === "high");
  const highRiskCorrect = highRiskCases.filter((item) => item.actualLevel === "high");
  const riskDistribution = caseResults.reduce((distribution, item) => {
    const level = isRiskLevel(item.actualLevel) ? item.actualLevel : "safe";
    distribution[level] += 1;

    return distribution;
  }, emptyDistribution());
  const rewriteSamples = caseResults
    .filter((item) => item.actualLevel !== "safe")
    .slice(0, 3)
    .map((item) => ({
      title: item.title,
      riskLevel: item.actualLevel,
      before: item.content,
      after: rewriteCompliantContent(item.content)
    }));

  return {
    totalCases: caseResults.length,
    highRiskAccuracy:
      highRiskCases.length === 0
        ? 0
        : Math.round((highRiskCorrect.length / highRiskCases.length) * 100),
    falsePositives: caseResults.filter((item) =>
      isFalsePositive(item.expectedLevel, item.actualLevel)
    ).length,
    falseNegatives: caseResults.filter((item) =>
      isFalseNegative(item.expectedLevel, item.actualLevel)
    ).length,
    riskDistribution,
    caseResults,
    rewriteSamples,
    rankingFactors: {
      qualityWeight: 0.45,
      heatWeight: 0.3,
      freshnessWeight: 0.15,
      feedbackWeight: 0.1,
      riskPenalty: "按安全等级动态扣分"
    },
    promptTuningNotes: [
      "生成前先约束平台、受众、风险边界和素材来源。",
      "审核命中 medium/high 后优先触发合规改写，再允许人工确认发布。",
      "质量评分低于 70 分时提示补充结构、信息密度和互动引导。"
    ],
    lcp: {
      status: "pending",
      target: "<= 2.5s",
      note: "Task 14 将写入 Playwright/Lighthouse 实测结果。"
    }
  };
}
