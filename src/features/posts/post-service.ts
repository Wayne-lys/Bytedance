import { Prisma } from "@prisma/client";
import {
  reviewAndScoreContent,
  verifyReviewToken
} from "@/features/moderation/moderation-service";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type PostInput = {
  title: string;
  body: string;
  tags: string[] | string;
  coverUrl?: string | null;
  platform?: string;
  draftId?: string;
  materialIds?: string[];
  reviewToken?: string;
};

type ContentReview = Awaited<ReturnType<typeof reviewAndScoreContent>>;

export class PublishBlockedError extends Error {
  constructor(
    message: string,
    public readonly review: ContentReview
  ) {
    super(message);
    this.name = "PublishBlockedError";
  }
}

export class PublishReviewRequiredError extends Error {
  constructor(message = "请先审核内容，通过后再发布。") {
    super(message);
    this.name = "PublishReviewRequiredError";
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

function assertPublishAllowed(review: ContentReview) {
  if (review.moderation.riskLevel === "high") {
    throw new PublishBlockedError("高危内容已被拦截，无法发布。", review);
  }

  if (review.moderation.riskLevel === "medium") {
    throw new PublishBlockedError("内容需要改写或人工复核后才能发布。", review);
  }
}

function reviewInputFromPost(input: PostInput) {
  return {
    title: input.title,
    body: input.body,
    tags: parseTags(input.tags),
    platform: input.platform ?? "头条"
  };
}

function assertReviewedBeforePublish(input: PostInput, review: ContentReview) {
  if (
    !verifyReviewToken(
      reviewInputFromPost(input),
      review.moderation.riskLevel,
      input.reviewToken
    )
  ) {
    throw new PublishReviewRequiredError();
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
  rankingMetric: true,
  materials: {
    orderBy: { position: "asc" },
    include: {
      material: {
        select: {
          id: true,
          name: true,
          type: true,
          url: true,
          compliance: true,
          riskReason: true,
          referenceCount: true
        }
      }
    }
  }
} satisfies Prisma.PostInclude;

export async function getPublishingAuthor() {
  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> = null;

  try {
    currentUser = await getCurrentUser();
  } catch {
    currentUser = null;
  }

  if (currentUser) {
    return currentUser;
  }

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
    platform: input.platform ?? draft.platform ?? "头条",
    draftId: input.draftId,
    materialIds: input.materialIds ?? [],
    reviewToken: input.reviewToken
  };
}

async function createReview(input: PostInput) {
  return reviewAndScoreContent(reviewInputFromPost(input));
}

async function writeReview(postId: string, review: ContentReview) {
  await prisma.moderationResult.upsert({
    where: { postId },
    update: {
      riskLevel: review.moderation.riskLevel,
      riskTypes: review.moderation.riskTypes.join(","),
      matchedRules: JSON.stringify(review.moderation.matchedRules),
      reason: review.moderation.reason,
      suggestedAction: review.moderation.suggestedAction,
      provider: review.moderation.provider ?? "local-rules"
    },
    create: {
      postId,
      riskLevel: review.moderation.riskLevel,
      riskTypes: review.moderation.riskTypes.join(","),
      matchedRules: JSON.stringify(review.moderation.matchedRules),
      reason: review.moderation.reason,
      suggestedAction: review.moderation.suggestedAction,
      provider: review.moderation.provider ?? "local-rules"
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
    materials: post.materials.map((item) => ({
      ...item.material,
      position: item.position
    })),
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
  const review = await createReview(resolvedInput);

  assertReviewedBeforePublish(resolvedInput, review);
  assertPublishAllowed(review);
  const materialIds = Array.from(new Set(resolvedInput.materialIds ?? []));

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
        provider: review.moderation.provider ?? "local-rules"
      }
    });

    await tx.qualityScore.create({
      data: {
        postId: created.id,
        ...review.quality
      }
    });

    if (resolvedInput.draftId) {
      await tx.draft.updateMany({
        where: {
          id: resolvedInput.draftId,
          authorId: author.id
        },
        data: {
          status: "published",
          localState: "published"
        }
      });
    }

    if (materialIds.length > 0) {
      const allowedMaterials = await tx.material.findMany({
        where: {
          id: { in: materialIds },
          compliance: { not: "blocked" }
        },
        select: { id: true }
      });
      const allowedMaterialIds = new Set(allowedMaterials.map((material) => material.id));
      const linkedMaterialIds = materialIds.filter((id) => allowedMaterialIds.has(id));

      if (linkedMaterialIds.length > 0) {
        await tx.material.updateMany({
          where: {
            id: { in: linkedMaterialIds }
          },
          data: {
            referenceCount: { increment: 1 }
          }
        });
        await tx.postMaterial.createMany({
          data: linkedMaterialIds.map((materialId, position) => ({
            postId: created.id,
            materialId,
            position
          }))
        });
      }
    }

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

export async function getPostDetail(
  id: string,
  options: { incrementView?: boolean } = {}
) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: postInclude
  });

  if (!post) {
    return null;
  }

  if (!options.incrementView) {
    return serializePost(post);
  }

  const rankingMetric = await prisma.rankingMetric.upsert({
    where: { postId: id },
    update: {
      views: { increment: 1 }
    },
    create: {
      postId: id,
      views: 1
    }
  });

  return serializePost({
    ...post,
    rankingMetric
  });
}

export async function updatePost(id: string, input: PostInput) {
  const existing = await prisma.post.findUnique({
    where: { id }
  });

  if (!existing) {
    return null;
  }

  const review = await createReview(input);

  assertReviewedBeforePublish(input, review);
  assertPublishAllowed(review);

  const post = await prisma.post.update({
    where: { id },
    data: {
      title: input.title,
      body: input.body,
      tags: storedTags(input.tags),
      coverUrl: input.coverUrl ?? existing.coverUrl,
      status: "published",
      publishedAt: existing.publishedAt ?? new Date()
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
