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

test("home hero title is not covered by the metric cards on desktop", async ({
  page
}) => {
  await ensureAdminUser();
  await page.setViewportSize({ width: 2048, height: 1152 });
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("creator@example.com");
  await page.getByLabel("密码").fill("Demo123456");
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForLoadState("networkidle");

  const layout = await page.evaluate(() => {
    const hero = document.querySelector(".home-hero");
    const title = hero?.querySelector("h2");
    const metrics = hero?.nextElementSibling;

    if (!hero || !title || !metrics) {
      return null;
    }

    const heroRect = hero.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const metricsRect = metrics.getBoundingClientRect();

    return {
      heroBottom: heroRect.bottom,
      titleBottom: titleRect.bottom,
      metricsTop: metricsRect.top,
      heroOverflowY: window.getComputedStyle(hero).overflowY
    };
  });

  expect(layout).not.toBeNull();
  expect(layout!.heroOverflowY).not.toBe("hidden");
  expect(layout!.heroBottom - layout!.titleBottom).toBeGreaterThanOrEqual(32);
  expect(layout!.metricsTop - layout!.titleBottom).toBeGreaterThanOrEqual(40);
});
