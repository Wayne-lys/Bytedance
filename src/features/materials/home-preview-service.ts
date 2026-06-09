import { prisma } from "@/lib/db";

export async function getHomePreviewMaterial() {
  return prisma.material.findFirst({
    where: {
      type: "image",
      compliance: { not: "blocked" }
    },
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" }
    ],
    select: {
      id: true,
      name: true,
      url: true,
      compliance: true,
      referenceCount: true
    }
  });
}
