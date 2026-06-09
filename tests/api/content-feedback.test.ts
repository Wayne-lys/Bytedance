import { beforeEach, describe, expect, it } from "vitest";
import { getPostDetail } from "@/features/posts/post-service";
import { prisma } from "@/lib/db";

async function ensureFeedbackAuthor() {
  return prisma.user.upsert({
    where: { email: "feedback-owner@example.com" },
    update: { name: "反馈测试创作者" },
    create: {
      email: "feedback-owner@example.com",
      name: "反馈测试创作者"
    }
  });
}

async function resetFeedbackData() {
  const author = await ensureFeedbackAuthor();

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

  return author;
}

async function createFeedbackPost() {
  const author = await ensureFeedbackAuthor();

  return prisma.post.create({
    data: {
      authorId: author.id,
      title: "真实反馈测试内容",
      body: "读者点赞和评论后，推荐排序应该使用真实反馈数据。",
      tags: "反馈,推荐",
      status: "published",
      publishedAt: new Date("2026-06-09T08:00:00.000Z"),
      rankingMetric: {
        create: {
          views: 10,
          likes: 0,
          feedbackScore: 0
        }
      }
    }
  });
}

describe("content feedback api", () => {
  beforeEach(async () => {
    await resetFeedbackData();
  });

  it("increments likes and refreshes the real feedback score", async () => {
    const post = await createFeedbackPost();
    const { POST } = await import("@/app/api/posts/[id]/feedback/route");

    const response = await POST(
      new Request("http://localhost/api/posts/post-id/feedback", {
        method: "POST",
        body: JSON.stringify({ action: "like" })
      }),
      { params: { id: post.id } }
    );
    const payload = await response.json();
    const metric = await prisma.rankingMetric.findUniqueOrThrow({
      where: { postId: post.id }
    });

    expect(response.status).toBe(200);
    expect(payload.data.metric.likes).toBe(1);
    expect(metric.likes).toBe(1);
    expect(metric.feedbackScore).toBeGreaterThan(0);
  });

  it("stores comments and includes them in content detail feedback", async () => {
    const post = await createFeedbackPost();
    const { POST } = await import("@/app/api/posts/[id]/comments/route");

    const response = await POST(
      new Request("http://localhost/api/posts/post-id/comments", {
        method: "POST",
        body: JSON.stringify({
          body: "这个通勤建议很实用，准备收藏试试。"
        })
      }),
      { params: { id: post.id } }
    );
    const payload = await response.json();
    const detail = await getPostDetail(post.id);
    const metric = await prisma.rankingMetric.findUniqueOrThrow({
      where: { postId: post.id }
    });

    expect(response.status).toBe(200);
    expect(payload.data.comment.body).toBe("这个通勤建议很实用，准备收藏试试。");
    expect((detail as any)?.comments).toHaveLength(1);
    expect((detail as any)?.comments[0].body).toBe("这个通勤建议很实用，准备收藏试试。");
    expect(metric.feedbackScore).toBeGreaterThan(0);
  });
});
