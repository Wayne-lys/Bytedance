import { z } from "zod";
import { getLatestDraft, saveDraft } from "@/features/drafts/draft-service";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

const draftSchema = z.object({
  id: z.string().optional(),
  title: z.string().default(""),
  body: z.string().default(""),
  tags: z.string().default(""),
  coverUrl: z.string().nullable().optional(),
  topic: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  style: z.string().nullable().optional(),
  localState: z.string().optional()
});

async function getDemoAuthorId() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" }
  });

  return user?.id;
}

export async function GET(request: Request) {
  const authorId = await getDemoAuthorId();

  if (!authorId) {
    return jsonError("缺少演示用户，请先运行 seed。", 500);
  }

  const url = new URL(request.url);

  if (url.searchParams.get("latest") === "true") {
    const draft = await getLatestDraft(authorId);

    return jsonOk({ draft });
  }

  const drafts = await prisma.draft.findMany({
    where: { authorId },
    orderBy: { updatedAt: "desc" }
  });

  return jsonOk({ drafts });
}

export async function POST(request: Request) {
  const authorId = await getDemoAuthorId();

  if (!authorId) {
    return jsonError("缺少演示用户，请先运行 seed。", 500);
  }

  const input = draftSchema.safeParse(await request.json());

  if (!input.success) {
    return jsonError(input.error.issues[0]?.message ?? "草稿无效", 422);
  }

  const draft = await saveDraft({
    authorId,
    ...input.data
  });

  return jsonOk({ draft });
}
