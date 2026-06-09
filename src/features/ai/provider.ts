import { createMockAiProvider } from "@/features/ai/mock-provider";
import { createOpenAiCompatibleProvider } from "@/features/ai/openai-compatible";

export type GenerateShortPostInput = {
  topic: string;
  audience: string;
  platform: string;
  style: string;
  prompt: string;
  materials: string[];
};

export type GeneratedShortPost = {
  title: string;
  body: string;
  tags: string[];
  coverSuggestion: string;
  publishAdvice: string;
  provider: "mock" | "openai-compatible";
};

export type AiProvider = {
  generateShortPost(input: GenerateShortPostInput): Promise<GeneratedShortPost>;
};

export type AiProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  user?: string;
};

const DEFAULT_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0);
}

export function resolveAiProviderConfig(
  config: AiProviderConfig = {},
  env: Record<string, string | undefined> = process.env
): AiProviderConfig {
  const apiKey = firstNonEmpty(config.apiKey, env.AI_API_KEY, env.ARK_API_KEY);
  const model = firstNonEmpty(
    config.model,
    env.AI_MODEL,
    env.ARK_MODEL,
    env.ARK_ENDPOINT_ID
  );
  const baseUrl = firstNonEmpty(config.baseUrl, env.AI_BASE_URL, env.ARK_BASE_URL);
  const user = firstNonEmpty(config.user, env.AI_USER, env.ARK_USER);

  return {
    apiKey,
    baseUrl: baseUrl ?? (apiKey && model ? DEFAULT_ARK_BASE_URL : undefined),
    model,
    user
  };
}

export function chooseAiProviderName(config: AiProviderConfig) {
  return config.apiKey && config.baseUrl && config.model
    ? "openai-compatible"
    : "mock";
}

export function createAiProvider(config: AiProviderConfig = {}) {
  const resolvedConfig = resolveAiProviderConfig(config);

  if (chooseAiProviderName(resolvedConfig) === "openai-compatible") {
    return createOpenAiCompatibleProvider(resolvedConfig);
  }

  return createMockAiProvider();
}
