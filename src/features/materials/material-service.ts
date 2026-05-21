import { prisma } from "@/lib/db";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
const riskyFilenameWords = ["加微信", "私聊", "扫码", "进群", "博彩", "下注"];
const maxDemoFileSize = 5 * 1024 * 1024;

export type MaterialComplianceInput = {
  name: string;
  type: string;
  size: number;
};

export type MaterialComplianceResult = {
  compliance: "safe" | "warning" | "blocked";
  riskReason: string | null;
};

export type CreateMaterialInput = MaterialComplianceInput & {
  ownerId: string;
  url?: string;
};

export function evaluateMaterialCompliance(
  input: MaterialComplianceInput
): MaterialComplianceResult {
  if (!allowedTypes.has(input.type)) {
    return {
      compliance: "blocked",
      riskReason: "文件类型不支持，仅允许 JPG、PNG、WebP 或 SVG 图片。"
    };
  }

  if (input.size > maxDemoFileSize) {
    return {
      compliance: "blocked",
      riskReason: "文件大小超过 5MB 演示限制。"
    };
  }

  const riskyWord = riskyFilenameWords.find((word) => input.name.includes(word));

  if (riskyWord) {
    return {
      compliance: "warning",
      riskReason: `文件名包含可能导流或高风险词：${riskyWord}`
    };
  }

  return {
    compliance: "safe",
    riskReason: null
  };
}

export async function listMaterials() {
  return prisma.material.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function createMaterial(input: CreateMaterialInput) {
  const result = evaluateMaterialCompliance(input);

  return prisma.material.create({
    data: {
      ownerId: input.ownerId,
      name: input.name,
      type: "image",
      url: input.url ?? "/demo-materials/weekend-list.svg",
      compliance: result.compliance,
      riskReason: result.riskReason
    }
  });
}
