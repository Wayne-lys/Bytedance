import { z } from "zod";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

const emailLoginSchema = z.object({
  type: z.literal("email"),
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(1, "请输入密码")
});

const phoneLoginSchema = z.object({
  type: z.literal("phone"),
  phone: z.string().regex(/^1\d{10}$/, "请输入有效手机号"),
  code: z.string().length(6, "请输入 6 位验证码")
});

const loginSchema = z.discriminatedUnion("type", [
  emailLoginSchema,
  phoneLoginSchema
]);

export async function POST(request: Request) {
  const input = loginSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "登录信息无效", 422);
  }

  if (input.data.type === "email") {
    const user = await prisma.user.findUnique({
      where: { email: input.data.email }
    });

    if (!user || !user.passwordHash) {
      return jsonError("账号不存在", 404);
    }

    const passwordOk = await verifyPassword(
      input.data.password,
      user.passwordHash
    );

    if (!passwordOk) {
      return jsonError("密码错误", 401);
    }

    await createSession(user.id);

    return jsonOk({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name
      }
    });
  }

  const phoneCode = await prisma.phoneCode.findFirst({
    where: {
      phone: input.data.phone,
      code: input.data.code,
      consumed: false,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!phoneCode) {
    return jsonError("验证码错误或已过期", 401);
  }

  const user = await prisma.user.upsert({
    where: { phone: input.data.phone },
    update: {},
    create: {
      phone: input.data.phone,
      name: `手机用户 ${input.data.phone.slice(-4)}`
    }
  });

  await prisma.phoneCode.update({
    where: { id: phoneCode.id },
    data: { consumed: true, userId: user.id }
  });

  await createSession(user.id);

  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name
    }
  });
}
