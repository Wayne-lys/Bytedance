import { expect, test } from "@playwright/test";
import { prisma } from "../../src/lib/db";

async function cleanupReviewLayoutSamples() {
  await prisma.post.deleteMany({
    where: {
      title: {
        startsWith: "审核布局样本"
      }
    }
  });
}

async function seedReviewLayoutSamples() {
  await cleanupReviewLayoutSamples();

  const user = await prisma.user.upsert({
    where: { email: "review-layout@example.com" },
    update: {},
    create: {
      email: "review-layout@example.com",
      name: "审核布局测试用户"
    }
  });

  await Promise.all(
    Array.from({ length: 24 }, (_, index) =>
      prisma.post.create({
        data: {
          authorId: user.id,
          title: `审核布局样本 ${String(index + 1).padStart(2, "0")}`,
          body: "用于验证审核与质量页面右侧长列表不会撑高整页。",
          tags: "审核,布局,测试",
          status: "published",
          publishedAt: new Date(),
          moderationResult: {
            create: {
              riskLevel: "safe",
              riskTypes: "none",
              matchedRules: "[]",
              reason: "未命中本地高危规则。",
              suggestedAction: "allow",
              provider: "local"
            }
          },
          qualityScore: {
            create: {
              originality: 82,
              structure: 84,
              informationDensity: 78,
              clarity: 86,
              interactionPotential: 80,
              platformFit: 85,
              total: 82
            }
          }
        }
      })
    )
  );
}

test("review desk keeps the long moderation list inside an internal scroll rail", async ({
  page
}) => {
  try {
    await seedReviewLayoutSamples();
    await page.setViewportSize({ width: 2048, height: 1152 });
    await page.goto("/login");
    await page.getByLabel("邮箱").fill("creator@example.com");
    await page.getByLabel("密码").fill("Demo123456");
    await page.getByRole("button", { name: "登录" }).click();
    await expect(page.getByRole("heading", { name: "AI 创作者工作台" })).toBeVisible();

    await page
      .getByRole("navigation", { name: "工作区导航" })
      .getByRole("link", { name: "审核与质量" })
      .click();
    await page.waitForLoadState("networkidle");

    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight
    );

    expect(pageOverflow).toBeLessThanOrEqual(120);
  } finally {
    await cleanupReviewLayoutSamples();
  }
});
