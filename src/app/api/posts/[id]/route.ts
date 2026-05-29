import { z } from "zod";
import { getPostDetail, updatePost } from "@/features/posts/post-service";
import { jsonError, jsonOk } from "@/lib/http";

const updateSchema = z.object({
  title: z.string().min(1, "请输入标题"),
  body: z.string().min(1, "请输入正文"),
  tags: z.union([z.array(z.string()), z.string()]).default([]),
  coverUrl: z.string().nullable().optional(),
  platform: z.string().default("头条")
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const post = await getPostDetail(params.id);

  if (!post) {
    return jsonError("内容不存在", 404);
  }

  return jsonOk({ post });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const input = updateSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "更新参数无效", 422);
  }

  const post = await updatePost(params.id, input.data);

  if (!post) {
    return jsonError("内容不存在", 404);
  }

  return jsonOk({ post });
}
