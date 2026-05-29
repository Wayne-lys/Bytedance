import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

async function ensureDemoUser() {
  return prisma.user.upsert({
    where: { email: "material-owner@example.com" },
    update: {},
    create: {
      email: "material-owner@example.com",
      name: "素材测试用户"
    }
  });
}

describe("materials api", () => {
  beforeEach(async () => {
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
    await ensureDemoUser();

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

  it("deletes a material by id", async () => {
    const user = await ensureDemoUser();
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
});
