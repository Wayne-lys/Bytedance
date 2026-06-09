import { describe, expect, it } from "vitest";
import {
  calculateRankingScore,
  paginateRankings,
  rankLatestItems,
  rankItems
} from "@/features/ranking/ranking-service";

const basePublishedAt = new Date("2026-05-29T08:00:00.000Z");

describe("ranking service", () => {
  it("calculates weighted ranking score with contribution explanation", () => {
    const result = calculateRankingScore({
      qualityScore: 80,
      heatScore: 70,
      freshnessScore: 60,
      feedbackScore: 50,
      riskPenalty: 4
    });

    expect(result.rankingScore).toBe(67);
    expect(result.explanation).toEqual({
      qualityContribution: 36,
      heatContribution: 21,
      freshnessContribution: 9,
      feedbackContribution: 5,
      riskPenalty: 4
    });
  });

  it("lets real heat and user feedback lift recommended content", () => {
    const ranked = rankItems([
      {
        postId: "high-quality-quiet",
        title: "高质量但低互动",
        publishedAt: basePublishedAt,
        qualityScore: 90,
        heatScore: 10,
        freshnessScore: 60,
        feedbackScore: 5,
        riskPenalty: 0
      },
      {
        postId: "active-reader-choice",
        title: "读者反馈强的内容",
        publishedAt: basePublishedAt,
        qualityScore: 75,
        heatScore: 100,
        freshnessScore: 90,
        feedbackScore: 100,
        riskPenalty: 0
      }
    ]);

    expect(ranked.map((item) => item.postId)).toEqual([
      "active-reader-choice",
      "high-quality-quiet"
    ]);
    expect(ranked[0].explanation.feedbackContribution).toBeGreaterThan(
      ranked[1].explanation.feedbackContribution
    );
  });

  it("sorts by ranking score, then freshness, then stable id", () => {
    const ranked = rankItems([
      {
        postId: "post-c",
        title: "同分旧内容",
        publishedAt: new Date("2026-05-27T08:00:00.000Z"),
        qualityScore: 80,
        heatScore: 70,
        freshnessScore: 60,
        feedbackScore: 50,
        riskPenalty: 4
      },
      {
        postId: "post-a",
        title: "高分内容",
        publishedAt: basePublishedAt,
        qualityScore: 90,
        heatScore: 85,
        freshnessScore: 80,
        feedbackScore: 70,
        riskPenalty: 0
      },
      {
        postId: "post-b",
        title: "同分新内容",
        publishedAt: new Date("2026-05-28T08:00:00.000Z"),
        qualityScore: 80,
        heatScore: 70,
        freshnessScore: 60,
        feedbackScore: 50,
        riskPenalty: 4
      }
    ]);

    expect(ranked.map((item) => item.postId)).toEqual(["post-a", "post-b", "post-c"]);
  });

  it("sorts latest items by publish time before ranking score", () => {
    const ranked = rankLatestItems([
      {
        postId: "post-high-score",
        title: "高分旧内容",
        publishedAt: new Date("2026-05-27T08:00:00.000Z"),
        qualityScore: 95,
        heatScore: 90,
        freshnessScore: 80,
        feedbackScore: 70,
        riskPenalty: 0
      },
      {
        postId: "post-low-score",
        title: "低分新内容",
        publishedAt: new Date("2026-05-29T08:00:00.000Z"),
        qualityScore: 60,
        heatScore: 50,
        freshnessScore: 40,
        feedbackScore: 30,
        riskPenalty: 0
      }
    ]);

    expect(ranked.map((item) => item.postId)).toEqual([
      "post-low-score",
      "post-high-score"
    ]);
  });

  it("paginates ranked items with next cursor", () => {
    const ranked = rankItems([
      {
        postId: "post-1",
        title: "第一篇",
        publishedAt: basePublishedAt,
        qualityScore: 95,
        heatScore: 90,
        freshnessScore: 80,
        feedbackScore: 70,
        riskPenalty: 0
      },
      {
        postId: "post-2",
        title: "第二篇",
        publishedAt: basePublishedAt,
        qualityScore: 85,
        heatScore: 80,
        freshnessScore: 70,
        feedbackScore: 60,
        riskPenalty: 0
      },
      {
        postId: "post-3",
        title: "第三篇",
        publishedAt: basePublishedAt,
        qualityScore: 75,
        heatScore: 70,
        freshnessScore: 60,
        feedbackScore: 50,
        riskPenalty: 0
      }
    ]);

    const firstPage = paginateRankings(ranked, { limit: 2 });
    expect(firstPage.items.map((item) => item.postId)).toEqual(["post-1", "post-2"]);
    expect(firstPage.nextCursor).toBe("post-2");

    const secondPage = paginateRankings(ranked, {
      cursor: firstPage.nextCursor,
      limit: 2
    });
    expect(secondPage.items.map((item) => item.postId)).toEqual(["post-3"]);
    expect(secondPage.nextCursor).toBeNull();
  });
});
