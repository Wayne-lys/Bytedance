import { z } from "zod";
import {
  listPosts,
  PublishBlockedError,
  PublishReviewRequiredError,
  publishBlockPayload,
  publishPost
} from "@/features/posts/post-service";
import { jsonError, jsonOk } from "@/lib/http";

const postSchema = z.object({
  draftId: z.string().optional(),
  title: z.string().min(1, "请输入标题"),
  body: z.string().min(1, "请输入正文"),
  tags: z.union([z.array(z.string()), z.string()]).default([]),
  coverUrl: z.string().nullable().optional(),
  materialIds: z.array(z.string()).default([]),
  platform: z.string().default("头条"),
  reviewToken: z.string().optional()
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const posts = await listPosts(status);

  return jsonOk({ posts });
}

export async function POST(request: Request) {
  const input = postSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "发布参数无效", 422);
  }

  try {
    const post = await publishPost(input.data);

    return jsonOk({ post });
  } catch (error) {
    if (error instanceof PublishBlockedError) {
      return Response.json(
        {
          ok: false,
          error: error.message,
          data: publishBlockPayload(error)
        },
        { status: 409 }
      );
    }

    if (error instanceof PublishReviewRequiredError) {
      return jsonError(error.message, 428);
    }

    return jsonError(error instanceof Error ? error.message : "发布失败", 500);
  }
}
