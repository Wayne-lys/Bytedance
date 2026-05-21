import { describe, expect, it } from "vitest";
import { scoreQuality } from "@/features/quality/quality-service";

describe("quality scoring", () => {
  it("returns normalized dimension scores and a total score", () => {
    const result = scoreQuality({
      title: "通勤路上的 3 个轻量补能习惯",
      body: "早高峰可以提前准备低糖咖啡、阅读清单和 10 分钟轻运动。每个动作都有明确场景和执行方式。",
      tags: ["通勤", "效率", "生活方式"],
      platform: "头条"
    });

    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.structure).toBeGreaterThan(0);
    expect(result.platformFit).toBeGreaterThan(0);
  });
});
