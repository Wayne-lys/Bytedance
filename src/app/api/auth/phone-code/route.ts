import { z } from "zod";
import { createPhoneCode, hashVerificationCode } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import {
  isVolcSmsConfigured,
  sendSmsVerificationCode
} from "@/features/verification/providers";

const phoneCodeSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/, "请输入有效手机号")
});

export async function POST(request: Request) {
  const input = phoneCodeSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "手机号无效", 422);
  }

  const code = createPhoneCode();
  let delivery: Awaited<ReturnType<typeof sendSmsVerificationCode>>;

  try {
    delivery = await sendSmsVerificationCode({
      phone: input.data.phone,
      code
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? `短信验证码发送失败：${error.message}`
        : "短信验证码发送失败",
      502
    );
  }

  if (!isVolcSmsConfigured()) {
    await prisma.phoneCode.create({
      data: {
        phone: input.data.phone,
        code: hashVerificationCode({
          channel: "phone",
          target: input.data.phone,
          code
        }),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });
  }

  return jsonOk({
    phone: input.data.phone,
    provider: delivery.provider,
    debugCode: delivery.debugCode,
    expiresInSeconds: 300
  });
}
