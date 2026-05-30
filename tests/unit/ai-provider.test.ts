import { describe, expect, it } from "vitest";
import { createMockAiProvider } from "@/features/ai/mock-provider";
import { chooseAiProviderName } from "@/features/ai/provider";

const creationInput = {
  topic: "通勤路上的轻量补能",
  audience: "城市白领",
  platform: "头条",
  style: "真实、具体、信息密度高",
  prompt: "生成短图文",
  materials: ["城市咖啡店封面"]
};

describe("ai provider", () => {
  it("uses the mock provider when no API key is configured", () => {
    expect(chooseAiProviderName({ apiKey: "", baseUrl: "", model: "" })).toBe(
      "mock"
    );
  });

  it("uses the OpenAI-compatible provider when credentials are configured", () => {
    expect(
      chooseAiProviderName({
        apiKey: "test-key",
        baseUrl: "https://example.com/v1",
        model: "test-model"
      })
    ).toBe("openai-compatible");
  });

  it("generates deterministic short image-text content with the mock provider", async () => {
    const provider = createMockAiProvider();
    const result = await provider.generateShortPost(creationInput);

    expect(result.title).toContain("通勤路上的轻量补能");
    expect(result.body.length).toBeGreaterThan(40);
    expect(result.tags).toContain("头条");
    expect(result.tags).not.toContain("通勤路上的轻量补能");
    expect(result.provider).toBe("mock");
  });
});
