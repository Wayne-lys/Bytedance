import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { prisma } from "../../src/lib/db";

async function ensureAdminUser() {
  await prisma.user.upsert({
    where: { email: "creator@example.com" },
    update: {
      passwordHash: await bcrypt.hash("Demo123456", 10),
      name: "训练营创作者",
      role: "admin"
    },
    create: {
      email: "creator@example.com",
      passwordHash: await bcrypt.hash("Demo123456", 10),
      name: "训练营创作者",
      role: "admin"
    }
  });
}

async function seedRankingPost() {
  const user = await prisma.user.upsert({
    where: { email: "ranking-return@example.com" },
    update: {},
    create: {
      email: "ranking-return@example.com",
      name: "榜单返回测试用户"
    }
  });
  const title = `榜单返回测试 ${Date.now()}`;

  const post = await prisma.post.create({
    data: {
      authorId: user.id,
      title,
      body: "用于验证从热点榜单进入详情页后，返回按钮回到热点榜单。",
      tags: "榜单,返回",
      status: "published",
      publishedAt: new Date(),
      moderationResult: {
        create: {
          riskLevel: "safe",
          riskTypes: "none",
          matchedRules: "[]",
          reason: "未命中风险规则。",
          suggestedAction: "allow",
          provider: "local"
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
      rankingMetric: {
        create: {
          views: 2000,
          likes: 300,
          saves: 120,
          feedbackScore: 80,
          heatScore: 80,
          freshnessScore: 100,
          riskPenalty: 0,
          rankingScore: 90
        }
      }
    }
  });

  return {
    id: post.id,
    title
  };
}

test("content detail returns to rankings when opened from rankings", async ({
  page
}) => {
  await ensureAdminUser();
  const post = await seedRankingPost();

  await page.goto("/login");
  await page.getByLabel("邮箱").fill("creator@example.com");
  await page.getByLabel("密码").fill("Demo123456");
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForLoadState("networkidle");

  await page.goto(`/content/${post.id}?from=rankings`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: post.title })).toBeVisible();
  await expect(page.getByText("榜单详情")).toBeVisible();
  await expect(page.getByText("上榜因素")).toBeVisible();
  await expect(page.getByText("每次打开内容详情")).toHaveCount(0);
  await expect(page.getByText("Reader View")).toHaveCount(0);
  await expect(page.getByText("审核通过，可分发")).toHaveCount(0);

  const contentInfo = page.getByTestId("content-info-panel");

  await expect(contentInfo).toHaveCount(1);
  await expect(contentInfo).not.toHaveAttribute("open", "");
  await expect(contentInfo.getByText("发布时间", { exact: true })).toBeHidden();

  await contentInfo.locator("summary").click();
  await expect(contentInfo.getByText("发布时间", { exact: true })).toBeVisible();
  await expect(contentInfo.getByText("收起信息")).toBeVisible();

  await page.getByRole("link", { name: "返回热点榜单" }).click();
  await expect(page.getByTestId("rankings-page")).toBeVisible();
});
