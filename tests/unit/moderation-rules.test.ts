import { describe, expect, it } from "vitest";
import { reviewContentWithRules } from "@/features/moderation/rules";

describe("moderation rules", () => {
  it("blocks high-risk gambling content", () => {
    const result = reviewContentWithRules("这个下注方法稳赚不赔，今晚就能回本。");

    expect(result.riskLevel).toBe("high");
    expect(result.riskTypes).toContain("涉赌");
    expect(result.suggestedAction).toBe("block");
  });

  it("blocks illegal drug use intent", () => {
    const result = reviewContentWithRules("标题：我要吸毒\n正文：我要吸毒");

    expect(result.riskLevel).toBe("high");
    expect(result.riskTypes).toContain("涉毒");
    expect(result.suggestedAction).toBe("block");
  });

  it("flags privacy leakage for review", () => {
    const result = reviewContentWithRules("这里贴出用户手机号和详细住址方便联系。");

    expect(result.riskLevel).toBe("medium");
    expect(result.riskTypes).toContain("敏感信息");
    expect(result.suggestedAction).toBe("review");
  });

  it("allows safe lifestyle content", () => {
    const result = reviewContentWithRules("周末可以准备低糖酸奶碗，搭配蓝莓和燕麦。");

    expect(result.riskLevel).toBe("safe");
    expect(result.suggestedAction).toBe("allow");
  });
});
