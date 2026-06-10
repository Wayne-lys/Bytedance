import OpenAI from "openai";
import { createMockAiProvider } from "@/features/ai/mock-provider";
import type {
  AiProvider,
  AiProviderConfig,
  GenerateShortPostInput,
  GeneratedShortPost
} from "@/features/ai/provider";
import { interpolatePromptTemplate } from "@/features/ai/prompt-fallback";

export class ExternalAiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalAiProviderError";
  }
}

function buildPrompt(input: GenerateShortPostInput) {
  const expandedPrompt = interpolatePromptTemplate(input);

  return [
    "你是内容创作者的 AI 助手，请生成一篇中文短图文草稿。",
    "必须严格遵循当前 Prompt 模板；不同模板应产出显著不同的标题、正文结构和表达方式。",
    `选题：${input.topic}`,
    `目标受众：${input.audience}`,
    `发布平台：${input.platform}`,
    `风格：${input.style}`,
    `Prompt 模板原文：${input.prompt}`,
    `已展开 Prompt：${expandedPrompt}`,
    `素材：${input.materials.join("、") || "无"}`,
    "返回 JSON，字段包括 title、body、tags、coverSuggestion、publishAdvice。"
  ].join("\n");
}

function normalizeJsonContent(content: string) {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function safeParseGeneratedContent(content: string): Omit<GeneratedShortPost, "provider"> {
  const parsed = JSON.parse(normalizeJsonContent(content)) as Omit<
    GeneratedShortPost,
    "provider"
  >;

  return {
    title: String(parsed.title),
    body: String(parsed.body),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    coverSuggestion: String(parsed.coverSuggestion),
    publishAdvice: String(parsed.publishAdvice)
  };
}

export function createOpenAiCompatibleProvider(config: AiProviderConfig): AiProvider {
  const fallback = createMockAiProvider();

  return {
    async generateShortPost(input: GenerateShortPostInput): Promise<GeneratedShortPost> {
      if (!config.apiKey || !config.baseUrl || !config.model) {
        return fallback.generateShortPost(input);
      }

      try {
        const client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseUrl
        });
        const completion = await client.chat.completions.create({
          model: config.model,
          messages: [
            {
              role: "system",
              content: "你只输出可解析 JSON，不输出 Markdown。"
            },
            {
              role: "user",
              content: buildPrompt(input)
            }
          ],
          temperature: 0.7,
          user: config.user
        });
        const content = completion.choices[0]?.message.content;

        if (!content) {
          throw new ExternalAiProviderError("真实 AI 没有返回内容");
        }

        return {
          ...safeParseGeneratedContent(content),
          provider: "openai-compatible"
        };
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "外部模型请求失败";

        throw new ExternalAiProviderError(message);
      }
    }
  };
}
