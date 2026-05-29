import { evaluateSafetyCases } from "@/features/evaluation/evaluation-service";
import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/http";

export async function GET() {
  const cases = await prisma.evaluationCase.findMany({
    orderBy: { createdAt: "asc" }
  });

  return jsonOk(evaluateSafetyCases(cases));
}
