import { z } from "zod";
import {
  createSession,
  hashPassword,
  hashVerificationCode
} from "@/lib/auth";
import { serializeUserPermissions } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

const registerSchema = z.object({
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(8, "密码至少 8 位"),
  name: z.string().min(1, "请输入昵称"),
  code: z.string().length(6, "请输入 6 位邮箱验证码")
});

export async function POST(request: Request) {
  const input = registerSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "注册信息无效", 422);
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.data.email }
  });

  if (existing) {
    return jsonError("邮箱已注册", 409);
  }

  const emailCode = await prisma.emailCode.findFirst({
    where: {
      email: input.data.email,
      code: hashVerificationCode({
        channel: "email",
        target: input.data.email,
        code: input.data.code
      }),
      consumed: false,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!emailCode) {
    return jsonError("邮箱验证码错误或已过期", 401);
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.data.email,
        passwordHash: await hashPassword(input.data.password),
        name: input.data.name,
        role: "creator"
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    await tx.emailCode.update({
      where: { id: emailCode.id },
      data: { consumed: true, userId: created.id }
    });

    return created;
  });

  await createSession(user.id);

  return jsonOk({
    user: {
      ...user,
      ...(await serializeUserPermissions(user))
    }
  });
}
