import { z } from "zod";
import {
  createPromptTemplate,
  listPromptTemplates
} from "@/features/prompts/prompt-service";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

const promptSchema = z.object({
  name: z.string().min(1, "请输入模板名称"),
  scenario: z.string().min(1, "请输入场景"),
  content: z.string().min(8, "Prompt 内容过短"),
  variables: z.string().min(1, "请输入变量")
});

async function getDemoOwnerId() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" }
  });

  return user?.id;
}

export async function GET() {
  const prompts = await listPromptTemplates();

  return jsonOk({ prompts });
}

export async function POST(request: Request) {
  const input = promptSchema.safeParse(await request.json());

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
