import { z } from "zod";
import {
  createVerificationCode,
  hashVerificationCode
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { sendEmailVerificationCode } from "@/features/verification/providers";

const emailCodeSchema = z.object({
  email: z.string().email("请输入有效邮箱")
});

export async function POST(request: Request) {
  const input = emailCodeSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "邮箱无效", 422);
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.data.email }
  });

  if (existing) {
    return jsonError("邮箱已注册", 409);
  }

  const code = createVerificationCode();
  let delivery: Awaited<ReturnType<typeof sendEmailVerificationCode>>;

  try {
    delivery = await sendEmailVerificationCode({
      email: input.data.email,
      code
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? `邮箱验证码发送失败：${error.message}`
        : "邮箱验证码发送失败",
      502
    );
  }

  await prisma.emailCode.create({
    data: {
      email: input.data.email,
      code: hashVerificationCode({
        channel: "email",
        target: input.data.email,
        code
      }),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    }
  });

  return jsonOk({
    email: input.data.email,
    provider: delivery.provider,
    debugCode: delivery.debugCode,
    expiresInSeconds: 300
  });
}
