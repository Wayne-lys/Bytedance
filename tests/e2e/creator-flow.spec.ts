import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { prisma } from "../../src/lib/db";

async function ensureAdminUser() {
  const passwordHash = await bcrypt.hash("Demo123456", 10);

  await prisma.user.upsert({
    where: { email: "creator@example.com" },
    update: {
      passwordHash,
      name: "训练营创作者",
      role: "admin"
    },
    create: {
      email: "creator@example.com",
      passwordHash,
      name: "训练营创作者",
      role: "admin"
    }
  });
}

test("creator can publish through automatic review and open the detail page", async ({
  page
}) => {
  const topic = `城市咖啡店的低糖点单方式 ${Date.now()}`;

  await ensureAdminUser();
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("creator@example.com");
  await page.getByLabel("密码").fill("Demo123456");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(
    page.getByRole("heading", { name: "AI 内容生产与审核工作台" })
  ).toBeVisible();

  const workspaceNav = page.getByRole("navigation", { name: "工作区导航" });

  await workspaceNav.getByRole("link", { name: "素材资产" }).click();
  await expect(page.getByRole("heading", { name: "素材库" })).toBeVisible();

  await workspaceNav.getByRole("link", { name: "创作台" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("选题").fill(topic);
  await page.getByLabel("目标受众").fill("城市白领");
  await page.getByRole("textbox", { name: "标题" }).fill(topic);
  await page
    .getByRole("textbox", { name: "正文" })
    .fill("这是一条用于验证自动审核发布流程的安全通勤内容。");
  await page.getByRole("textbox", { name: "标签" }).fill("通勤,效率");

  await page.getByRole("button", { name: "立即保存" }).click();
  await expect(page.getByText("已同步")).toBeVisible();

  await expect(page.getByRole("button", { name: "审核内容" })).toHaveCount(0);

  await page.getByRole("button", { name: "发布内容" }).click();
  await expect(page.getByText("发布成功")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("link", { name: "查看详情" }).click();
  await expect(page.getByRole("heading", { name: topic })).toBeVisible();
});
