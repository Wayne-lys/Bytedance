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

test("rules page places quality dimensions above long safety rules on desktop", async ({
  page
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/rules");

  const safetyPanel = page
    .getByRole("heading", { name: "内容安全规则" })
    .locator("xpath=ancestor::section[1]");
  const qualityPanel = page
    .getByRole("heading", { name: "质量评分维度" })
    .locator("xpath=ancestor::section[1]");

  await expect(safetyPanel).toBeVisible();
  await expect(qualityPanel).toBeVisible();

  const safetyBox = await safetyPanel.boundingBox();
  const qualityBox = await qualityPanel.boundingBox();

  expect(safetyBox).not.toBeNull();
  expect(qualityBox).not.toBeNull();
  expect(qualityBox!.y).toBeLessThan(safetyBox!.y);
});
