import { z } from "zod";
import { ExternalAiProviderError } from "@/features/ai/openai-compatible";
import { createAiProvider } from "@/features/ai/provider";
import { jsonError, jsonOk } from "@/lib/http";

const generateSchema = z.object({
  topic: z.string().min(1, "请输入选题"),
  audience: z.string().min(1, "请输入目标受众"),
  platform: z.string().min(1, "请输入发布平台"),
  style: z.string().min(1, "请输入内容风格"),
  prompt: z.string().min(1, "请选择 Prompt"),
  materials: z.array(z.string()).default([])
});

export async function POST(request: Request) {
  const input = generateSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "生成参数无效", 422);
  }

  const provider = createAiProvider();
  try {
    const generated = await provider.generateShortPost(input.data);

    return jsonOk({ generated });
  } catch (error) {
    if (error instanceof ExternalAiProviderError) {
      return jsonError(`真实 AI 调用失败：${error.message}`, 502);
    }

    return jsonError("AI 生成失败，请稍后重试", 500);
  }
}
