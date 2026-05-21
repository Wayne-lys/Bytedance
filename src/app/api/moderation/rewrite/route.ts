import { z } from "zod";
import { rewriteCompliantContent } from "@/features/moderation/moderation-service";
import { jsonError, jsonOk } from "@/lib/http";

const rewriteSchema = z.object({
  content: z.string().min(1, "请输入要改写的内容")
});

export async function POST(request: Request) {
  const input = rewriteSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "改写参数无效", 422);
  }

  return jsonOk({
    content: rewriteCompliantContent(input.data.content)
  });
}
