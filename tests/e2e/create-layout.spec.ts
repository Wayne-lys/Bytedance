import { expect, test } from "@playwright/test";

test("create desk keeps the long prompt library inside an internal scroll rail", async ({
  page
}) => {
  await page.setViewportSize({ width: 2048, height: 1152 });
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("creator@example.com");
  await page.getByLabel("密码").fill("Demo123456");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByRole("heading", { name: "AI 创作者工作台" })).toBeVisible();

  const workspaceNav = page.getByRole("navigation", { name: "工作区导航" });

  await workspaceNav.getByRole("link", { name: "创作台" }).click();
  await page.waitForLoadState("networkidle");

  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );

  expect(pageOverflow).toBeLessThanOrEqual(120);
});
