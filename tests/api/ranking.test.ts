import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

async function cleanupRankingPosts() {
  const author = await prisma.user.findUnique({
    where: { email: "ranking-owner@example.com" }
  });

  if (!author) {
    return;
  }

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
}

async function seedRankingPosts() {
  const author = await prisma.user.upsert({
    where: { email: "ranking-owner@example.com" },
    update: { name: "榜单测试用户" },
    create: {
      email: "ranking-owner@example.com",
      name: "榜单测试用户"
    }
  });

  await cleanupRankingPosts();

  const posts = await Promise.all(
    [
      { title: "高质量低阅读清单", quality: 95, views: 10, likes: 220, saves: 80, feedback: 92 },
      { title: "高阅读咖啡清单", quality: 60, views: 5000, likes: 140, saves: 56, feedback: 80 },
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

  afterEach(async () => {
    await cleanupRankingPosts();
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
    expect(firstPayload.data.items[0].title).toBe("高阅读咖啡清单");
    expect(firstPayload.data.items[0].views).toBeGreaterThanOrEqual(
      firstPayload.data.items[1].views
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

  it("returns latest published posts by publish time instead of ranking score", async () => {
    const { GET } = await import("@/app/api/ranking/route");
    const latestPost = await prisma.post.findFirstOrThrow({
      where: { title: "低风险周末菜单" }
    });

    await prisma.post.update({
      where: { id: latestPost.id },
      data: { publishedAt: new Date("2099-06-01T08:00:00.000Z") }
    });

    const response = await GET(
      new Request("http://localhost/api/ranking?type=latest&limit=3")
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.type).toBe("latest");
    expect(payload.data.items[0].title).toBe("低风险周末菜单");
  });
});
