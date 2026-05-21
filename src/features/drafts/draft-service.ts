import { prisma } from "@/lib/db";

type DraftVersion = {
  version: number;
  updatedAt: Date;
};

export type DraftConflictPreference = "local" | "cloud" | "copy";

export function resolveDraftConflict({
  local,
  cloud,
  preference
}: {
  local: DraftVersion;
  cloud: DraftVersion;
  preference: DraftConflictPreference;
}) {
  const hasConflict =
    local.version !== cloud.version ||
    local.updatedAt.getTime() !== cloud.updatedAt.getTime();

  if (!hasConflict) {
    return { hasConflict: false, action: "sync" as const };
  }

  if (preference === "cloud") {
    return { hasConflict: true, action: "use-cloud" as const };
  }

  if (preference === "copy") {
    return { hasConflict: true, action: "create-copy" as const };
  }

  return { hasConflict: true, action: "use-local" as const };
}

export async function getLatestDraft(authorId: string) {
  return prisma.draft.findFirst({
    where: { authorId },
    orderBy: { updatedAt: "desc" }
  });
}

export async function saveDraft(input: {
  authorId: string;
  id?: string;
  title: string;
  body: string;
  tags: string;
  coverUrl?: string | null;
  topic?: string | null;
  audience?: string | null;
  platform?: string | null;
  style?: string | null;
  version?: number;
  localState?: string;
}) {
  if (input.id) {
    return prisma.draft.update({
      where: { id: input.id },
      data: {
        title: input.title,
        body: input.body,
        tags: input.tags,
        coverUrl: input.coverUrl,
        topic: input.topic,
        audience: input.audience,
        platform: input.platform,
        style: input.style,
        version: { increment: 1 },
        localState: input.localState ?? "synced"
      }
    });
  }

  return prisma.draft.create({
    data: {
      authorId: input.authorId,
      title: input.title,
      body: input.body,
      tags: input.tags,
      coverUrl: input.coverUrl,
      topic: input.topic,
      audience: input.audience,
      platform: input.platform,
      style: input.style,
      version: input.version ?? 1,
      localState: input.localState ?? "synced"
    }
  });
}
