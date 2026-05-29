import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

async function seedRankingPosts() {
  const author = await prisma.user.upsert({
    where: { email: "ranking-owner@example.com" },
    update: { name: "榜单测试用户" },
    create: {
      email: "ranking-owner@example.com",
      name: "榜单测试用户"
    }
  });

  await prisma.rankingMetric.deleteMany({
    where: { post: { authorId: author.id } }
  });
  await prisma.qualityScore.deleteMany({
    where: { post: { authorId: author.id } }
  });
  await prisma.moderationResult.deleteMany({
    where: { post: { authorId: author.id } }
  });
  await prisma.post.deleteMany({
    where: { authorId: author.id }
  });

  const posts = await Promise.all(
    [
      { title: "高热度咖啡清单", quality: 88, views: 2000, likes: 220, saves: 80, feedback: 92 },
      { title: "稳定通勤整理术", quality: 82, views: 1200, likes: 140, saves: 56, feedback: 80 },
      { title: "低风险周末菜单", quality: 78, views: 900, likes: 96, saves: 42, feedback: 74 }
    ].map((item, index) =>
      prisma.post.create({
        data: {
          authorId: author.id,
          title: item.title,
          body: `${item.title} 的正文内容，覆盖图文消费场景。`,
          tags: "生活方式,清单",
          status: "published",
          publishedAt: new Date(`2026-05-2${9 - index}T08:00:00.000Z`),
          qualityScore: {
            create: {
              originality: item.quality,
              structure: item.quality,
              informationDensity: item.quality,
              clarity: item.quality,
              interactionPotential: item.quality,
              platformFit: item.quality,
              total: item.quality
            }
          },
          moderationResult: {
            create: {
              riskLevel: "safe",
              riskTypes: "none",
              matchedRules: "[]",
              reason: "测试安全内容",
              suggestedAction: "allow",
              provider: "test"
            }
          },
          rankingMetric: {
            create: {
              views: item.views,
              likes: item.likes,
              saves: item.saves,
              feedbackScore: item.feedback,
              heatScore: 0,
              freshnessScore: 0,
              riskPenalty: 0,
              rankingScore: 0
            }
          }
        }
      })
    )
  );

  return posts;
}

describe("ranking api", () => {
  beforeEach(async () => {
    await seedRankingPosts();
  });

  it("returns cursor-paginated ranking items with score explanation", async () => {
    const { GET } = await import("@/app/api/ranking/route");

    const firstResponse = await GET(
      new Request("http://localhost/api/ranking?type=hot&limit=2")
    );
    const firstPayload = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstPayload.data.items).toHaveLength(2);
    expect(firstPayload.data.nextCursor).toBeTruthy();
    expect(firstPayload.data.items[0].rankingScore).toBeGreaterThanOrEqual(
      firstPayload.data.items[1].rankingScore
    );
    expect(firstPayload.data.items[0].explanation.qualityContribution).toBeGreaterThan(0);

    const secondResponse = await GET(
      new Request(
        `http://localhost/api/ranking?type=hot&limit=2&cursor=${firstPayload.data.nextCursor}`
      )
    );
    const secondPayload = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondPayload.data.items.length).toBeGreaterThan(0);
    expect(secondPayload.data.items[0].postId).not.toBe(firstPayload.data.items[0].postId);
  });
});
