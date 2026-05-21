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

    const listResponse = await GET();
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(
      listPayload.data.prompts.some(
        (prompt: { name: string }) => prompt.name === "清单体模板"
      )
    ).toBe(true);
  });
});
