import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorization";
import { jsonError, jsonOk } from "@/lib/http";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authorization = await requirePermission("manage_materials");

  if (!authorization.ok) {
    return authorization.response;
  }

  const material = await prisma.material.findUnique({
    where: { id: params.id },
    select: { id: true }
  });

  if (!material) {
    return jsonError("素材不存在或已删除。", 404);
  }

  await prisma.material.delete({
    where: { id: params.id }
  });

  return jsonOk({ deletedId: params.id });
}
