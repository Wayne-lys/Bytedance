import { expect, test } from "@playwright/test";

test("creator uploads a local image and sees it in the material list", async ({
  page
}) => {
  const uploadName = `真实上传图片-${Date.now()}.png`;
  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lO9AOQAAAABJRU5ErkJggg==",
    "base64"
  );

  await page.goto("/login");
  await page.getByLabel("邮箱").fill("creator@example.com");
  await page.getByLabel("密码").fill("Demo123456");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page.getByRole("heading", { name: "AI 创作者工作台" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "工作区导航" })
    .getByRole("link", { name: "素材库" })
    .click();
  await page.waitForLoadState("networkidle");
  const uploadButton = page.getByRole("button", { name: "上传素材" });

  await expect(uploadButton).toBeEnabled();
  await uploadButton.click();
  await expect(uploadButton).toHaveAttribute("aria-expanded", "true");
  await page.getByLabel("本地文件").setInputFiles({
    name: uploadName,
    mimeType: "image/png",
    buffer: pngBuffer
  });
  await expect(page.getByRole("img", { name: "素材预览" })).toBeVisible();
  await page.getByRole("button", { name: "确认上传" }).click();

  await expect(page.getByText("上传成功，素材已加入列表")).toBeVisible();
  await expect(page.getByLabel("素材名称")).toBeHidden();

  const uploadedCard = page.locator("article").filter({ hasText: uploadName }).first();

  await expect(uploadedCard).toBeVisible();
  await expect(uploadedCard.getByText("通过", { exact: true })).toBeVisible();
  await expect(uploadedCard.locator("img").first()).toHaveAttribute(
    "src",
    /^data:image\/png;base64,/
  );
});

test("creator deletes an uploaded material from the material list", async ({ page }) => {
  const uploadName = `待删除素材-${Date.now()}.png`;
  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lO9AOQAAAABJRU5ErkJggg==",
    "base64"
  );

  await page.goto("/login");
  await page.getByLabel("邮箱").fill("creator@example.com");
  await page.getByLabel("密码").fill("Demo123456");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByRole("heading", { name: "AI 创作者工作台" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "工作区导航" })
    .getByRole("link", { name: "素材库" })
    .click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "上传素材" }).click();
  await page.getByLabel("本地文件").setInputFiles({
    name: uploadName,
    mimeType: "image/png",
    buffer: pngBuffer
  });
  await page.getByRole("button", { name: "确认上传" }).click();
  await expect(page.getByText("上传成功，素材已加入列表")).toBeVisible();

  const uploadedCard = page.locator("article").filter({ hasText: uploadName }).first();

  await expect(uploadedCard).toBeVisible();
  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/materials/") &&
      response.request().method() === "DELETE"
  );

  await uploadedCard.getByRole("button", { name: `删除 ${uploadName}` }).click();
  const dialog = page.getByRole("dialog", { name: "删除素材" });

  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(uploadName);
  await dialog.getByRole("button", { name: "确认删除" }).click();
  expect((await deleteResponse).ok()).toBe(true);
  await expect(uploadedCard).toBeHidden();
});
