import { z } from "zod";
import { changePostDistributionStatus } from "@/features/posts/post-service";
import { jsonError, jsonOk } from "@/lib/http";

const statusActionSchema = z.object({
  action: z.enum(["offline", "withdraw", "rollback"])
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const input = statusActionSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "内容治理操作无效", 422);
  }

  const post = await changePostDistributionStatus(params.id, input.data.action);

  if (!post) {
    return jsonError("内容不存在", 404);
  }

  return jsonOk({ post });
}
