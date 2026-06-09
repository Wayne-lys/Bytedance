import { CreationStudio } from "@/app/(workspace)/create/creation-studio";
import { hasPermissionAsync } from "@/features/auth/role-service";
import { getLatestDraft } from "@/features/drafts/draft-service";
import { listMaterials } from "@/features/materials/material-service";
import { getPostDetail } from "@/features/posts/post-service";
import { listPromptTemplates } from "@/features/prompts/prompt-service";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type CreatePageProps = {
  searchParams?: {
    draftId?: string;
    postId?: string;
  };
};

type InitialDraft = {
  id?: string;
  coverUrl?: string | null;
  topic?: string;
  audience?: string;
  platform?: string;
  style?: string;
  title?: string;
  body?: string;
  tags?: string;
};

function draftFromRecord(
  record:
    | (Omit<InitialDraft, "topic" | "audience" | "platform" | "style"> & {
        topic?: string | null;
        audience?: string | null;
        platform?: string | null;
        style?: string | null;
      })
    | null
    | undefined
): InitialDraft | null {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    topic: record.topic ?? "",
    audience: record.audience ?? "",
    platform: record.platform ?? "头条",
    style: record.style ?? "真实、具体、信息密度高",
    title: record.title ?? "",
    body: record.body ?? "",
    tags: record.tags ?? "",
    coverUrl: record.coverUrl ?? null
  };
}

export default async function CreatePage({ searchParams }: CreatePageProps) {
  const prompts = await listPromptTemplates();
  const materials = await listMaterials();
  const currentUser = await getCurrentUser();
  const canReviewContent = await hasPermissionAsync(currentUser?.role, "review_content");
  let initialDraft: InitialDraft | null = null;
  let editingPostId: string | null = null;

  if (searchParams?.postId) {
    const post = await getPostDetail(searchParams.postId);

    if (post && (canReviewContent || post.author.id === currentUser?.id)) {
      editingPostId = post.id;
      initialDraft = {
        title: post.title,
        body: post.body,
        tags: post.tags.join(","),
        platform: "头条",
        coverUrl: post.coverUrl ?? null
      };
    }
  } else if (currentUser && searchParams?.draftId) {
    const draft = await prisma.draft.findFirst({
      where: {
        id: searchParams.draftId,
        authorId: currentUser.id
      }
    });

    initialDraft = draftFromRecord(draft);
  } else if (currentUser) {
    initialDraft = draftFromRecord(await getLatestDraft(currentUser.id));
  }

  return (
    <CreationStudio
      prompts={prompts}
      materials={materials}
      canReviewContent={canReviewContent}
      initialDraft={initialDraft}
      editingPostId={editingPostId}
    />
  );
}
