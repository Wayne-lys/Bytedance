import { prisma } from "@/lib/db";

export type RankingType = "hot" | "latest" | "recommended";

export type RankingScoreInput = {
  qualityScore: number;
  heatScore: number;
  freshnessScore: number;
  feedbackScore: number;
  riskPenalty: number;
};

export type RankingSourceItem = RankingScoreInput & {
  postId: string;
  title: string;
  body?: string;
  coverUrl?: string | null;
  tags?: string[];
  publishedAt: Date | string | null;
  authorName?: string;
  views?: number;
  likes?: number;
  saves?: number;
};

export type RankedItem = RankingSourceItem & {
  rankingScore: number;
  explanation: {
    qualityContribution: number;
    heatContribution: number;
    freshnessContribution: number;
    feedbackContribution: number;
    riskPenalty: number;
  };
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function roundScore(score: number) {
  return Math.round(score * 10) / 10;
}

function parseTags(tags: string | null | undefined) {
  return (tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function deriveHeatScore(metric: {
  views: number;
  likes: number;
  saves: number;
  heatScore: number;
}) {
  if (metric.heatScore > 0) {
    return metric.heatScore;
  }

  return clampScore(metric.views * 0.03 + metric.likes * 0.35 + metric.saves * 0.25);
}

function deriveFreshnessScore(publishedAt: Date | null, storedScore: number) {
  if (storedScore > 0) {
    return storedScore;
  }

  if (!publishedAt) {
    return 0;
  }

  const ageMs = Date.now() - publishedAt.getTime();
  const ageDays = Math.max(0, ageMs / 86_400_000);

  return clampScore(100 - ageDays * 12);
}

function deriveRiskPenalty(riskLevel: string | undefined, storedPenalty: number) {
  if (storedPenalty > 0) {
    return storedPenalty;
  }

  if (riskLevel === "high") {
    return 100;
  }

  if (riskLevel === "medium") {
    return 25;
  }

  if (riskLevel === "low") {
    return 10;
  }

  return 0;
}

export function calculateRankingScore(input: RankingScoreInput) {
  const explanation = {
    qualityContribution: roundScore(input.qualityScore * 0.75),
    heatContribution: 0,
    freshnessContribution: roundScore(input.freshnessScore * 0.25),
    feedbackContribution: 0,
    riskPenalty: roundScore(input.riskPenalty)
  };

  const rankingScore = roundScore(
    explanation.qualityContribution +
      explanation.heatContribution +
      explanation.freshnessContribution +
      explanation.feedbackContribution -
      explanation.riskPenalty
  );

  return {
    rankingScore,
    explanation
  };
}

export function rankItems(items: RankingSourceItem[]) {
  return items
    .map((item) => ({
      ...item,
      ...calculateRankingScore(item)
    }))
    .sort((left, right) => {
      if (right.rankingScore !== left.rankingScore) {
        return right.rankingScore - left.rankingScore;
      }

      const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
      const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return left.postId.localeCompare(right.postId);
    });
}

export function rankHotItems(items: RankingSourceItem[]) {
  return rankItems(items).sort((left, right) => {
    const rightViews = right.views ?? 0;
    const leftViews = left.views ?? 0;

    if (rightViews !== leftViews) {
      return rightViews - leftViews;
    }

    if (right.rankingScore !== left.rankingScore) {
      return right.rankingScore - left.rankingScore;
    }

    const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
    const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.postId.localeCompare(right.postId);
  });
}

export function rankLatestItems(items: RankingSourceItem[]) {
  return rankItems(items).sort((left, right) => {
    const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
    const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.postId.localeCompare(right.postId);
  });
}

export function paginateRankings(
  items: RankedItem[],
  {
    cursor,
    limit
  }: {
    cursor?: string | null;
    limit: number;
  }
) {
  const startIndex = cursor
    ? Math.max(
        0,
        items.findIndex((item) => item.postId === cursor) + 1
      )
    : 0;
  const pageItems = items.slice(startIndex, startIndex + limit);
  const nextCursor =
    startIndex + limit < items.length && pageItems.length > 0
      ? pageItems[pageItems.length - 1].postId
      : null;

  return {
    items: pageItems,
    nextCursor
  };
}

export async function getRankingItems({
  type,
  cursor,
  limit
}: {
  type: RankingType;
  cursor?: string | null;
  limit: number;
}) {
  const posts = await prisma.post.findMany({
    where: { status: "published" },
    include: {
      author: {
        select: { name: true }
      },
      qualityScore: true,
      moderationResult: true,
      rankingMetric: true
    }
  });

  const sources = posts.map((post): RankingSourceItem => {
    const metric = post.rankingMetric ?? {
      views: 0,
      likes: 0,
      saves: 0,
      feedbackScore: 0,
      heatScore: 0,
      freshnessScore: 0,
      riskPenalty: 0
    };
    const heatScore = deriveHeatScore(metric);
    const freshnessScore = deriveFreshnessScore(
      post.publishedAt,
      metric.freshnessScore
    );
    const riskPenalty = deriveRiskPenalty(
      post.moderationResult?.riskLevel,
      metric.riskPenalty
    );

    return {
      postId: post.id,
      title: post.title,
      body: post.body,
      coverUrl: post.coverUrl,
      tags: parseTags(post.tags),
      publishedAt: post.publishedAt,
      authorName: post.author.name,
      qualityScore: post.qualityScore?.total ?? 0,
      heatScore,
      freshnessScore,
      feedbackScore: metric.feedbackScore,
      riskPenalty,
      views: metric.views,
      likes: metric.likes,
      saves: metric.saves
    };
  });

  const ranked =
    type === "hot"
      ? rankHotItems(sources)
      : type === "latest"
        ? rankLatestItems(sources)
        : rankItems(sources);

  return {
    type,
    ...paginateRankings(ranked, { cursor, limit })
  };
}
