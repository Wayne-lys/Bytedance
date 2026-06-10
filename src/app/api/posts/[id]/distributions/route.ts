import { z } from "zod";
import {
  DistributionBlockedError,
  simulatePostDistribution
} from "@/features/posts/post-service";
import { jsonError, jsonOk } from "@/lib/http";

const distributionSchema = z.object({
  platform: z.literal("douyin").default("douyin")
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const input = distributionSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError("暂只支持抖音图文模拟分发", 422);
  }

  try {
    const distribution = await simulatePostDistribution(
      params.id,
      input.data.platform
    );

    if (!distribution) {
      return jsonError("内容不存在", 404);
    }

    return jsonOk({ distribution });
  } catch (error) {
    if (error instanceof DistributionBlockedError) {
      return jsonError(error.message, 409);
    }

    return jsonError(error instanceof Error ? error.message : "分发失败", 500);
  }
}
