import { z } from "zod";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

const registerSchema = z.object({
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(8, "密码至少 8 位"),
  name: z.string().min(1, "请输入昵称")
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

  const user = await prisma.user.create({
    data: {
      email: input.data.email,
      passwordHash: await hashPassword(input.data.password),
      name: input.data.name
    },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      createdAt: true
    }
  });

  await createSession(user.id);

  return jsonOk({ user });
}
