import { expect, test } from "@playwright/test";

test("rules page stacks quality dimensions below long safety rules on desktop", async ({
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
  expect(qualityBox!.y).toBeGreaterThan(safetyBox!.y + safetyBox!.height - 1);
});
