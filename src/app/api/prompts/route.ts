import {
  createPromptTemplate,
  listPromptTemplates
} from "@/features/prompts/prompt-service";
import { promptTemplateSchema } from "@/features/prompts/prompt-schema";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

async function getDemoOwnerId() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" }
  });

  return user?.id;
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const prompts = await listPromptTemplates({ query });

  return jsonOk({ prompts });
}

export async function POST(request: Request) {
  const input = promptTemplateSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "Prompt 模板无效", 422);
  }

  const ownerId = await getDemoOwnerId();

  if (!ownerId) {
    return jsonError("缺少演示用户，请先运行 seed。", 500);
  }

  const prompt = await createPromptTemplate({
    ownerId,
    ...input.data
  });

  return jsonOk({ prompt });
}
