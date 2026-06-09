import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { prisma } from "../../src/lib/db";

async function ensurePermissionUsers() {
  const passwordHash = await bcrypt.hash("Demo123456", 10);

  const admin = await prisma.user.upsert({
    where: { email: "permissions-admin@example.com" },
    update: {
      passwordHash,
      name: "权限管理员",
      role: "admin"
    },
    create: {
      email: "permissions-admin@example.com",
      passwordHash,
      name: "权限管理员",
      role: "admin"
    }
  });

  const target = await prisma.user.upsert({
    where: { email: "permissions-target@example.com" },
    update: {
      name: "待授权用户",
      role: "creator"
    },
    create: {
      email: "permissions-target@example.com",
      name: "待授权用户",
      role: "creator"
    }
  });

  await prisma.user.updateMany({
    where: { role: { startsWith: "permissions_e2e_" } },
    data: { role: "creator" }
  });
  await prisma.roleDefinition.deleteMany({
    where: { key: { startsWith: "permissions_e2e_" } }
  });

  return { admin, target };
}

async function ensureDeletablePermissionUser() {
  await prisma.user.deleteMany({
    where: { email: "permissions-delete-target@example.com" }
  });

  return prisma.user.create({
    data: {
      email: "permissions-delete-target@example.com",
      name: "待删除用户",
      role: "creator"
    }
  });
}

test("admin can change a user's role from the permission management page", async ({
  page
}) => {
  const { target } = await ensurePermissionUsers();

  await page.goto("/login");
  await page.getByLabel("邮箱").fill("permissions-admin@example.com");
  await page.getByLabel("密码").fill("Demo123456");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByRole("heading", { name: "AI 创作者工作台" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "工作区导航" })
    .getByRole("link", { name: "权限管理" })
    .click();

  await expect(page.getByRole("heading", { name: "用户权限管理" })).toBeVisible();

  const userCard = page.locator("article").filter({
    hasText: "permissions-target@example.com"
  });

  await expect(userCard).toContainText("创作者");
  await expect(userCard.getByLabel("设置 permissions-target@example.com 角色")).toBeDisabled();
  await userCard.getByRole("button", { name: "编辑角色" }).click();
  await expect(userCard.getByLabel("设置 permissions-target@example.com 角色")).toBeEnabled();
  await userCard.getByLabel("设置 permissions-target@example.com 角色").selectOption("reviewer");
  await userCard.getByRole("button", { name: "保存角色" }).click();

  await expect(userCard).toContainText("已更新为 审核员");
  await expect(userCard.getByLabel("设置 permissions-target@example.com 角色")).toBeDisabled();
  await expect
    .poll(async () => {
      const user = await prisma.user.findUnique({ where: { id: target.id } });
      return user?.role;
    })
    .toBe("reviewer");
});

test("admin can create, assign, and delete a custom role from the permission page", async ({
  page
}) => {
  const { target } = await ensurePermissionUsers();
  const roleKey = "permissions_e2e_rules";

  await page.goto("/login");
  await page.getByLabel("邮箱").fill("permissions-admin@example.com");
  await page.getByLabel("密码").fill("Demo123456");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByRole("heading", { name: "AI 创作者工作台" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "工作区导航" })
    .getByRole("link", { name: "权限管理" })
    .click();

  await page.getByPlaceholder("content_lead").fill(roleKey);
  await page.getByPlaceholder("内容主管").fill("规则协调员");
  await page.getByLabel("规则管理").check();
  await page.getByRole("button", { name: "新增角色" }).click();

  await expect(page.getByText("已新增角色 规则协调员")).toBeVisible();
  await expect(page.locator("article").filter({ hasText: roleKey })).toContainText(
    "规则协调员"
  );

  const userCard = page.locator("article").filter({
    hasText: "permissions-target@example.com"
  });

  await userCard.getByRole("button", { name: "编辑角色" }).click();
  await userCard.getByLabel("设置 permissions-target@example.com 角色").selectOption(roleKey);
  await userCard.getByRole("button", { name: "保存角色" }).click();
  await expect(userCard).toContainText("已更新为 规则协调员");
  await expect
    .poll(async () => {
      const user = await prisma.user.findUnique({ where: { id: target.id } });
      return user?.role;
    })
    .toBe(roleKey);

  await userCard.getByRole("button", { name: "编辑角色" }).click();
  await userCard.getByLabel("设置 permissions-target@example.com 角色").selectOption("creator");
  await userCard.getByRole("button", { name: "保存角色" }).click();
  await expect(userCard).toContainText("已更新为 创作者");

  const roleCard = page.locator("article").filter({ hasText: roleKey });
  await expect(roleCard).toContainText("0 人");
  await roleCard.getByRole("button", { name: "删除角色" }).click();

  await expect(page.getByText("已删除角色 规则协调员")).toBeVisible();
  await expect(roleCard).toHaveCount(0);
});

test("admin can delete another user from the permission page", async ({ page }) => {
  await ensurePermissionUsers();
  const target = await ensureDeletablePermissionUser();

  await page.goto("/login");
  await page.getByLabel("邮箱").fill("permissions-admin@example.com");
  await page.getByLabel("密码").fill("Demo123456");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByRole("heading", { name: "AI 创作者工作台" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "工作区导航" })
    .getByRole("link", { name: "权限管理" })
    .click();

  const userCard = page.locator("article").filter({
    hasText: "permissions-delete-target@example.com"
  });
  await expect(userCard).toBeVisible();

  await userCard.getByRole("button", { name: "删除用户" }).click();

  const confirmDialog = page.getByRole("dialog", { name: "删除用户" });
  await expect(confirmDialog).toBeVisible();
  await expect(confirmDialog).toContainText("permissions-delete-target@example.com");
  await confirmDialog.getByRole("button", { name: "确认删除" }).click();

  await expect(page.getByText("已删除用户 待删除用户")).toBeVisible();
  await expect(userCard).toHaveCount(0);
  await expect
    .poll(async () => {
      const user = await prisma.user.findUnique({ where: { id: target.id } });
      return user;
    })
    .toBeNull();
});
