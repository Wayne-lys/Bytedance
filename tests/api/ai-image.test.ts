import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const imagesGenerateMock = vi.hoisted(() => vi.fn());

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    images: {
      generate: imagesGenerateMock
    }
  }))
}));

const imageEnvKeys = [
  "IMAGE_API_KEY",
  "IMAGE_BASE_URL",
  "IMAGE_MODEL",
  "IMAGE_USER",
  "ARK_IMAGE_API_KEY",
  "ARK_IMAGE_BASE_URL",
  "ARK_IMAGE_MODEL",
  "ARK_IMAGE_ENDPOINT_ID",
  "ARK_IMAGE_USER",
  "AI_API_KEY",
  "AI_BASE_URL",
  "ARK_API_KEY",
  "ARK_BASE_URL",
  "AI_USER",
  "ARK_USER"
] as const;

let originalImageEnv: Record<(typeof imageEnvKeys)[number], string | undefined>;

describe("ai image api", () => {
  beforeEach(() => {
    originalImageEnv = Object.fromEntries(
      imageEnvKeys.map((key) => [key, process.env[key]])
    ) as Record<(typeof imageEnvKeys)[number], string | undefined>;
    imageEnvKeys.forEach((key) => {
      delete process.env[key];
    });
    imagesGenerateMock.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    imageEnvKeys.forEach((key) => {
      const value = originalImageEnv[key];

      if (value === undefined) {
        delete process.env[key];
        return;
      }

      process.env[key] = value;
    });
  });

  it("generates a mock cover image when no image provider is configured", async () => {
    const { POST } = await import("@/app/api/ai/image/route");

    const response = await POST(
      new Request("http://localhost/api/ai/image", {
        method: "POST",
        body: JSON.stringify({
          prompt: "通勤补能封面",
          title: "通勤路上的轻量补能",
          topic: "通勤补能",
          audience: "城市白领",
          platform: "头条",
          style: "真实、具体、信息密度高",
          materials: ["通勤补能清单"]
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.image.provider).toBe("mock");
    expect(payload.data.image.url).toContain("data:image/svg+xml");
    expect(payload.data.image.prompt).toContain("通勤补能封面");
    expect(imagesGenerateMock).not.toHaveBeenCalled();
  });

  it("calls the configured OpenAI-compatible image provider", async () => {
    process.env.IMAGE_API_KEY = "test-image-key";
    process.env.IMAGE_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
    process.env.IMAGE_MODEL = "ep-image-test";
    imagesGenerateMock.mockResolvedValueOnce({
      data: [{ url: "https://example.com/generated-cover.png" }]
    });
    const { POST } = await import("@/app/api/ai/image/route");

    const response = await POST(
      new Request("http://localhost/api/ai/image", {
        method: "POST",
        body: JSON.stringify({
          prompt: "通勤补能封面",
          title: "通勤路上的轻量补能",
          topic: "通勤补能",
          audience: "城市白领",
          platform: "头条",
          style: "真实、具体、信息密度高",
          materials: ["通勤补能清单"],
          size: "1024x1024"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.image.provider).toBe("openai-compatible");
    expect(payload.data.image.url).toBe("https://example.com/generated-cover.png");
    expect(imagesGenerateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "ep-image-test",
        size: "1024x1024",
        n: 1
      })
    );
    expect(imagesGenerateMock.mock.calls[0]?.[0]?.prompt).toContain(
      "通勤路上的轻量补能"
    );
  });

  it("surfaces configured image provider failures", async () => {
    process.env.IMAGE_API_KEY = "test-image-key";
    process.env.IMAGE_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
    process.env.IMAGE_MODEL = "ep-image-test";
    imagesGenerateMock.mockRejectedValueOnce(new Error("403 no access to model"));
    const { POST } = await import("@/app/api/ai/image/route");

    const response = await POST(
      new Request("http://localhost/api/ai/image", {
        method: "POST",
        body: JSON.stringify({
          prompt: "通勤补能封面",
          title: "通勤路上的轻量补能"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("真实生图调用失败");
    expect(payload.error).toContain("403");
  });
});
