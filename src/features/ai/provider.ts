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
};

export function chooseAiProviderName(config: AiProviderConfig) {
  return config.apiKey && config.baseUrl && config.model
    ? "openai-compatible"
    : "mock";
}

export function createAiProvider(config: AiProviderConfig = {}) {
  if (
    chooseAiProviderName({
      apiKey: config.apiKey ?? process.env.AI_API_KEY,
      baseUrl: config.baseUrl ?? process.env.AI_BASE_URL,
      model: config.model ?? process.env.AI_MODEL
    }) === "openai-compatible"
  ) {
    return createOpenAiCompatibleProvider({
      apiKey: config.apiKey ?? process.env.AI_API_KEY,
      baseUrl: config.baseUrl ?? process.env.AI_BASE_URL,
      model: config.model ?? process.env.AI_MODEL
    });
  }

  return createMockAiProvider();
}
