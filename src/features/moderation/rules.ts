type Rule = {
  category: string;
  riskLevel: "low" | "medium" | "high";
  pattern: RegExp;
  action: "allow" | "warn" | "review" | "rewrite" | "block";
};

const rules: Rule[] = [
  { category: "涉黄", riskLevel: "high", pattern: /色情|裸聊|约炮/, action: "block" },
  { category: "涉赌", riskLevel: "high", pattern: /赌博|博彩|下注|稳赚/, action: "block" },
  { category: "涉毒", riskLevel: "high", pattern: /毒品|冰毒|大麻|违禁药/, action: "block" },
  {
    category: "敏感信息",
    riskLevel: "medium",
    pattern: /身份证|银行卡|住址|手机号/,
    action: "review"
  },
  {
    category: "广告导流",
    riskLevel: "medium",
    pattern: /加微信|私聊购买|扫码进群/,
    action: "rewrite"
  },
  { category: "低俗内容", riskLevel: "low", pattern: /震惊|跪求|喷子|傻眼/, action: "warn" }
];

const levelWeight = {
  safe: 0,
  low: 1,
  medium: 2,
  high: 3
};

export function reviewContentWithRules(content: string) {
  const matched = rules.filter((rule) => rule.pattern.test(content));

  if (matched.length === 0) {
    return {
      riskLevel: "safe",
      riskTypes: ["none"],
      matchedRules: [],
      reason: "未命中本地高危规则。",
      suggestedAction: "allow"
    };
  }

  const highest = matched.reduce((current, next) =>
    levelWeight[next.riskLevel] > levelWeight[current.riskLevel] ? next : current
  );

  return {
    riskLevel: highest.riskLevel,
    riskTypes: matched.map((rule) => rule.category),
    matchedRules: matched.map((rule) => rule.pattern.source),
    reason: `命中${matched.map((rule) => rule.category).join("、")}规则。`,
    suggestedAction: highest.action
  };
}
