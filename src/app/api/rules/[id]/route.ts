import { auditRuleSchema } from "@/features/moderation/audit-rule-schema";
import { requirePermission } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const authorization = await requirePermission("manage_rules");

  if (!authorization.ok) {
    return authorization.response;
  }

  const input = auditRuleSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "规则参数无效", 422);
  }

  const existing = await prisma.auditRule.findUnique({
    where: { id: params.id }
  });

  if (!existing) {
    return jsonError("规则不存在", 404);
  }

  const rule = await prisma.auditRule.update({
    where: { id: params.id },
    data: input.data
  });

  return jsonOk({ rule });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authorization = await requirePermission("manage_rules");

  if (!authorization.ok) {
    return authorization.response;
  }

  const existing = await prisma.auditRule.findUnique({
    where: { id: params.id }
  });

  if (!existing) {
    return jsonError("规则不存在", 404);
  }

  await prisma.auditRule.delete({
    where: { id: params.id }
  });

  return jsonOk({ deletedId: params.id });
}
