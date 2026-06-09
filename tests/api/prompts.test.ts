import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

async function ensurePromptOwner() {
  return prisma.user.upsert({
    where: { email: "prompt-owner@example.com" },
    update: {},
    create: {
      email: "prompt-owner@example.com",
      name: "Prompt 测试用户"
    }
  });
}

describe("prompts api", () => {
  beforeEach(async () => {
    const user = await ensurePromptOwner();
    await prisma.promptTemplate.deleteMany({ where: { ownerId: user.id } });
  });

  it("creates and lists prompt templates", async () => {
    const { POST, GET } = await import("@/app/api/prompts/route");

    const createResponse = await POST(
      new Request("http://localhost/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          name: "清单体模板",
          scenario: "清单",
          content: "围绕 {{topic}} 生成 5 个要点。",
          variables: "topic"
        })
      })
    );
    const createPayload = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(createPayload.data.prompt.name).toBe("清单体模板");

    const listResponse = await GET(new Request("http://localhost/api/prompts"));
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(
      listPayload.data.prompts.some(
        (prompt: { name: string }) => prompt.name === "清单体模板"
      )
    ).toBe(true);
  });

  it("updates and deletes prompt templates", async () => {
    const { POST, GET } = await import("@/app/api/prompts/route");
    const { PATCH, DELETE } = await import("@/app/api/prompts/[id]/route");

    const createResponse = await POST(
      new Request("http://localhost/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          name: "待编辑模板",
          scenario: "清单",
          content: "围绕 {{topic}} 生成 5 个要点。",
          variables: "topic"
        })
      })
    );
    const createPayload = await createResponse.json();
    const promptId = createPayload.data.prompt.id;

    const updateResponse = await PATCH(
      new Request(`http://localhost/api/prompts/${promptId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: "已编辑模板",
          scenario: "标题",
          content: "围绕 {{topic}} 生成 10 个标题。",
          variables: "topic,audience"
        })
      }),
      { params: { id: promptId } }
    );
    const updatePayload = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.data.prompt.name).toBe("已编辑模板");
    expect(updatePayload.data.prompt.scenario).toBe("标题");

    const deleteResponse = await DELETE(
      new Request(`http://localhost/api/prompts/${promptId}`, {
        method: "DELETE"
      }),
      { params: { id: promptId } }
    );

    expect(deleteResponse.status).toBe(200);

    const listResponse = await GET(new Request("http://localhost/api/prompts"));
    const listPayload = await listResponse.json();

    expect(
      listPayload.data.prompts.some(
        (prompt: { id: string }) => prompt.id === promptId
      )
    ).toBe(false);
  });

  it("searches prompt templates by keyword", async () => {
    const { POST, GET } = await import("@/app/api/prompts/route");

    await POST(
      new Request("http://localhost/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          name: "咖啡清单模板",
          scenario: "清单",
          content: "围绕 {{topic}} 生成咖啡点单清单。",
          variables: "topic"
        })
      })
    );
    await POST(
      new Request("http://localhost/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          name: "露营标题模板",
          scenario: "标题",
          content: "围绕 {{topic}} 生成露营标题。",
          variables: "topic"
        })
      })
    );

    const response = await GET(new Request("http://localhost/api/prompts?q=咖啡"));
    const payload = await response.json();
    const names = payload.data.prompts.map((prompt: { name: string }) => prompt.name);

    expect(response.status).toBe(200);
    expect(names).toContain("咖啡清单模板");
    expect(names).not.toContain("露营标题模板");
  });
});
