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
    await ensureAdminUser();
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

test("review desk switches detail panels when a moderation record is selected", async ({
  page
}) => {
  const user = await prisma.user.upsert({
    where: { email: "review-select@example.com" },
    update: {},
    create: {
      email: "review-select@example.com",
      name: "审核选择测试用户"
    }
  });
  const firstTitle = `审核选择样本 A ${Date.now()}`;
  const secondTitle = `审核选择样本 B ${Date.now()}`;

  try {
    await ensureAdminUser();
    await prisma.post.create({
      data: {
        authorId: user.id,
        title: firstTitle,
        body: "第一条审核内容。",
        tags: "审核,选择",
        status: "published",
        publishedAt: new Date(),
        moderationResult: {
          create: {
            riskLevel: "safe",
            riskTypes: "none",
            matchedRules: "[]",
            reason: "第一条安全说明。",
            suggestedAction: "allow",
            provider: "local"
          }
        },
        qualityScore: {
          create: {
            originality: 70,
            structure: 71,
            informationDensity: 72,
            clarity: 73,
            interactionPotential: 74,
            platformFit: 75,
            total: 71
          }
        }
      }
    });
    await prisma.post.create({
      data: {
        authorId: user.id,
        title: secondTitle,
        body: "第二条审核内容。",
        tags: "审核,选择",
        status: "published",
        publishedAt: new Date(),
        moderationResult: {
          create: {
            riskLevel: "medium",
            riskTypes: "广告导流",
            matchedRules: "[]",
            reason: "第二条命中导流风险。",
            suggestedAction: "review",
            provider: "local"
          }
        },
        qualityScore: {
          create: {
            originality: 80,
            structure: 81,
            informationDensity: 82,
            clarity: 83,
            interactionPotential: 84,
            platformFit: 85,
            total: 83
          }
        }
      }
    });

    await page.goto("/login");
    await page.getByLabel("邮箱").fill("creator@example.com");
    await page.getByLabel("密码").fill("Demo123456");
    await page.getByRole("button", { name: "登录" }).click();
    await page
      .getByRole("navigation", { name: "工作区导航" })
      .getByRole("link", { name: "审核与质量" })
      .click();
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: `查看审核记录 ${secondTitle}` }).click();

    const detail = page.getByTestId("review-detail-panel");

    await expect(detail).toContainText(secondTitle);
    await expect(detail).toContainText("第二条命中导流风险。");
    await expect(detail).toContainText("83");
    await expect(
      page.getByRole("button", { name: `查看审核记录 ${secondTitle}` })
    ).toHaveAttribute("aria-pressed", "true");
  } finally {
    await prisma.post.deleteMany({
      where: {
        title: {
          in: [firstTitle, secondTitle]
        }
      }
    });
  }
});
