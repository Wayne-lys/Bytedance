import OpenAI from "openai";

export type GenerateImageInput = {
  prompt: string;
  title?: string;
  topic?: string;
  audience?: string;
  platform?: string;
  style?: string;
  body?: string;
  materials: string[];
  size?: string;
};

export type GeneratedImage = {
  url: string;
  prompt: string;
  provider: "mock" | "openai-compatible";
  model?: string;
};

export type ImageProvider = {
  generateImage(input: GenerateImageInput): Promise<GeneratedImage>;
};

export type ImageProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  user?: string;
};

export class ExternalImageProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalImageProviderError";
  }
}

type ImageSize =
  | "auto"
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"
  | "256x256"
  | "512x512"
  | "1792x1024"
  | "1024x1792";

const DEFAULT_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DEFAULT_IMAGE_SIZE: ImageSize = "1024x1024";
const supportedImageSizes = new Set<ImageSize>([
  "auto",
  "1024x1024",
  "1536x1024",
  "1024x1536",
  "256x256",
  "512x512",
  "1792x1024",
  "1024x1792"
]);

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0);
}

function normalizeImageSize(size?: string): ImageSize {
  return supportedImageSizes.has(size as ImageSize)
    ? (size as ImageSize)
    : DEFAULT_IMAGE_SIZE;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncateForSvg(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

export function buildImagePrompt(input: GenerateImageInput) {
  return [
    "为信息流短图文生成一张可发布封面图。",
    "画面要求：真实、干净、主体明确、信息密度适中，不要水印、二维码、联系方式或夸张导流文案。",
    `核心需求：${input.prompt}`,
    input.title ? `标题：${input.title}` : "",
    input.topic ? `选题：${input.topic}` : "",
    input.audience ? `目标受众：${input.audience}` : "",
    input.platform ? `发布平台：${input.platform}` : "",
    input.style ? `内容风格：${input.style}` : "",
    input.body ? `正文摘要：${input.body.slice(0, 180)}` : "",
    input.materials.length ? `参考素材：${input.materials.join("、")}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function resolveImageProviderConfig(
  config: ImageProviderConfig = {},
  env: Record<string, string | undefined> = process.env
): ImageProviderConfig {
  const apiKey = firstNonEmpty(
    config.apiKey,
    env.IMAGE_API_KEY,
    env.ARK_IMAGE_API_KEY,
    env.AI_API_KEY,
    env.ARK_API_KEY
  );
  const model = firstNonEmpty(
    config.model,
    env.IMAGE_MODEL,
    env.IMAGE_ENDPOINT_ID,
    env.ARK_IMAGE_MODEL,
    env.ARK_IMAGE_ENDPOINT_ID
  );
  const baseUrl = firstNonEmpty(
    config.baseUrl,
    env.IMAGE_BASE_URL,
    env.ARK_IMAGE_BASE_URL,
    env.AI_BASE_URL,
    env.ARK_BASE_URL
  );
  const user = firstNonEmpty(
    config.user,
    env.IMAGE_USER,
    env.ARK_IMAGE_USER,
    env.AI_USER,
    env.ARK_USER
  );

  return {
    apiKey,
    baseUrl: baseUrl ?? (apiKey && model ? DEFAULT_ARK_BASE_URL : undefined),
    model,
    user
  };
}

export function chooseImageProviderName(config: ImageProviderConfig) {
  return config.apiKey && config.baseUrl && config.model
    ? "openai-compatible"
    : "mock";
}

function createMockImageProvider(): ImageProvider {
  return {
    async generateImage(input: GenerateImageInput): Promise<GeneratedImage> {
      const prompt = buildImagePrompt(input);
      const title = escapeXml(
        truncateForSvg(input.title || input.topic || input.prompt || "短图文封面", 30)
      );
      const subtitle = escapeXml(
        truncateForSvg(input.audience || input.platform || "AI 生成封面", 28)
      );
      const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">`,
        `<defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f8f1e4"/><stop offset="0.55" stop-color="#f6ead9"/><stop offset="1" stop-color="#dfe9df"/></linearGradient></defs>`,
        `<rect width="1024" height="1024" fill="url(#bg)"/>`,
        `<rect x="92" y="120" width="840" height="784" rx="24" fill="#fffaf0" stroke="#d9cbb8" stroke-width="4"/>`,
        `<circle cx="770" cy="280" r="92" fill="#0e3b34" opacity="0.92"/>`,
        `<rect x="150" y="620" width="724" height="26" rx="13" fill="#d94b2b"/>`,
        `<rect x="150" y="680" width="560" height="18" rx="9" fill="#76998d"/>`,
        `<text x="150" y="270" fill="#d94b2b" font-family="Arial, sans-serif" font-size="34" font-weight="700">AI Generated Cover</text>`,
        `<text x="150" y="370" fill="#1f1c18" font-family="Arial, sans-serif" font-size="54" font-weight="700">${title}</text>`,
        `<text x="150" y="448" fill="#6f665a" font-family="Arial, sans-serif" font-size="32" font-weight="600">${subtitle}</text>`,
        `</svg>`
      ].join("");

      return {
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        prompt,
        provider: "mock"
      };
    }
  };
}

function createOpenAiCompatibleImageProvider(config: ImageProviderConfig): ImageProvider {
  const fallback = createMockImageProvider();

  return {
    async generateImage(input: GenerateImageInput): Promise<GeneratedImage> {
      if (!config.apiKey || !config.baseUrl || !config.model) {
        return fallback.generateImage(input);
      }

      const prompt = buildImagePrompt(input);

      try {
        const client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseUrl
        });
        const response = await client.images.generate({
          model: config.model,
          prompt,
          size: normalizeImageSize(input.size),
          n: 1,
          user: config.user
        });
        const image = response.data?.[0];
        const url = image?.url ?? (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : "");

        if (!url) {
          throw new ExternalImageProviderError("真实生图没有返回图片地址");
        }

        return {
          url,
          prompt: image?.revised_prompt ?? prompt,
          provider: "openai-compatible",
          model: config.model
        };
      } catch (error) {
        if (error instanceof ExternalImageProviderError) {
          throw error;
        }

        const message =
          error instanceof Error && error.message
            ? error.message
            : "外部生图模型请求失败";

        throw new ExternalImageProviderError(message);
      }
    }
  };
}

export function createImageProvider(config: ImageProviderConfig = {}) {
  const resolvedConfig = resolveImageProviderConfig(config);

  if (chooseImageProviderName(resolvedConfig) === "openai-compatible") {
    return createOpenAiCompatibleImageProvider(resolvedConfig);
  }

  return createMockImageProvider();
}
