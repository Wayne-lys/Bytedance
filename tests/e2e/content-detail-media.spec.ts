import { expect, test } from "@playwright/test";
import { prisma } from "../../src/lib/db";

async function seedPostWithMaterials() {
  const author = await prisma.user.upsert({
    where: { email: "detail-media@example.com" },
    update: { name: "多图详情测试用户" },
    create: {
      email: "detail-media@example.com",
      name: "多图详情测试用户"
    }
  });
  const title = `多图详情测试 ${Date.now()}`;
  const materials = await Promise.all(
    [
      ["多图素材 A.png", "/demo-materials/cafe-cover.svg"],
      ["多图素材 B.png", "/demo-materials/commute-kit.svg"],
      ["多图素材 C.png", "/demo-materials/nap-break.svg"]
    ].map(([name, url]) =>
      prisma.material.create({
        data: {
          ownerId: author.id,
          name,
          type: "image",
          url,
          compliance: "safe",
          referenceCount: 1
        }
      })
    )
  );

  return prisma.post.create({
    data: {
      authorId: author.id,
      title,
      coverUrl: materials[0].url,
      body: "详情页应该展示发布时选择的所有图片素材。",
      tags: "多图,素材",
      status: "published",
      publishedAt: new Date(),
      moderationResult: {
        create: {
          riskLevel: "safe",
          riskTypes: "none",
          matchedRules: "[]",
          reason: "未命中风险规则。",
          suggestedAction: "allow",
          provider: "test"
        }
      },
      qualityScore: {
        create: {
          originality: 90,
          structure: 88,
          informationDensity: 86,
          clarity: 90,
          interactionPotential: 84,
          platformFit: 89,
          total: 88
        }
      },
      materials: {
        create: materials.map((material, position) => ({
          materialId: material.id,
          position
        }))
      }
    }
  });
}

test("content detail shows every selected image material", async ({ page }) => {
  const post = await seedPostWithMaterials();

  await page.goto(`/content/${post.id}`);

  await expect(page.getByRole("heading", { name: post.title })).toBeVisible();
  await expect(page.getByRole("img", { name: "多图素材 A.png" })).toBeVisible();
  await expect(page.getByRole("img", { name: "多图素材 B.png" })).toBeVisible();
  await expect(page.getByRole("img", { name: "多图素材 C.png" })).toBeVisible();
});
