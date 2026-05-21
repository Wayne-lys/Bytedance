import { prisma } from "@/lib/db";

export type CreatePromptTemplateInput = {
  ownerId?: string;
  name: string;
  scenario: string;
  content: string;
  variables: string;
};

export async function listPromptTemplates() {
  return prisma.promptTemplate.findMany({
    where: { enabled: true },
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
