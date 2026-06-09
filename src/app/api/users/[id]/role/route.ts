import { z } from "zod";
import {
  normalizeRoleKey,
  resolveRoleOption,
  roleExists
} from "@/features/auth/role-service";
import { requirePermission } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

const roleSchema = z.object({
  role: z.string().min(1, "角色参数无效")
});

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const authorization = await requirePermission("manage_users");

  if (!authorization.ok) {
    return authorization.response;
  }

  if (authorization.user.id === params.id) {
    return jsonError("不能修改自己的角色。", 409);
  }

  const input = roleSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "角色参数无效", 422);
  }

  const role = normalizeRoleKey(input.data.role);

  if (!(await roleExists(role))) {
    return jsonError("角色不存在或已被删除。", 422);
  }

  const existing = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true }
  });

  if (!existing) {
    return jsonError("用户不存在", 404);
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { role },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      role: true,
      updatedAt: true
    }
  });
  const roleOption = await resolveRoleOption(user.role);

  return jsonOk({
    user: {
      ...user,
      role: roleOption.key,
      roleLabel: roleOption.label,
      permissions: roleOption.permissions
    }
  });
}
