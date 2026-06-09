import { prisma } from "@/lib/db";
import {
  getBuiltinPermissionsForRole,
  isBuiltinRole,
  permissionLabels,
  permissions,
  roleLabels,
  userRoles,
  type Permission
} from "@/features/auth/permissions";

export type RoleOption = {
  key: string;
  label: string;
  permissions: Permission[];
  system: boolean;
  userCount?: number;
};

export class RoleMutationError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export const roleKeyPattern = /^[a-z][a-z0-9_]{1,39}$/;

const permissionSet = new Set<string>(permissions);

function normalizePermissions(input: string[]) {
  const selected = new Set(input.filter((permission) => permissionSet.has(permission)));

  return permissions.filter((permission) => selected.has(permission));
}

function parsePermissions(value: string) {
  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return normalizePermissions(parsed);
    }
  } catch {
    return normalizePermissions(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    );
  }

  return [];
}

function serializePermissions(input: Permission[]) {
  return JSON.stringify(normalizePermissions(input));
}

function builtinRoleOption(key: (typeof userRoles)[number], userCount?: number) {
  return {
    key,
    label: roleLabels[key],
    permissions: getBuiltinPermissionsForRole(key) ?? [],
    system: true,
    userCount
  } satisfies RoleOption;
}

function customRoleOption(
  role: {
    key: string;
    label: string;
    permissions: string;
    system: boolean;
  },
  userCount?: number
) {
  return {
    key: role.key,
    label: role.label,
    permissions: parsePermissions(role.permissions),
    system: role.system,
    userCount
  } satisfies RoleOption;
}

async function getUserCountByRole() {
  const users = await prisma.user.findMany({
    select: { role: true }
  });
  const countByRole = new Map<string, number>();

  users.forEach((user) => {
    countByRole.set(user.role, (countByRole.get(user.role) ?? 0) + 1);
  });

  return countByRole;
}

export function normalizeRoleKey(key: string) {
  return key.trim().toLowerCase();
}

export async function getRoleOptions({
  includeCounts = false
}: {
  includeCounts?: boolean;
} = {}) {
  const [customRoles, countByRole] = await Promise.all([
    prisma.roleDefinition.findMany({
      orderBy: [{ system: "desc" }, { createdAt: "asc" }],
      select: {
        key: true,
        label: true,
        permissions: true,
        system: true
      }
    }),
    includeCounts ? getUserCountByRole() : Promise.resolve(new Map<string, number>())
  ]);

  return [
    ...userRoles.map((role) => builtinRoleOption(role, countByRole.get(role) ?? 0)),
    ...customRoles.map((role) =>
      customRoleOption(role, countByRole.get(role.key) ?? 0)
    )
  ];
}

export async function getRoleOption(role?: string | null) {
  const key = role ? normalizeRoleKey(role) : "creator";

  if (isBuiltinRole(key)) {
    return builtinRoleOption(key);
  }

  const customRole = await prisma.roleDefinition.findUnique({
    where: { key },
    select: {
      key: true,
      label: true,
      permissions: true,
      system: true
    }
  });

  return customRole ? customRoleOption(customRole) : null;
}

export async function resolveRoleOption(role?: string | null) {
  return (await getRoleOption(role)) ?? builtinRoleOption("creator");
}

export async function roleExists(role: string) {
  return Boolean(await getRoleOption(role));
}

export async function getPermissionsForRoleAsync(role?: string | null) {
  return (await resolveRoleOption(role)).permissions;
}

export async function hasPermissionAsync(
  role: string | null | undefined,
  permission: Permission
) {
  return (await getPermissionsForRoleAsync(role)).includes(permission);
}

export async function createCustomRole(input: {
  key: string;
  label: string;
  permissions: Permission[];
}) {
  const key = normalizeRoleKey(input.key);
  const label = input.label.trim();

  if (!roleKeyPattern.test(key)) {
    throw new RoleMutationError("角色标识需以小写字母开头，仅支持小写字母、数字和下划线。", 422);
  }

  if (!label) {
    throw new RoleMutationError("请输入角色名称。", 422);
  }

  if (isBuiltinRole(key)) {
    throw new RoleMutationError("系统角色已存在，不能重复创建。", 409);
  }

  const existing = await prisma.roleDefinition.findUnique({
    where: { key },
    select: { id: true }
  });

  if (existing) {
    throw new RoleMutationError("角色标识已存在。", 409);
  }

  const role = await prisma.roleDefinition.create({
    data: {
      key,
      label,
      permissions: serializePermissions(input.permissions),
      system: false
    },
    select: {
      key: true,
      label: true,
      permissions: true,
      system: true
    }
  });

  return customRoleOption(role, 0);
}

export async function deleteCustomRole(keyInput: string) {
  const key = normalizeRoleKey(keyInput);

  if (isBuiltinRole(key)) {
    throw new RoleMutationError("系统角色不能删除。", 409);
  }

  const role = await prisma.roleDefinition.findUnique({
    where: { key },
    select: {
      key: true,
      label: true,
      permissions: true,
      system: true
    }
  });

  if (!role) {
    throw new RoleMutationError("角色不存在。", 404);
  }

  if (role.system) {
    throw new RoleMutationError("系统角色不能删除。", 409);
  }

  const userCount = await prisma.user.count({
    where: { role: key }
  });

  if (userCount > 0) {
    throw new RoleMutationError("仍有用户正在使用该角色，请先调整用户角色。", 409);
  }

  await prisma.roleDefinition.delete({
    where: { key }
  });

  return customRoleOption(role, 0);
}

export { permissionLabels };
