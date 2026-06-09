import { z } from "zod";
import { likePost } from "@/features/posts/post-service";
import { jsonError, jsonOk } from "@/lib/http";

const feedbackSchema = z.object({
  action: z.enum(["like"])
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const input = feedbackSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "反馈操作无效", 422);
  }

  const metric = await likePost(params.id);

  if (!metric) {
    return jsonError("内容不存在或不可反馈", 404);
  }

  return jsonOk({ metric });
}
