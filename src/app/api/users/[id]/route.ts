import { requirePermission } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authorization = await requirePermission("manage_users");

  if (!authorization.ok) {
    return authorization.response;
  }

  if (authorization.user.id === params.id) {
    return jsonError("不能删除自己的账号。", 409);
  }

  const existing = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      role: true
    }
  });

  if (!existing) {
    return jsonError("用户不存在", 404);
  }

  await prisma.user.delete({
    where: { id: params.id }
  });

  return jsonOk({ user: existing });
}
