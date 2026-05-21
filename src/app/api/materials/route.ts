import { z } from "zod";
import { createMaterial, listMaterials } from "@/features/materials/material-service";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

const materialSchema = z.object({
  name: z.string().min(1, "请输入素材名称"),
  type: z.string().min(1, "请输入文件类型"),
  size: z.number().int().positive("素材大小必须大于 0"),
  url: z.string().optional()
});

async function getDemoOwnerId() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" }
  });

  return user?.id;
}

export async function GET() {
  const materials = await listMaterials();

  return jsonOk({ materials });
}

export async function POST(request: Request) {
  const input = materialSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "素材信息无效", 422);
  }

  const ownerId = await getDemoOwnerId();

  if (!ownerId) {
    return jsonError("缺少演示用户，请先运行 seed。", 500);
  }

  const material = await createMaterial({
    ownerId,
    ...input.data
  });

  return jsonOk({ material });
}
