import {
  deletePromptTemplate,
  updatePromptTemplate
} from "@/features/prompts/prompt-service";
import { promptTemplateSchema } from "@/features/prompts/prompt-schema";
import { jsonError, jsonOk } from "@/lib/http";

type PromptRouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: PromptRouteContext) {
  const input = promptTemplateSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "Prompt 模板无效", 422);
  }

  const prompt = await updatePromptTemplate(params.id, input.data);

  if (!prompt) {
    return jsonError("Prompt 模板不存在或已删除", 404);
  }

  return jsonOk({ prompt });
}

export async function DELETE(_request: Request, { params }: PromptRouteContext) {
  const prompt = await deletePromptTemplate(params.id);

  if (!prompt) {
    return jsonError("Prompt 模板不存在或已删除", 404);
  }

  return jsonOk({ prompt });
}
