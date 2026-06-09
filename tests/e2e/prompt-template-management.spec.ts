import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { prisma } from "../../src/lib/db";

async function ensureAdminUser() {
  const passwordHash = await bcrypt.hash("Demo123456", 10);

  return prisma.user.upsert({
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

test("creator manages prompt templates and selected prompts drive generation", async ({
  page
}) => {
  const owner = await ensureAdminUser();
  const suffix = Date.now();
  const checklistName = `E2E 清单模板 ${suffix}`;
  const headlineName = `E2E 标题模板 ${suffix}`;
  const editedName = `E2E 已编辑模板 ${suffix}`;
  const topic = `低糖咖啡点单 ${suffix}`;
  const generatedPrompts: string[] = [];

  await prisma.promptTemplate.createMany({
    data: [
      {
        ownerId: owner.id,
        name: checklistName,
        scenario: "000测试",
        variables: "topic",
        content: "把 {{topic}} 拆成可执行清单，每一点给出简短理由。"
      },
      {
        ownerId: owner.id,
        name: headlineName,
        scenario: "000测试",
        variables: "topic",
        content: "围绕 {{topic}} 生成 10 个适合信息流点击的标题。"
      }
    ]
  });

  await page.route("**/api/ai/generate", async (route) => {
    const payload = route.request().postDataJSON() as { prompt: string };
    const mode = payload.prompt.includes("标题") ? "标题" : "清单";

    generatedPrompts.push(payload.prompt);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          generated: {
            title: `${mode}结果：${topic}`,
            body: `${mode}结果正文`,
            tags: ["头条", mode],
            coverSuggestion: "测试封面",
            publishAdvice: "测试建议",
            provider: "mock"
          }
        }
      })
    });
  });

  await page.goto("/login");
  await page.getByLabel("邮箱").fill("creator@example.com");
  await page.getByLabel("密码").fill("Demo123456");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByRole("heading", { name: "AI 创作者工作台" })).toBeVisible();
  await page.evaluate(() => window.localStorage.removeItem("creator-draft"));
  await page.goto("/create");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("选题").fill(topic);
  await page.getByLabel("目标受众").fill("城市白领");

  await page.getByLabel("查找 Prompt").fill(checklistName);
  await expect(page.getByRole("button", { name: `选择 ${checklistName}` })).toBeVisible();
  await expect(page.getByRole("button", { name: `选择 ${headlineName}` })).toBeHidden();
  await expect(page.getByText(/显示 1 \/ \d+ 个/)).toBeVisible();
  await page.getByLabel("查找 Prompt").fill("");

  const checklistCard = page.locator("article").filter({ hasText: checklistName }).first();
  await checklistCard.getByRole("button", { name: `选择 ${checklistName}` }).click();
  await page.getByRole("button", { name: "AI 生成" }).click();
  await expect(page.getByLabel("正文")).toHaveValue("清单结果正文");

  const headlineCard = page.locator("article").filter({ hasText: headlineName }).first();
  await headlineCard.getByRole("button", { name: `选择 ${headlineName}` }).click();
  await page.getByRole("button", { name: "AI 生成" }).click();
  await expect(page.getByLabel("正文")).toHaveValue("标题结果正文");
  expect(generatedPrompts).toEqual([
    "把 {{topic}} 拆成可执行清单，每一点给出简短理由。",
    "围绕 {{topic}} 生成 10 个适合信息流点击的标题。"
  ]);

  await checklistCard.getByRole("button", { name: `编辑 ${checklistName}` }).click();
  await page.getByLabel("模板名称").fill(editedName);
  await page.getByLabel("适用场景").fill("000测试编辑");
  await page.getByLabel("Prompt 内容").fill("围绕 {{topic}} 生成 6 条行动建议。");
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(page.getByRole("button", { name: `选择 ${editedName}` })).toBeVisible();

  const editedCard = page.locator("article").filter({ hasText: editedName }).first();
  await editedCard.getByRole("button", { name: `删除 ${editedName}` }).click();
  const dialog = page.getByRole("dialog", { name: "删除 Prompt" });

  await dialog.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByRole("button", { name: `选择 ${editedName}` })).toBeHidden();
});
