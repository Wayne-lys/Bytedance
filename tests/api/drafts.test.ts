import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

async function ensureDraftOwner() {
  return prisma.user.upsert({
    where: { email: "draft-owner@example.com" },
    update: {},
    create: {
      email: "draft-owner@example.com",
      name: "草稿测试用户"
    }
  });
}

describe("drafts api", () => {
  beforeEach(async () => {
    const user = await ensureDraftOwner();
    await prisma.draft.deleteMany({ where: { authorId: user.id } });
  });

  it("saves and restores the latest draft", async () => {
    await ensureDraftOwner();
    const { POST, GET } = await import("@/app/api/drafts/route");

    const saveResponse = await POST(
      new Request("http://localhost/api/drafts", {
        method: "POST",
        body: JSON.stringify({
          topic: "通勤补能",
          audience: "城市白领",
          platform: "头条",
          style: "自然可信",
          title: "通勤补能建议",
          body: "正文内容",
          tags: "通勤,效率"
        })
      })
    );
    const savePayload = await saveResponse.json();

    expect(saveResponse.status).toBe(200);
    expect(savePayload.data.draft.title).toBe("通勤补能建议");

    const restoreResponse = await GET(
      new Request("http://localhost/api/drafts?latest=true")
    );
    const restorePayload = await restoreResponse.json();

    expect(restoreResponse.status).toBe(200);
    expect(restorePayload.data.draft.title).toBe("通勤补能建议");
  });
});
