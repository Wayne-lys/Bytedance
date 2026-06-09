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

async function signIn(role = "admin") {
  const user = await prisma.user.upsert({
    where: { email: `rules-${role}@example.com` },
    update: { role },
    create: {
      email: `rules-${role}@example.com`,
      name: `规则测试 ${role}`,
      role
    }
  });

  cookieStore.set(sessionCookieName(), user.id);
  return user;
}

describe("rules api", () => {
  beforeEach(async () => {
    cookieStore.clear();
    await prisma.auditRule.deleteMany({
      where: { category: { startsWith: "测试规则" } }
    });
  });

  it("creates an audit rule", async () => {
    await signIn("admin");
    const { POST } = await import("@/app/api/rules/route");

    const response = await POST(
      new Request("http://localhost/api/rules", {
        method: "POST",
        body: JSON.stringify({
          category: "测试规则-联系方式导流",
          riskLevel: "medium",
          action: "rewrite",
          description: "识别引导用户跳转私域联系方式的表达。",
          pattern: "加微信|私信|扫码"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.rule.category).toBe("测试规则-联系方式导流");
    expect(payload.data.rule.enabled).toBe(true);
  });

  it("rejects audit rule creation from creators without rule permission", async () => {
    await signIn("creator");
    const { POST } = await import("@/app/api/rules/route");

    const response = await POST(
      new Request("http://localhost/api/rules", {
        method: "POST",
        body: JSON.stringify({
          category: "测试规则-普通用户不可新增",
          riskLevel: "medium",
          action: "rewrite",
          description: "普通创作者不应能修改审核规则。",
          pattern: "普通"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("权限不足");
  });

  it("rejects invalid risk levels", async () => {
    await signIn("admin");
    const { POST } = await import("@/app/api/rules/route");

    const response = await POST(
      new Request("http://localhost/api/rules", {
        method: "POST",
        body: JSON.stringify({
          category: "测试规则-错误等级",
          riskLevel: "critical",
          action: "block",
          description: "错误风险等级不应入库。",
          pattern: "错误"
        })
      })
    );

    expect(response.status).toBe(422);
  });

  it("updates an audit rule", async () => {
    await signIn("admin");
    const rule = await prisma.auditRule.create({
      data: {
        category: "测试规则-待编辑",
        riskLevel: "low",
        action: "warn",
        description: "原始说明内容。",
        pattern: "原始"
      }
    });
    const { PATCH } = await import("@/app/api/rules/[id]/route");

    const response = await PATCH(
      new Request(`http://localhost/api/rules/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          category: "测试规则-已编辑",
          riskLevel: "high",
          action: "block",
          description: "编辑后的规则说明内容。",
          pattern: "编辑后"
        })
      }),
      { params: { id: rule.id } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.rule.category).toBe("测试规则-已编辑");
    expect(payload.data.rule.riskLevel).toBe("high");
    expect(payload.data.rule.action).toBe("block");
  });

  it("deletes an audit rule", async () => {
    await signIn("admin");
    const rule = await prisma.auditRule.create({
      data: {
        category: "测试规则-待删除",
        riskLevel: "medium",
        action: "rewrite",
        description: "删除测试规则说明。",
        pattern: "删除"
      }
    });
    const { DELETE } = await import("@/app/api/rules/[id]/route");

    const response = await DELETE(
      new Request(`http://localhost/api/rules/${rule.id}`, {
        method: "DELETE"
      }),
      { params: { id: rule.id } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.deletedId).toBe(rule.id);
    await expect(
      prisma.auditRule.findUnique({ where: { id: rule.id } })
    ).resolves.toBeNull();
  });
});
