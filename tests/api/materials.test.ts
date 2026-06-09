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

async function ensureDemoUser(role = "admin") {
  return prisma.user.upsert({
    where: { email: "material-owner@example.com" },
    update: { role },
    create: {
      email: "material-owner@example.com",
      name: "素材测试用户",
      role
    }
  });
}

async function signIn(role = "admin") {
  const user = await ensureDemoUser(role);
  cookieStore.set(sessionCookieName(), user.id);
  return user;
}

describe("materials api", () => {
  beforeEach(async () => {
    cookieStore.clear();
    const user = await ensureDemoUser();

    await prisma.material.deleteMany({
      where: { ownerId: user.id }
    });
  });

  it("lists material records", async () => {
    const user = await ensureDemoUser();
    await prisma.material.create({
      data: {
        ownerId: user.id,
        name: "测试素材.png",
        type: "image",
        url: "/demo-materials/weekend-list.svg",
        compliance: "safe"
      }
    });

    const { GET } = await import("@/app/api/materials/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.materials.length).toBeGreaterThanOrEqual(1);
  });

  it("creates a material with compliance warning", async () => {
    await signIn("admin");

    const { POST } = await import("@/app/api/materials/route");
    const response = await POST(
      new Request("http://localhost/api/materials", {
        method: "POST",
        body: JSON.stringify({
          name: "扫码进群素材.png",
          type: "image/png",
          size: 120_000
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.material.compliance).toBe("warning");
    expect(payload.data.material.riskReason).toContain("导流");
  });

  it("rejects material uploads from creators without management permission", async () => {
    await signIn("creator");

    const { POST } = await import("@/app/api/materials/route");
    const response = await POST(
      new Request("http://localhost/api/materials", {
        method: "POST",
        body: JSON.stringify({
          name: "普通创作者素材.png",
          type: "image/png",
          size: 120_000
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("权限不足");
  });

  it("deletes a material by id", async () => {
    const user = await signIn("admin");
    const material = await prisma.material.create({
      data: {
        ownerId: user.id,
        name: "待删除素材.png",
        type: "image",
        url: "/demo-materials/weekend-list.svg",
        compliance: "safe"
      }
    });

    const { DELETE } = await import("@/app/api/materials/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/materials"), {
      params: { id: material.id }
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.deletedId).toBe(material.id);
    await expect(
      prisma.material.findUnique({ where: { id: material.id } })
    ).resolves.toBeNull();
  });

  it("rejects unauthenticated material deletion", async () => {
    const user = await ensureDemoUser();
    const material = await prisma.material.create({
      data: {
        ownerId: user.id,
        name: "未登录不可删素材.png",
        type: "image",
        url: "/demo-materials/weekend-list.svg",
        compliance: "safe"
      }
    });

    const { DELETE } = await import("@/app/api/materials/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/materials"), {
      params: { id: material.id }
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toContain("未登录");
    await expect(
      prisma.material.findUnique({ where: { id: material.id } })
    ).resolves.not.toBeNull();
  });

  it("bulk deletes selected materials for material managers", async () => {
    const user = await signIn("admin");
    const materials = await Promise.all(
      ["批量删除素材 A.png", "批量删除素材 B.png", "保留素材 C.png"].map(
        (name) =>
          prisma.material.create({
            data: {
              ownerId: user.id,
              name,
              type: "image",
              url: "/demo-materials/weekend-list.svg",
              compliance: "safe"
            }
          })
      )
    );

    const { DELETE } = await import("@/app/api/materials/route");
    const response = await DELETE(
      new Request("http://localhost/api/materials", {
        method: "DELETE",
        body: JSON.stringify({
          ids: [materials[0].id, materials[1].id]
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.deletedCount).toBe(2);
    await expect(
      prisma.material.findUnique({ where: { id: materials[0].id } })
    ).resolves.toBeNull();
    await expect(
      prisma.material.findUnique({ where: { id: materials[1].id } })
    ).resolves.toBeNull();
    await expect(
      prisma.material.findUnique({ where: { id: materials[2].id } })
    ).resolves.not.toBeNull();
  });

  it("rejects bulk material deletion from creators", async () => {
    const manager = await ensureDemoUser("admin");
    const material = await prisma.material.create({
      data: {
        ownerId: manager.id,
        name: "普通创作者不可批删.png",
        type: "image",
        url: "/demo-materials/weekend-list.svg",
        compliance: "safe"
      }
    });

    await signIn("creator");
    const { DELETE } = await import("@/app/api/materials/route");
    const response = await DELETE(
      new Request("http://localhost/api/materials", {
        method: "DELETE",
        body: JSON.stringify({
          ids: [material.id]
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("权限不足");
    await expect(
      prisma.material.findUnique({ where: { id: material.id } })
    ).resolves.not.toBeNull();
  });
});
