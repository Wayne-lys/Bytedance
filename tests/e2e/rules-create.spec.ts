import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { prisma } from "../../src/lib/db";

const adminEmail = "creator@example.com";
const adminPassword = "Demo123456";

async function ensureAdminUser() {
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      name: "训练营创作者",
      role: "admin"
    },
    create: {
      email: adminEmail,
      passwordHash,
      name: "训练营创作者",
      role: "admin"
    }
  });
}

test.beforeEach(async ({ page }) => {
  await ensureAdminUser();

  const response = await page.request.post("/api/auth/login", {
    data: {
      type: "email",
      email: adminEmail,
      password: adminPassword
    }
  });

  expect(response.status()).toBe(200);
});

test("creator can add an audit rule from the rules page", async ({ page }) => {
  const category = `测试规则-${Date.now()}`;

  await page.goto("/rules");
  await page.getByRole("button", { name: "新增规则" }).click();

  await page.getByLabel("规则类别").fill(category);
  await page.getByLabel("风险等级").selectOption("medium");
  await page.getByLabel("处理策略").selectOption("rewrite");
  await page.getByLabel("规则说明").fill("识别引导用户进入私域渠道的表达。");
  await page.getByLabel("识别模式").fill("加微信|私信|扫码");
  await page.getByRole("button", { name: "保存规则" }).click();

  await expect(page.getByText("规则已新增")).toBeVisible();
  await expect(page.locator("article").filter({ hasText: category })).toBeVisible();
});

test("expanded audit rule form uses the full rule-list width", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/rules");
  await page.getByRole("button", { name: "新增规则" }).click();

  const form = page.locator("form").filter({ hasText: "规则类别" });
  const firstRuleCard = page.locator("article").first();

  await expect(form).toBeVisible();
  await expect(firstRuleCard).toBeVisible();

  const formBox = await form.boundingBox();
  const firstRuleBox = await firstRuleCard.boundingBox();

  expect(formBox).not.toBeNull();
  expect(firstRuleBox).not.toBeNull();
  expect(Math.abs(formBox!.x - firstRuleBox!.x)).toBeLessThanOrEqual(8);
  expect(formBox!.width).toBeGreaterThanOrEqual(firstRuleBox!.width * 1.8);
});

test("creator can edit and delete an audit rule from its card", async ({ page }) => {
  const category = `测试规则-编辑删除-${Date.now()}`;
  const updatedCategory = `${category}-已编辑`;

  await page.goto("/rules");
  await page.getByRole("button", { name: "新增规则" }).click();
  await page.getByLabel("规则类别").fill(category);
  await page.getByLabel("风险等级").selectOption("medium");
  await page.getByLabel("处理策略").selectOption("rewrite");
  await page.getByLabel("规则说明").fill("识别需要编辑删除验证的表达。");
  await page.getByLabel("识别模式").fill("编辑删除");
  await page.getByRole("button", { name: "保存规则" }).click();

  const ruleCard = page.locator("article").filter({ hasText: category });

  await expect(ruleCard).toBeVisible();
  await ruleCard.getByRole("button", { name: "编辑规则" }).click();

  const editCard = page.locator("article").filter({
    has: page.getByRole("button", { name: "保存修改" })
  });

  await editCard.getByLabel("规则类别").fill(updatedCategory);
  await editCard.getByLabel("风险等级").selectOption("high");
  await editCard.getByLabel("处理策略").selectOption("block");
  await editCard.getByLabel("规则说明").fill("编辑后的规则说明内容。");
  await editCard.getByLabel("识别模式").fill("编辑后");
  await editCard.getByRole("button", { name: "保存修改" }).click();

  const updatedCard = page.locator("article").filter({ hasText: updatedCategory });

  await expect(updatedCard).toBeVisible();
  await expect(updatedCard.getByText("high", { exact: true })).toBeVisible();
  await updatedCard.getByRole("button", { name: "删除规则" }).click();

  const dialog = page.getByRole("dialog", { name: "删除规则" });

  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "确认删除" }).click();
  await expect(updatedCard).toBeHidden();
});
