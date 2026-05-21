import { describe, expect, it } from "vitest";

describe("ai generate api", () => {
  it("generates short image-text content through mock fallback", async () => {
    const { POST } = await import("@/app/api/ai/generate/route");

    const response = await POST(
      new Request("http://localhost/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          topic: "周末轻食",
          audience: "年轻上班族",
          platform: "头条",
          style: "自然可信",
          prompt: "生成短图文",
          materials: ["周末清单配图"]
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.generated.title).toContain("周末轻食");
    expect(payload.data.generated.provider).toBe("mock");
  });
});
