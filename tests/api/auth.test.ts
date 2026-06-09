import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { sessionCookieName } from "@/lib/auth";

vi.mock("next/headers", () => {
  const store = new Map<string, string>();

  return {
    cookies: () => ({
      set: (name: string, value: string) => store.set(name, value),
      get: (name: string) => {
        const value = store.get(name);
        return value ? { value } : undefined;
      },
      delete: (name: string) => store.delete(name)
    })
  };
});

async function cleanAuthData() {
  await prisma.emailCode.deleteMany();
  await prisma.phoneCode.deleteMany();
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: "test@example.com" },
        { email: "role-escalation@example.com" },
        { phone: "13900000000" }
      ]
    }
  });
}

async function requestEmailCode(email: string) {
  const { POST } = await import("@/app/api/auth/email-code/route");
  const response = await POST(
    new Request("http://localhost/api/auth/email-code", {
      method: "POST",
      body: JSON.stringify({ email })
    })
  );
  const payload = await response.json();

  expect(response.status).toBe(200);

  return payload.data.debugCode as string;
}

describe("auth api", () => {
  beforeEach(async () => {
    await cleanAuthData();
  });

  it("registers a user with email and password", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const code = await requestEmailCode("test@example.com");
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "Strong123",
          name: "测试用户",
          code
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.user.email).toBe("test@example.com");
    expect(payload.data.user.passwordHash).toBeUndefined();
  });

  it("registers new accounts as creators and ignores requested roles", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const code = await requestEmailCode("role-escalation@example.com");
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "role-escalation@example.com",
          password: "Strong123",
          name: "提权测试用户",
          code,
          role: "admin"
        })
      })
    );
    const payload = await response.json();
    const user = await prisma.user.findUnique({
      where: { email: "role-escalation@example.com" }
    });

    expect(response.status).toBe(200);
    expect(payload.data.user.role).toBe("creator");
    expect(payload.data.user.roleLabel).toBe("创作者");
    expect(payload.data.user.permissions).toEqual([]);
    expect(user?.role).toBe("creator");
  });

  it("rejects duplicate email registration", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const code = await requestEmailCode("test@example.com");
    const request = (nextCode = code) =>
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "Strong123",
          name: "测试用户",
          code: nextCode
        })
      });

    await POST(request());
    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain("邮箱已注册");
  });

  it("rejects registration with a missing or expired email code", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "Strong123",
          name: "测试用户",
          code: "000000"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toContain("邮箱验证码");
  });

  it("logs in with email and password", async () => {
    const register = await import("@/app/api/auth/register/route");
    const login = await import("@/app/api/auth/login/route");
    const code = await requestEmailCode("test@example.com");

    await register.POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "Strong123",
          name: "测试用户",
          code
        })
      })
    );

    const response = await login.POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          type: "email",
          email: "test@example.com",
          password: "Strong123"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.user.email).toBe("test@example.com");
  });

  it("requests and consumes a phone code", async () => {
    const phoneCode = await import("@/app/api/auth/phone-code/route");
    const login = await import("@/app/api/auth/login/route");

    const codeResponse = await phoneCode.POST(
      new Request("http://localhost/api/auth/phone-code", {
        method: "POST",
        body: JSON.stringify({ phone: "13900000000" })
      })
    );
    const codePayload = await codeResponse.json();

    expect(codeResponse.status).toBe(200);
    expect(codePayload.data.debugCode).toBe("246810");

    const loginResponse = await login.POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          type: "phone",
          phone: "13900000000",
          code: codePayload.data.debugCode
        })
      })
    );
    const loginPayload = await loginResponse.json();

    expect(loginResponse.status).toBe(200);
    expect(loginPayload.data.user.phone).toBe("13900000000");
  });

  it("logs out by clearing the session cookie", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.cookie).toBe(sessionCookieName());
  });

  it("returns the current session user without exposing password hash", async () => {
    const { createSession, hashPassword } = await import("@/lib/auth");
    const { GET } = await import("@/app/api/auth/me/route");
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        passwordHash: await hashPassword("Strong123"),
        name: "测试用户"
      }
    });

    await createSession(user.id);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.user.email).toBe("test@example.com");
    expect(payload.data.user.passwordHash).toBeUndefined();
  });
});
