import { z } from "zod";
import { reviewAndScoreContent } from "@/features/moderation/moderation-service";
import { jsonError, jsonOk } from "@/lib/http";

const reviewSchema = z.object({
  title: z.string().default(""),
  body: z.string().default(""),
  tags: z.array(z.string()).default([]),
  platform: z.string().default("头条")
});

export async function POST(request: Request) {
  const input = reviewSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "审核参数无效", 422);
  }

  return jsonOk(reviewAndScoreContent(input.data));
}
