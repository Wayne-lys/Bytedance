import { UserRoleManager } from "@/components/user-role-manager";
import {
  getRoleOptions,
  hasPermissionAsync
} from "@/features/auth/role-service";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function PermissionsPage() {
  const currentUser = await getCurrentUser();
  const canManageUsers = await hasPermissionAsync(currentUser?.role, "manage_users");

  if (!currentUser || !canManageUsers) {
    return (
      <section className="studio-panel p-6">
        <p className="text-xs font-semibold text-accent">Access Control</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">用户权限管理</h2>
        <div className="mt-5 rounded-md border border-line bg-panel-muted px-4 py-3 text-sm leading-6 text-muted">
          当前账号没有用户权限管理权限。请使用管理员账号登录后再操作。
        </div>
      </section>
    );
  }

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true
      }
    }),
    getRoleOptions({ includeCounts: true })
  ]);
  const roleByKey = new Map(roles.map((role) => [role.key, role]));

  return (
    <section className="space-y-5">
      <div className="studio-panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-accent">Access Control</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">用户权限管理</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              给团队成员分配创作者、审核员、素材运营或管理员角色；角色变更会立即影响审核、素材和规则管理入口。
            </p>
          </div>
          <div className="rounded-md border border-line bg-panel-muted px-4 py-3 text-sm leading-6 text-muted">
            当前账号：{currentUser.name}
          </div>
        </div>
      </div>

      <section className="studio-panel p-6">
        <UserRoleManager
          currentUserId={currentUser.id}
          users={users.map((user) => ({
            ...user,
            role: roleByKey.get(user.role)?.key ?? "creator",
            roleLabel: roleByKey.get(user.role)?.label ?? "创作者",
            permissions: roleByKey.get(user.role)?.permissions ?? [],
            createdAt: user.createdAt.toISOString()
          }))}
          roles={roles}
        />
      </section>
    </section>
  );
}
