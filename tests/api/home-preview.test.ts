import { afterEach, describe, expect, it } from "vitest";
import { getHomePreviewMaterial } from "@/features/materials/home-preview-service";
import { prisma } from "@/lib/db";

const testEmail = "home-preview-owner@example.com";
const testMaterialName = "首页真实素材测试图";

async function ensureOwner() {
  return prisma.user.upsert({
    where: { email: testEmail },
    update: { name: "首页素材测试用户" },
    create: {
      email: testEmail,
      name: "首页素材测试用户"
    }
  });
}

async function cleanup() {
  await prisma.material.deleteMany({
    where: { name: testMaterialName }
  });
}

describe("home preview material", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("uses a real safe image from the material library instead of a hardcoded demo cover", async () => {
    const owner = await ensureOwner();
    await cleanup();

    const material = await prisma.material.create({
      data: {
        ownerId: owner.id,
        name: testMaterialName,
        type: "image",
        url: "/demo-materials/weekend-list.svg",
        compliance: "safe",
        referenceCount: 0
      }
    });

    const preview = await getHomePreviewMaterial();

    expect(preview).toMatchObject({
      id: material.id,
      name: testMaterialName,
      url: "/demo-materials/weekend-list.svg",
      compliance: "safe"
    });
  });
});
