import { z } from "zod";
import {
  createImageProvider,
  ExternalImageProviderError
} from "@/features/ai/image-provider";
import { jsonError, jsonOk } from "@/lib/http";

const imageSchema = z.object({
  prompt: z.string().min(1, "请输入生图提示词"),
  title: z.string().optional(),
  topic: z.string().optional(),
  audience: z.string().optional(),
  platform: z.string().optional(),
  style: z.string().optional(),
  body: z.string().optional(),
  materials: z.array(z.string()).default([]),
  size: z.string().optional()
});

export async function POST(request: Request) {
  const input = imageSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "生图参数无效", 422);
  }

  const provider = createImageProvider();

  try {
    const image = await provider.generateImage(input.data);

    return jsonOk({ image });
  } catch (error) {
    if (error instanceof ExternalImageProviderError) {
      return jsonError(`真实生图调用失败：${error.message}`, 502);
    }

    return jsonError("图片生成失败，请稍后重试", 500);
  }
}
