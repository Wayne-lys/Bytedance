import { z } from "zod";
import { createMaterial, listMaterials } from "@/features/materials/material-service";
import { requirePermission } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

const materialSchema = z.object({
  name: z.string().min(1, "请输入素材名称"),
  type: z.string().min(1, "请输入文件类型"),
  size: z.number().int().positive("素材大小必须大于 0"),
  url: z.string().optional()
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1, "素材 ID 无效")).min(1, "请选择要删除的素材")
});

export async function GET() {
  const materials = await listMaterials();

  return jsonOk({ materials });
}

export async function POST(request: Request) {
  const authorization = await requirePermission("manage_materials");

  if (!authorization.ok) {
    return authorization.response;
  }

  const input = materialSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "素材信息无效", 422);
  }

  const material = await createMaterial({
    ownerId: authorization.user.id,
    ...input.data
  });

  return jsonOk({ material });
}

export async function DELETE(request: Request) {
  const authorization = await requirePermission("manage_materials");

  if (!authorization.ok) {
    return authorization.response;
  }

  const input = bulkDeleteSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "素材参数无效", 422);
  }

  const ids = Array.from(new Set(input.data.ids));
  const existing = await listMaterials();
  const existingIds = new Set(existing.map((material) => material.id));
  const deletableIds = ids.filter((id) => existingIds.has(id));

  if (deletableIds.length === 0) {
    return jsonError("素材不存在或已删除。", 404);
  }

  const result = await prisma.material.deleteMany({
    where: { id: { in: deletableIds } }
  });

  return jsonOk({
    deletedIds: deletableIds,
    deletedCount: result.count
  });
}
