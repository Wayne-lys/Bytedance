export const userRoles = ["creator", "reviewer", "operator", "admin"] as const;

export type BuiltinUserRole = (typeof userRoles)[number];
export type UserRole = string;

export const permissions = [
  "review_content",
  "manage_materials",
  "manage_rules",
  "manage_users"
] as const;

export type Permission = (typeof permissions)[number];

export const roleLabels: Record<BuiltinUserRole, string> = {
  creator: "创作者",
  reviewer: "审核员",
  operator: "素材运营",
  admin: "管理员"
};

export const permissionLabels: Record<Permission, string> = {
  review_content: "内容审核",
  manage_materials: "素材管理",
  manage_rules: "规则管理",
  manage_users: "用户权限管理"
};

const rolePermissions: Record<BuiltinUserRole, Permission[]> = {
  creator: [],
  reviewer: ["review_content"],
  operator: ["manage_materials"],
  admin: ["review_content", "manage_materials", "manage_rules", "manage_users"]
};

export function isBuiltinRole(role?: string | null): role is BuiltinUserRole {
  return userRoles.includes(role as BuiltinUserRole);
}

export function normalizeRole(role?: string | null): BuiltinUserRole {
  return isBuiltinRole(role) ? role : "creator";
}

export function getBuiltinPermissionsForRole(role?: string | null) {
  return isBuiltinRole(role) ? rolePermissions[role] : null;
}

export function getPermissionsForRole(role?: string | null) {
  return getBuiltinPermissionsForRole(role) ?? rolePermissions.creator;
}

export function hasPermission(role: string | null | undefined, permission: Permission) {
  return getPermissionsForRole(role).includes(permission);
}
