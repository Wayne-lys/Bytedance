import { z } from "zod";
import { getRankingItems } from "@/features/ranking/ranking-service";
import { jsonError, jsonOk } from "@/lib/http";

const rankingQuerySchema = z.object({
  type: z.enum(["hot", "viral", "recommended"]).default("hot"),
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10)
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const input = rankingQuerySchema.safeParse({
    type: url.searchParams.get("type") ?? "hot",
    cursor: url.searchParams.get("cursor"),
    limit: url.searchParams.get("limit") ?? 10
  });

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "榜单参数无效", 422);
  }

  const result = await getRankingItems(input.data);

  return jsonOk(result);
}
