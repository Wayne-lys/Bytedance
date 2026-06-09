import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { sessionCookieName } from "@/lib/auth";

const cookieStore = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: () => ({
    set: (name: string, value: string) => cookieStore.set(name, value),
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value ? { value } : undefined;
    },
    delete: (name: string) => cookieStore.delete(name)
  })
}));

async function createUser(email: string, role: string) {
  return prisma.user.create({
    data: {
      email,
      name: email.split("@")[0],
      role
    }
  });
}

async function signIn(email: string, role: string) {
  const user = await createUser(email, role);
  cookieStore.set(sessionCookieName(), user.id);
  return user;
}

async function deleteCustomRolesIfPresent() {
  try {
    await prisma.$executeRawUnsafe(
      "DELETE FROM RoleDefinition WHERE key LIKE 'permissions_%'"
    );
  } catch {
    // Older schemas do not have the role table yet; the tests below cover that gap.
  }
}

describe("users permission api", () => {
  beforeEach(async () => {
    cookieStore.clear();
    await deleteCustomRolesIfPresent();
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "@permissions.test"
        }
      }
    });
  });

  it("lists users for admins without exposing password hashes", async () => {
    await signIn("admin@permissions.test", "admin");
    await createUser("creator@permissions.test", "creator");

    const { GET } = await import("@/app/api/users/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "creator@permissions.test",
          role: "creator",
          roleLabel: "创作者"
        })
      ])
    );
    expect(payload.data.users[0].passwordHash).toBeUndefined();
  });

  it("rejects user list requests from creators", async () => {
    await signIn("viewer@permissions.test", "creator");

    const { GET } = await import("@/app/api/users/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("权限不足");
  });

  it("updates another user's role for admins", async () => {
    await signIn("admin@permissions.test", "admin");
    const target = await createUser("target@permissions.test", "creator");

    const { PATCH } = await import("@/app/api/users/[id]/role/route");
    const response = await PATCH(
      new Request(`http://localhost/api/users/${target.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: "reviewer" })
      }),
      { params: { id: target.id } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.user.role).toBe("reviewer");
    await expect(
      prisma.user.findUnique({ where: { id: target.id } })
    ).resolves.toMatchObject({ role: "reviewer" });
  });

  it("rejects invalid roles", async () => {
    await signIn("admin@permissions.test", "admin");
    const target = await createUser("target@permissions.test", "creator");

    const { PATCH } = await import("@/app/api/users/[id]/role/route");
    const response = await PATCH(
      new Request(`http://localhost/api/users/${target.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: "owner" })
      }),
      { params: { id: target.id } }
    );

    expect(response.status).toBe(422);
  });

  it("creates a custom role and assigns it to a user", async () => {
    await signIn("admin@permissions.test", "admin");
    const target = await createUser("target@permissions.test", "creator");
    const roleKey = "permissions_rules_assistant";

    const { POST } = await import("@/app/api/roles/route");
    const roleResponse = await POST(
      new Request("http://localhost/api/roles", {
        method: "POST",
        body: JSON.stringify({
          key: roleKey,
          label: "规则助理",
          permissions: ["manage_rules"]
        })
      })
    );
    const rolePayload = await roleResponse.json();

    expect(roleResponse.status).toBe(201);
    expect(rolePayload.data.role).toMatchObject({
      key: roleKey,
      label: "规则助理",
      permissions: ["manage_rules"],
      system: false
    });

    const { PATCH } = await import("@/app/api/users/[id]/role/route");
    const response = await PATCH(
      new Request(`http://localhost/api/users/${target.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: roleKey })
      }),
      { params: { id: target.id } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.user).toMatchObject({
      role: roleKey,
      roleLabel: "规则助理"
    });
    await expect(
      prisma.user.findUnique({ where: { id: target.id } })
    ).resolves.toMatchObject({ role: roleKey });
  });

  it("prevents deleting custom roles that are still assigned", async () => {
    await signIn("admin@permissions.test", "admin");
    const target = await createUser("target@permissions.test", "creator");
    const roleKey = "permissions_material_lead";

    const { POST } = await import("@/app/api/roles/route");
    await POST(
      new Request("http://localhost/api/roles", {
        method: "POST",
        body: JSON.stringify({
          key: roleKey,
          label: "素材主管",
          permissions: ["manage_materials"]
        })
      })
    );

    const { PATCH } = await import("@/app/api/users/[id]/role/route");
    await PATCH(
      new Request(`http://localhost/api/users/${target.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: roleKey })
      }),
      { params: { id: target.id } }
    );

    const { DELETE } = await import("@/app/api/roles/[key]/route");
    const blockedResponse = await DELETE(
      new Request(`http://localhost/api/roles/${roleKey}`, {
        method: "DELETE"
      }),
      { params: { key: roleKey } }
    );
    const blockedPayload = await blockedResponse.json();

    expect(blockedResponse.status).toBe(409);
    expect(blockedPayload.error).toContain("仍有用户正在使用");

    await PATCH(
      new Request(`http://localhost/api/users/${target.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: "creator" })
      }),
      { params: { id: target.id } }
    );

    const deletedResponse = await DELETE(
      new Request(`http://localhost/api/roles/${roleKey}`, {
        method: "DELETE"
      }),
      { params: { key: roleKey } }
    );
    const deletedPayload = await deletedResponse.json();

    expect(deletedResponse.status).toBe(200);
    expect(deletedPayload.data.role.key).toBe(roleKey);
  });

  it("deletes another user for admins", async () => {
    await signIn("admin@permissions.test", "admin");
    const target = await createUser("delete-target@permissions.test", "creator");

    const { DELETE } = await import("@/app/api/users/[id]/route");
    const response = await DELETE(
      new Request(`http://localhost/api/users/${target.id}`, {
        method: "DELETE"
      }),
      { params: { id: target.id } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.user).toMatchObject({
      id: target.id,
      email: "delete-target@permissions.test"
    });
    await expect(
      prisma.user.findUnique({ where: { id: target.id } })
    ).resolves.toBeNull();
  });

  it("does not allow admins to delete their own account", async () => {
    const admin = await signIn("admin@permissions.test", "admin");

    const { DELETE } = await import("@/app/api/users/[id]/route");
    const response = await DELETE(
      new Request(`http://localhost/api/users/${admin.id}`, {
        method: "DELETE"
      }),
      { params: { id: admin.id } }
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain("不能删除自己的账号");
    await expect(
      prisma.user.findUnique({ where: { id: admin.id } })
    ).resolves.toMatchObject({ id: admin.id });
  });

  it("does not allow admins to change their own role", async () => {
    const admin = await signIn("admin@permissions.test", "admin");

    const { PATCH } = await import("@/app/api/users/[id]/role/route");
    const response = await PATCH(
      new Request(`http://localhost/api/users/${admin.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: "creator" })
      }),
      { params: { id: admin.id } }
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain("不能修改自己的角色");
  });
});
