import { CreationStudio } from "@/app/(workspace)/create/creation-studio";
import { listPromptTemplates } from "@/features/prompts/prompt-service";

export default async function CreatePage() {
  const prompts = await listPromptTemplates();

  return <CreationStudio prompts={prompts} />;
}
