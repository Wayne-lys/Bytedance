import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const completionCreateMock = vi.hoisted(() => vi.fn());

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: completionCreateMock
      }
    }
  }))
}));

const aiEnvKeys = [
  "AI_API_KEY",
  "AI_BASE_URL",
  "AI_MODEL",
  "AI_USER",
  "ARK_API_KEY",
  "ARK_BASE_URL",
  "ARK_MODEL",
  "ARK_ENDPOINT_ID",
  "ARK_USER"
] as const;

let originalAiEnv: Record<(typeof aiEnvKeys)[number], string | undefined>;

describe("ai generate api", () => {
  beforeEach(() => {
    originalAiEnv = Object.fromEntries(
      aiEnvKeys.map((key) => [key, process.env[key]])
    ) as Record<(typeof aiEnvKeys)[number], string | undefined>;
    aiEnvKeys.forEach((key) => {
      delete process.env[key];
    });
    completionCreateMock.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    aiEnvKeys.forEach((key) => {
      const value = originalAiEnv[key];

      if (value === undefined) {
        delete process.env[key];
        return;
      }

      process.env[key] = value;
    });
  });

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

  it("surfaces configured AI provider failures instead of silently returning mock content", async () => {
    process.env.AI_API_KEY = "test-key";
    process.env.AI_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
    process.env.AI_MODEL = "ep-test";
    completionCreateMock.mockRejectedValueOnce(
      new Error("401 The API key doesn't exist")
    );
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

    expect(response.status).toBe(502);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("真实 AI 调用失败");
    expect(payload.error).toContain("401");
  });

  it("parses fenced JSON returned by the configured AI provider", async () => {
    process.env.AI_API_KEY = "test-key";
    process.env.AI_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
    process.env.AI_MODEL = "ep-test";
    completionCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: [
              "```json",
              JSON.stringify({
                title: "真实接口生成的周末轻食标题",
                body: "这是一段来自真实兼容接口的短图文正文，结构完整，适合信息流发布。",
                tags: ["头条", "轻食"],
                coverSuggestion: "选择一张明亮的轻食封面。",
                publishAdvice: "发布前检查标签和封面一致。"
              }),
              "```"
            ].join("\n")
          }
        }
      ]
    });
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
    expect(payload.data.generated.provider).toBe("openai-compatible");
    expect(payload.data.generated.title).toBe("真实接口生成的周末轻食标题");
  });
});
