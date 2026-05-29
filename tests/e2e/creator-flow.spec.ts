import { expect, test } from "@playwright/test";

test("creator can generate, review, publish, and find content in rankings", async ({
  page
}) => {
  const topic = `城市咖啡店的低糖点单方式 ${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("邮箱").fill("creator@example.com");
  await page.getByLabel("密码").fill("Demo123456");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page.getByRole("heading", { name: "AI 创作者工作台" })).toBeVisible();

  const workspaceNav = page.getByRole("navigation", { name: "工作区导航" });

  await workspaceNav.getByRole("link", { name: "素材库" }).click();
  await expect(page.getByRole("heading", { name: "素材库" })).toBeVisible();

  await workspaceNav.getByRole("link", { name: "创作台" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("选题").fill(topic);
  await page.getByLabel("目标受众").fill("城市白领");
  await page.getByRole("button", { name: "AI 生成" }).click();
  await expect(page.getByLabel("标题")).not.toHaveValue("");

  await page.getByRole("button", { name: "立即保存" }).click();
  await expect(page.getByText("已同步")).toBeVisible();

  await page.getByRole("button", { name: "审核内容" }).click();
  await expect(page.getByText("审核通过")).toBeVisible();

  await page.getByRole("button", { name: "发布内容" }).click();
  await expect(page.getByText("发布成功")).toBeVisible();

  await workspaceNav.getByRole("link", { name: "热点榜单" }).click();
  const rankingItem = page.getByRole("link", { name: new RegExp(topic) }).first();

  await expect(rankingItem).toBeVisible();
  await rankingItem.click();
  await expect(page.getByText("发布者")).toBeVisible();
});
