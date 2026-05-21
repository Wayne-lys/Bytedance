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
  await prisma.phoneCode.deleteMany();
  await prisma.user.deleteMany({
    where: {
      OR: [{ email: "test@example.com" }, { phone: "13900000000" }]
    }
  });
}

describe("auth api", () => {
  beforeEach(async () => {
    await cleanAuthData();
  });

  it("registers a user with email and password", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "Strong123",
          name: "测试用户"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.user.email).toBe("test@example.com");
    expect(payload.data.user.passwordHash).toBeUndefined();
  });

  it("rejects duplicate email registration", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const request = () =>
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "Strong123",
          name: "测试用户"
        })
      });

    await POST(request());
    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain("邮箱已注册");
  });

  it("logs in with email and password", async () => {
    const register = await import("@/app/api/auth/register/route");
    const login = await import("@/app/api/auth/login/route");

    await register.POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "Strong123",
          name: "测试用户"
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
    expect(codePayload.data.code).toBe("246810");

    const loginResponse = await login.POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          type: "phone",
          phone: "13900000000",
          code: codePayload.data.code
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
});
