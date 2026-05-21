import OpenAI from "openai";
import { createMockAiProvider } from "@/features/ai/mock-provider";
import type {
  AiProvider,
  AiProviderConfig,
  GenerateShortPostInput,
  GeneratedShortPost
} from "@/features/ai/provider";

function buildPrompt(input: GenerateShortPostInput) {
  return [
    "你是内容创作者的 AI 助手，请生成一篇中文短图文草稿。",
    `选题：${input.topic}`,
    `目标受众：${input.audience}`,
    `发布平台：${input.platform}`,
    `风格：${input.style}`,
    `Prompt 模板：${input.prompt}`,
    `素材：${input.materials.join("、") || "无"}`,
    "返回 JSON，字段包括 title、body、tags、coverSuggestion、publishAdvice。"
  ].join("\n");
}

function safeParseGeneratedContent(content: string): Omit<GeneratedShortPost, "provider"> {
  const parsed = JSON.parse(content) as Omit<GeneratedShortPost, "provider">;

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
          temperature: 0.7
        });
        const content = completion.choices[0]?.message.content;

        if (!content) {
          return fallback.generateShortPost(input);
        }

        return {
          ...safeParseGeneratedContent(content),
          provider: "openai-compatible"
        };
      } catch {
        return fallback.generateShortPost(input);
      }
    }
  };
}
