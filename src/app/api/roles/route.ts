import { z } from "zod";
import { permissions } from "@/features/auth/permissions";
import {
  createCustomRole,
  getRoleOptions,
  RoleMutationError
} from "@/features/auth/role-service";
import { requirePermission } from "@/lib/authorization";
import { jsonError, jsonOk } from "@/lib/http";

const roleSchema = z.object({
  key: z.string().min(1, "请输入角色标识"),
  label: z.string().min(1, "请输入角色名称"),
  permissions: z.array(z.enum(permissions)).default([])
});

export async function GET() {
  const authorization = await requirePermission("manage_users");

  if (!authorization.ok) {
    return authorization.response;
  }

  return jsonOk({
    roles: await getRoleOptions({ includeCounts: true })
  });
}

export async function POST(request: Request) {
  const authorization = await requirePermission("manage_users");

  if (!authorization.ok) {
    return authorization.response;
  }

  const input = roleSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "角色参数无效", 422);
  }

  try {
    const role = await createCustomRole(input.data);

    return jsonOk({ role }, { status: 201 });
  } catch (error) {
    if (error instanceof RoleMutationError) {
      return jsonError(error.message, error.status);
    }

    throw error;
  }
}
