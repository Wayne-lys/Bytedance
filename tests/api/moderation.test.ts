import { describe, expect, it } from "vitest";

describe("moderation api", () => {
  it("reviews risky content and returns quality scores", async () => {
    const { POST } = await import("@/app/api/moderation/review/route");

    const response = await POST(
      new Request("http://localhost/api/moderation/review", {
        method: "POST",
        body: JSON.stringify({
          title: "稳赚方法",
          body: "这个下注方法稳赚不赔，今晚就能回本。",
          tags: ["热点"],
          platform: "头条"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.moderation.riskLevel).toBe("high");
    expect(payload.data.quality.total).toBeGreaterThanOrEqual(0);
  });

  it("rewrites risky phrases into compliant wording", async () => {
    const { POST } = await import("@/app/api/moderation/rewrite/route");

    const response = await POST(
      new Request("http://localhost/api/moderation/rewrite", {
        method: "POST",
        body: JSON.stringify({
          content: "扫码进群后可以下注稳赚。"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.content).not.toContain("下注");
    expect(payload.data.content).not.toContain("扫码进群");
  });
});
