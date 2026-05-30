import { Prisma } from "@prisma/client";
import { reviewAndScoreContent } from "@/features/moderation/moderation-service";
import { prisma } from "@/lib/db";

export type PostInput = {
  title: string;
  body: string;
  tags: string[] | string;
  coverUrl?: string | null;
  platform?: string;
  draftId?: string;
};

export class PublishBlockedError extends Error {
  constructor(
    message: string,
    public readonly review: ReturnType<typeof reviewAndScoreContent>
  ) {
    super(message);
    this.name = "PublishBlockedError";
  }
}

function parseTags(tags: string[] | string | null | undefined) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.trim()).filter(Boolean);
  }

  return (tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function storedTags(tags: string[] | string | null | undefined) {
  return parseTags(tags).join(",");
}

function assertPublishAllowed(review: ReturnType<typeof reviewAndScoreContent>) {
  if (review.moderation.riskLevel === "high") {
    throw new PublishBlockedError("高危内容已被拦截，无法发布。", review);
  }

  if (review.moderation.riskLevel === "medium") {
    throw new PublishBlockedError("内容需要改写或人工复核后才能发布。", review);
  }
}

const postInclude = {
  author: {
    select: {
      id: true,
      name: true,
      avatarUrl: true
    }
  },
  moderationResult: true,
  qualityScore: true,
  rankingMetric: true
} satisfies Prisma.PostInclude;

export async function getPublishingAuthor() {
  const creator = await prisma.user.findUnique({
    where: { email: "creator@example.com" }
  });

  if (creator) {
    return creator;
  }

  return prisma.user.findFirst({
    orderBy: { createdAt: "asc" }
  });
}

async function inputFromDraft(authorId: string, input: PostInput) {
  if (!input.draftId) {
    return input;
  }

  const draft = await prisma.draft.findFirst({
    where: {
      id: input.draftId,
      authorId
    }
  });

  if (!draft) {
    return input;
  }

  return {
    title: input.title || draft.title,
    body: input.body || draft.body,
    tags: input.tags || draft.tags,
    coverUrl: input.coverUrl ?? draft.coverUrl,
    platform: input.platform ?? draft.platform ?? "头条"
  };
}

function createReview(input: PostInput) {
  const tags = parseTags(input.tags);

  return reviewAndScoreContent({
    title: input.title,
    body: input.body,
    tags,
    platform: input.platform ?? "头条"
  });
}

async function writeReview(postId: string, review: ReturnType<typeof reviewAndScoreContent>) {
  await prisma.moderationResult.upsert({
    where: { postId },
    update: {
      riskLevel: review.moderation.riskLevel,
      riskTypes: review.moderation.riskTypes.join(","),
      matchedRules: JSON.stringify(review.moderation.matchedRules),
      reason: review.moderation.reason,
      suggestedAction: review.moderation.suggestedAction,
      provider: "local-rules"
    },
    create: {
      postId,
      riskLevel: review.moderation.riskLevel,
      riskTypes: review.moderation.riskTypes.join(","),
      matchedRules: JSON.stringify(review.moderation.matchedRules),
      reason: review.moderation.reason,
      suggestedAction: review.moderation.suggestedAction,
      provider: "local-rules"
    }
  });

  await prisma.qualityScore.upsert({
    where: { postId },
    update: review.quality,
    create: {
      postId,
      ...review.quality
    }
  });
}

export function serializePost<
  T extends Prisma.PostGetPayload<{ include: typeof postInclude }>
>(post: T) {
  return {
    ...post,
    tags: parseTags(post.tags),
    qualitySummary: post.qualityScore
      ? {
          originality: post.qualityScore.originality,
          structure: post.qualityScore.structure,
          informationDensity: post.qualityScore.informationDensity,
          clarity: post.qualityScore.clarity,
          interactionPotential: post.qualityScore.interactionPotential,
          platformFit: post.qualityScore.platformFit,
          total: post.qualityScore.total
        }
      : null
  };
}

export async function publishPost(input: PostInput) {
  const author = await getPublishingAuthor();

  if (!author) {
    throw new Error("缺少演示用户，请先运行 seed。");
  }

  const resolvedInput = await inputFromDraft(author.id, input);
  const review = createReview(resolvedInput);

  assertPublishAllowed(review);

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        authorId: author.id,
        title: resolvedInput.title,
        coverUrl: resolvedInput.coverUrl ?? null,
        body: resolvedInput.body,
        tags: storedTags(resolvedInput.tags),
        status: "published",
        publishedAt: new Date()
      }
    });

    await tx.moderationResult.create({
      data: {
        postId: created.id,
        riskLevel: review.moderation.riskLevel,
        riskTypes: review.moderation.riskTypes.join(","),
        matchedRules: JSON.stringify(review.moderation.matchedRules),
        reason: review.moderation.reason,
        suggestedAction: review.moderation.suggestedAction,
        provider: "local-rules"
      }
    });

    await tx.qualityScore.create({
      data: {
        postId: created.id,
        ...review.quality
      }
    });

    return tx.post.findUniqueOrThrow({
      where: { id: created.id },
      include: postInclude
    });
  });

  return serializePost(post);
}

export async function listPosts(status?: string | null) {
  const posts = await prisma.post.findMany({
    where: status ? { status } : undefined,
    include: postInclude,
    orderBy: { updatedAt: "desc" }
  });

  return posts.map(serializePost);
}

export async function getPostDetail(id: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: postInclude
  });

  return post ? serializePost(post) : null;
}

export async function updatePost(id: string, input: PostInput) {
  const existing = await prisma.post.findUnique({
    where: { id }
  });

  if (!existing) {
    return null;
  }

  const review = createReview(input);
  const nextStatus =
    review.moderation.riskLevel === "high" || review.moderation.riskLevel === "medium"
      ? "rejected"
      : "published";

  const post = await prisma.post.update({
    where: { id },
    data: {
      title: input.title,
      body: input.body,
      tags: storedTags(input.tags),
      coverUrl: input.coverUrl ?? existing.coverUrl,
      status: nextStatus,
      publishedAt:
        nextStatus === "published" ? (existing.publishedAt ?? new Date()) : existing.publishedAt
    },
    include: postInclude
  });

  await writeReview(id, review);

  const refreshed = await prisma.post.findUniqueOrThrow({
    where: { id: post.id },
    include: postInclude
  });

  return serializePost(refreshed);
}

export async function changePostDistributionStatus(
  id: string,
  action: "offline" | "withdraw" | "rollback"
) {
  const existing = await prisma.post.findUnique({
    where: { id }
  });

  if (!existing) {
    return null;
  }

  const nextStatus =
    action === "offline" ? "offline" : action === "withdraw" ? "withdrawn" : "published";
  const post = await prisma.post.update({
    where: { id },
    data: {
      status: nextStatus,
      publishedAt:
        nextStatus === "published" ? (existing.publishedAt ?? new Date()) : existing.publishedAt
    },
    include: postInclude
  });

  return serializePost(post);
}

export function publishBlockPayload(error: PublishBlockedError) {
  return {
    moderation: error.review.moderation,
    quality: error.review.quality
  };
}
