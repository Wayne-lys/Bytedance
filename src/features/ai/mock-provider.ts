import type {
  AiProvider,
  GenerateShortPostInput,
  GeneratedShortPost
} from "@/features/ai/provider";
import { buildPromptFallbackDraft } from "@/features/ai/prompt-fallback";

export function createMockAiProvider(): AiProvider {
  return {
    async generateShortPost(input: GenerateShortPostInput): Promise<GeneratedShortPost> {
      const generated = buildPromptFallbackDraft(input);

      return {
        ...generated,
        provider: "mock"
      };
    }
  };
}
