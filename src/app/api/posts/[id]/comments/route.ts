import { z } from "zod";
import { createPostComment } from "@/features/posts/post-service";
import { jsonError, jsonOk } from "@/lib/http";

const commentSchema = z.object({
  body: z.string().trim().min(2, "评论至少需要 2 个字").max(300, "评论不能超过 300 个字")
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const input = commentSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "评论内容无效", 422);
  }

  const result = await createPostComment(params.id, input.data.body);

  if (!result) {
    return jsonError("内容不存在或不可评论", 404);
  }

  return jsonOk(result);
}
