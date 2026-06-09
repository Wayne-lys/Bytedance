import { prisma } from "@/lib/db";

export type CreatePromptTemplateInput = {
  ownerId?: string;
  name: string;
  scenario: string;
  content: string;
  variables: string;
};

export type UpdatePromptTemplateInput = Omit<CreatePromptTemplateInput, "ownerId">;

export async function listPromptTemplates({ query = "" }: { query?: string } = {}) {
  const keyword = query.trim();

  return prisma.promptTemplate.findMany({
    where: {
      enabled: true,
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { scenario: { contains: keyword } },
              { content: { contains: keyword } },
              { variables: { contains: keyword } }
            ]
          }
        : {})
    },
    orderBy: [{ scenario: "asc" }, { createdAt: "desc" }]
  });
}

export async function createPromptTemplate(input: CreatePromptTemplateInput) {
  return prisma.promptTemplate.create({
    data: {
      ownerId: input.ownerId,
      name: input.name,
      scenario: input.scenario,
      content: input.content,
      variables: input.variables,
      enabled: true
    }
  });
}

export async function updatePromptTemplate(
  id: string,
  input: UpdatePromptTemplateInput
) {
  const prompt = await prisma.promptTemplate.findUnique({
    where: { id }
  });

  if (!prompt || !prompt.enabled) {
    return null;
  }

  return prisma.promptTemplate.update({
    where: { id },
    data: input
  });
}

export async function deletePromptTemplate(id: string) {
  const prompt = await prisma.promptTemplate.findUnique({
    where: { id }
  });

  if (!prompt || !prompt.enabled) {
    return null;
  }

  return prisma.promptTemplate.update({
    where: { id },
    data: { enabled: false }
  });
}
