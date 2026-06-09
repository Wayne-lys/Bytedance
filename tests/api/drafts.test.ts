import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { sessionCookieName } from "@/lib/auth";

const cookieStore = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: () => ({
    set: (name: string, value: string) => cookieStore.set(name, value),
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value ? { value } : undefined;
    },
    delete: (name: string) => cookieStore.delete(name)
  })
}));

async function ensureDraftOwner() {
  await prisma.user.deleteMany({
    where: {
      email: { in: ["other-draft-owner@example.com", "draft-owner@example.com"] }
    }
  });
  await prisma.user.create({
    data: {
      email: "other-draft-owner@example.com",
      name: "其他草稿用户"
    }
  });

  const user = await prisma.user.create({
    data: {
      email: "draft-owner@example.com",
      name: "草稿测试用户"
    }
  });

  cookieStore.set(sessionCookieName(), user.id);
  return user;
}

describe("drafts api", () => {
  beforeEach(async () => {
    cookieStore.clear();
    const user = await ensureDraftOwner();
    await prisma.draft.deleteMany({
      where: {
        authorId: user.id
      }
    });
  });

  it("saves and restores the latest draft", async () => {
    const user = await ensureDraftOwner();
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
    expect(savePayload.data.draft.authorId).toBe(user.id);

    const restoreResponse = await GET(
      new Request("http://localhost/api/drafts?latest=true")
    );
    const restorePayload = await restoreResponse.json();

    expect(restoreResponse.status).toBe(200);
    expect(restorePayload.data.draft.title).toBe("通勤补能建议");
  });

  it("creates a fresh draft when the cached local draft id is stale", async () => {
    const user = await ensureDraftOwner();
    const { POST } = await import("@/app/api/drafts/route");

    const response = await POST(
      new Request("http://localhost/api/drafts", {
        method: "POST",
        body: JSON.stringify({
          id: "missing-local-draft",
          topic: "通勤补能",
          audience: "城市白领",
          platform: "头条",
          style: "自然可信",
          title: "本地恢复草稿",
          body: "正文内容",
          tags: "通勤,效率"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.draft.id).not.toBe("missing-local-draft");
    expect(payload.data.draft.authorId).toBe(user.id);
    expect(payload.data.draft.title).toBe("本地恢复草稿");
  });

  it("does not restore a published draft as the latest editable draft", async () => {
    const user = await ensureDraftOwner();
    const { GET } = await import("@/app/api/drafts/route");

    await prisma.draft.create({
      data: {
        authorId: user.id,
        title: "仍可编辑草稿",
        body: "仍可编辑正文",
        tags: "草稿",
        status: "draft"
      }
    });
    await prisma.draft.create({
      data: {
        authorId: user.id,
        title: "已发布草稿",
        body: "已发布正文",
        tags: "发布",
        status: "published"
      }
    });

    const response = await GET(
      new Request("http://localhost/api/drafts?latest=true")
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.draft.title).toBe("仍可编辑草稿");
  });
});
