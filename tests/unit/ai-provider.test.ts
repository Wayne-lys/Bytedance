import { describe, expect, it } from "vitest";
import { createMockAiProvider } from "@/features/ai/mock-provider";
import { chooseAiProviderName, resolveAiProviderConfig } from "@/features/ai/provider";

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

  it("resolves official Ark aliases with the default Ark base URL", () => {
    const resolved = resolveAiProviderConfig(
      {},
      {
        ARK_API_KEY: "test-key",
        ARK_MODEL: "ep-test",
        ARK_USER: "creator@example.com"
      }
    );

    expect(resolved).toEqual({
      apiKey: "test-key",
      baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
      model: "ep-test",
      user: "creator@example.com"
    });
    expect(chooseAiProviderName(resolved)).toBe("openai-compatible");
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

  it("varies mock fallback content by the selected prompt template", async () => {
    const provider = createMockAiProvider();
    const checklistResult = await provider.generateShortPost({
      ...creationInput,
      prompt: "把 {{topic}} 拆成可执行清单，每一点给出简短理由。"
    });
    const headlineResult = await provider.generateShortPost({
      ...creationInput,
      prompt: "围绕 {{topic}} 生成 10 个适合信息流点击的标题。"
    });

    expect(checklistResult.body).not.toBe(headlineResult.body);
    expect(checklistResult.body).toContain("清单");
    expect(headlineResult.body).toContain("标题");
  });

  it("returns actual headline options instead of prompt instructions for headline templates", async () => {
    const provider = createMockAiProvider();
    const result = await provider.generateShortPost({
      ...creationInput,
      prompt: "围绕 {{topic}} 生成 10 个适合信息流点击的标题。"
    });

    expect(result.body).toContain("1. ");
    expect(result.body).toContain("10. ");
    expect(result.body).toContain("通勤路上的轻量补能");
    expect(result.body).not.toContain("模板要求");
    expect(result.body).not.toContain("按当前标题模板生成");
  });
});
