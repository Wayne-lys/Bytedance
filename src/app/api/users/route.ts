import { getRoleOptions, resolveRoleOption } from "@/features/auth/role-service";
import { requirePermission } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/http";

export async function GET() {
  const authorization = await requirePermission("manage_users");

  if (!authorization.ok) {
    return authorization.response;
  }

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const roles = await getRoleOptions();
  const roleByKey = new Map(roles.map((role) => [role.key, role]));

  return jsonOk({
    users: await Promise.all(
      users.map(async (user) => {
        const role = roleByKey.get(user.role) ?? (await resolveRoleOption(user.role));

        return {
          ...user,
          role: role.key,
          roleLabel: role.label,
          permissions: role.permissions
        };
      })
    )
  });
}
