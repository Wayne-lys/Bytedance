import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import {
  permissionLabels,
  type Permission
} from "@/features/auth/permissions";
import {
  hasPermissionAsync,
  resolveRoleOption
} from "@/features/auth/role-service";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      response: jsonError("未登录，请先登录后再操作。", 401)
    };
  }

  if (!(await hasPermissionAsync(user.role, permission))) {
    return {
      ok: false as const,
      response: jsonError(`权限不足：需要${permissionLabels[permission]}权限。`, 403)
    };
  }

  return {
    ok: true as const,
    user
  };
}

export async function serializeUserPermissions(user: Pick<CurrentUser, "role">) {
  const role = await resolveRoleOption(user.role);

  return {
    role: role.key,
    roleLabel: role.label,
    permissions: role.permissions,
    permissionLabels: role.permissions.map((permission) => permissionLabels[permission])
  };
}
