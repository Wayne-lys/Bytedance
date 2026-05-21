import { z } from "zod";
import { createPhoneCode } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

const phoneCodeSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/, "请输入有效手机号")
});

export async function POST(request: Request) {
  const input = phoneCodeSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "手机号无效", 422);
  }

  const code = createPhoneCode();

  await prisma.phoneCode.create({
    data: {
      phone: input.data.phone,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    }
  });

  return jsonOk({
    phone: input.data.phone,
    code,
    expiresInSeconds: 300
  });
}
