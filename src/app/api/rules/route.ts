import { auditRuleSchema } from "@/features/moderation/audit-rule-schema";
import { requirePermission } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST(request: Request) {
  const authorization = await requirePermission("manage_rules");

  if (!authorization.ok) {
    return authorization.response;
  }

  const input = auditRuleSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "规则参数无效", 422);
  }

  const rule = await prisma.auditRule.create({
    data: input.data
  });

  return jsonOk({ rule });
}
