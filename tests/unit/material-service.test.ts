import { describe, expect, it } from "vitest";
import { evaluateMaterialCompliance } from "@/features/materials/material-service";

describe("material compliance", () => {
  it("marks common image files as safe", () => {
    const result = evaluateMaterialCompliance({
      name: "cafe-cover.jpg",
      type: "image/jpeg",
      size: 480_000
    });

    expect(result.compliance).toBe("safe");
    expect(result.riskReason).toBeNull();
  });

  it("blocks unsupported file types", () => {
    const result = evaluateMaterialCompliance({
      name: "script.exe",
      type: "application/x-msdownload",
      size: 20_000
    });

    expect(result.compliance).toBe("blocked");
    expect(result.riskReason).toContain("文件类型");
  });

  it("warns for risky filename words", () => {
    const result = evaluateMaterialCompliance({
      name: "扫码进群福利.png",
      type: "image/png",
      size: 320_000
    });

    expect(result.compliance).toBe("warning");
    expect(result.riskReason).toContain("导流");
  });

  it("blocks files larger than the demo limit", () => {
    const result = evaluateMaterialCompliance({
      name: "huge.png",
      type: "image/png",
      size: 8 * 1024 * 1024
    });

    expect(result.compliance).toBe("blocked");
    expect(result.riskReason).toContain("大小");
  });
});
