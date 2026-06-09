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

async function signIn(role = "reviewer") {
  const user = await prisma.user.upsert({
    where: { email: `moderation-${role}@example.com` },
    update: { role },
    create: {
      email: `moderation-${role}@example.com`,
      name: `审核测试 ${role}`,
      role
    }
  });

  cookieStore.set(sessionCookieName(), user.id);
  return user;
}

describe("moderation api", () => {
  beforeEach(() => {
    cookieStore.clear();
  });

  it("reviews risky content and returns quality scores", async () => {
    await signIn("reviewer");
    const { POST } = await import("@/app/api/moderation/review/route");

    const response = await POST(
      new Request("http://localhost/api/moderation/review", {
        method: "POST",
        body: JSON.stringify({
          title: "稳赚方法",
          body: "这个下注方法稳赚不赔，今晚就能回本。",
          tags: ["热点"],
          platform: "头条"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.moderation.riskLevel).toBe("high");
    expect(payload.data.quality.total).toBeGreaterThanOrEqual(0);
  });

  it("blocks illegal drug use intent in review requests", async () => {
    await signIn("reviewer");
    const { POST } = await import("@/app/api/moderation/review/route");

    const response = await POST(
      new Request("http://localhost/api/moderation/review", {
        method: "POST",
        body: JSON.stringify({
          title: "我要吸毒",
          body: "我要吸毒",
          tags: ["白领生活指南"],
          platform: "头条"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.moderation.riskLevel).toBe("high");
    expect(payload.data.moderation.riskTypes).toContain("涉毒");
    expect(payload.data.moderation.suggestedAction).toBe("block");
  });

  it("rejects review requests from creators without review permission", async () => {
    await signIn("creator");
    const { POST } = await import("@/app/api/moderation/review/route");

    const response = await POST(
      new Request("http://localhost/api/moderation/review", {
        method: "POST",
        body: JSON.stringify({
          title: "普通创作者自审",
          body: "需要审核权限才能执行安全审核。",
          tags: ["测试"],
          platform: "头条"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("权限不足");
  });

  it("rejects unauthenticated review requests", async () => {
    const { POST } = await import("@/app/api/moderation/review/route");

    const response = await POST(
      new Request("http://localhost/api/moderation/review", {
        method: "POST",
        body: JSON.stringify({
          title: "未登录审核",
          body: "未登录用户不能执行审核。",
          tags: ["测试"],
          platform: "头条"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toContain("未登录");
  });

  it("rewrites risky phrases into compliant wording", async () => {
    await signIn("reviewer");
    const { POST } = await import("@/app/api/moderation/rewrite/route");

    const response = await POST(
      new Request("http://localhost/api/moderation/rewrite", {
        method: "POST",
        body: JSON.stringify({
          content: "扫码进群后可以下注稳赚。"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.content).not.toContain("下注");
    expect(payload.data.content).not.toContain("扫码进群");
  });

  it("lets creators request compliant rewrites for their own content", async () => {
    await signIn("creator");
    const { POST } = await import("@/app/api/moderation/rewrite/route");

    const response = await POST(
      new Request("http://localhost/api/moderation/rewrite", {
        method: "POST",
        body: JSON.stringify({
          content: "扫码进群后可以下注稳赚。"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.content).not.toContain("下注");
    expect(payload.data.content).not.toContain("扫码进群");
  });
});
