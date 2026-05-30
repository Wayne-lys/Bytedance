import type {
  AiProvider,
  GenerateShortPostInput,
  GeneratedShortPost
} from "@/features/ai/provider";
import { buildGeneratedTags } from "@/features/ai/generated-tags";

export function createMockAiProvider(): AiProvider {
  return {
    async generateShortPost(input: GenerateShortPostInput): Promise<GeneratedShortPost> {
      const materialText =
        input.materials.length > 0
          ? `结合${input.materials.join("、")}等素材，`
          : "";

      return {
        title: `${input.topic}：给${input.audience}的 3 个具体建议`,
        body: `${materialText}这篇内容面向${input.audience}，适合发布在${input.platform}。开头先给出一个真实场景，再用三个短段落说明方法、理由和可执行动作。整体语气保持${input.style}，避免夸大承诺，并在结尾留下一个容易互动的问题。`,
        tags: buildGeneratedTags(input.platform, input.topic),
        coverSuggestion: input.materials[0] ?? "使用明亮、干净、主体明确的生活方式封面图。",
        publishAdvice: "建议先通过合规审核，再选择午休或晚间高活跃时段发布。",
        provider: "mock"
      };
    }
  };
}
