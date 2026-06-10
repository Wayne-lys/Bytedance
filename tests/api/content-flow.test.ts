import { beforeEach, describe, expect, it } from "vitest";
import { reviewAndScoreContent } from "@/features/moderation/moderation-service";
import { getPostDetail } from "@/features/posts/post-service";
import { prisma } from "@/lib/db";

async function ensureCreator() {
  return prisma.user.upsert({
    where: { email: "creator@example.com" },
    update: { name: "训练营创作者" },
    create: {
      email: "creator@example.com",
      name: "训练营创作者"
    }
  });
}

async function resetContentFlowData() {
  const creator = await ensureCreator();

  await prisma.rankingMetric.deleteMany({
    where: { post: { authorId: creator.id } }
  });
  await prisma.qualityScore.deleteMany({
    where: { post: { authorId: creator.id } }
  });
  await prisma.moderationResult.deleteMany({
    where: { post: { authorId: creator.id } }
  });
  await prisma.post.deleteMany({
    where: { authorId: creator.id }
  });
  await prisma.draft.deleteMany({
    where: { authorId: creator.id }
  });

  return creator;
}

function publishRequest(body: unknown) {
  return new Request("http://localhost/api/posts", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

async function withReviewToken(body: {
  title: string;
  body: string;
  tags: string[];
  platform: string;
  [key: string]: unknown;
}) {
  const review = await reviewAndScoreContent({
    title: body.title,
    body: body.body,
    tags: body.tags,
    platform: body.platform
  });

  return {
    ...body,
    reviewToken: review.reviewToken
  };
}

describe("content publishing flow api", () => {
  beforeEach(async () => {
    await resetContentFlowData();
  });

  it("requires an explicit passed review before publishing", async () => {
    const { POST } = await import("@/app/api/posts/route");

    const response = await POST(
      publishRequest({
        title: "通勤路上的轻量补能习惯",
        body: "提前准备一杯低糖咖啡和十分钟阅读，可以让通勤更有掌控感。",
        tags: ["通勤", "效率"],
        platform: "头条"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(428);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("请先审核内容");
  });

  it("rejects publishing when content changed after review", async () => {
    const { POST } = await import("@/app/api/posts/route");
    const reviewedBody = await withReviewToken({
      title: "城市咖啡店的低糖点单方式",
      body: "先确认基底，再选择无糖或低糖选项，可以稳定控制口感。",
      tags: ["咖啡", "低糖"],
      platform: "头条"
    });

    const response = await POST(
      publishRequest({
        ...reviewedBody,
        body: "审核之后又改过的正文不能复用旧审核结果。"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(428);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("请先审核内容");
  });

  it("blocks high-risk content from publishing", async () => {
    const { POST } = await import("@/app/api/posts/route");

    const response = await POST(
      publishRequest(await withReviewToken({
        title: "稳赚下注技巧",
        body: "这个下注方法稳赚不赔，今晚就能回本。",
        tags: ["热点"],
        platform: "头条"
      }))
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("高危");
    expect(payload.data.moderation.riskLevel).toBe("high");

    const postCount = await prisma.post.count({
      where: { title: "稳赚下注技巧" }
    });
    expect(postCount).toBe(0);
  });

  it("publishes reviewed safe content with moderation and quality summaries", async () => {
    const { POST, GET } = await import("@/app/api/posts/route");

    const response = await POST(
      publishRequest(await withReviewToken({
        title: "通勤路上的三种轻量补能习惯",
        coverUrl: "/demo-materials/cafe-cover.svg",
        body: "早高峰不一定只能消耗体力。提前准备一杯低糖咖啡、一个可复用清单和十分钟阅读，可以让通勤更有掌控感。",
        tags: ["通勤", "效率", "生活方式"],
        platform: "头条"
      }))
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.post.status).toBe("published");
    expect(payload.data.post.publishedAt).toBeTruthy();
    expect(payload.data.post.moderationResult.riskLevel).toBe("safe");
    expect(payload.data.post.qualityScore.total).toBeGreaterThan(0);

    const listResponse = await GET(
      new Request("http://localhost/api/posts?status=published")
    );
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(
      listPayload.data.posts.some(
        (post: { title: string }) => post.title === "通勤路上的三种轻量补能习惯"
      )
    ).toBe(true);
  });

  it("increments real read count when a published detail page is viewed", async () => {
    const creator = await ensureCreator();
    const post = await prisma.post.create({
      data: {
        authorId: creator.id,
        title: "阅读计数测试内容",
        body: "打开详情页后，真实阅读次数应该增加一次。",
        tags: "阅读,计数",
        status: "published",
        publishedAt: new Date("2026-06-08T08:00:00.000Z"),
        rankingMetric: {
          create: {
            views: 3
          }
        }
      }
    });

    const viewedPost = await getPostDetail(post.id, { incrementView: true });
    const metric = await prisma.rankingMetric.findUniqueOrThrow({
      where: { postId: post.id }
    });

    expect(viewedPost?.rankingMetric?.views).toBe(4);
    expect(metric.views).toBe(4);
  });

  it("archives the source draft after successful publishing", async () => {
    const { POST } = await import("@/app/api/posts/route");
    const creator = await ensureCreator();
    const draft = await prisma.draft.create({
      data: {
        authorId: creator.id,
        title: "待发布草稿",
        body: "这是一条已经审核通过并准备发布的安全草稿。",
        tags: "草稿,发布",
        platform: "头条",
        status: "draft"
      }
    });
    const requestBody = await withReviewToken({
      draftId: draft.id,
      title: draft.title,
      body: draft.body,
      tags: ["草稿", "发布"],
      platform: "头条"
    });

    const response = await POST(publishRequest(requestBody));
    const archivedDraft = await prisma.draft.findUniqueOrThrow({
      where: { id: draft.id }
    });

    expect(response.status).toBe(200);
    expect(archivedDraft.status).toBe("published");
  });

  it("increments referenced material usage after successful publishing", async () => {
    const { POST } = await import("@/app/api/posts/route");
    const creator = await ensureCreator();
    const material = await prisma.material.create({
      data: {
        ownerId: creator.id,
        name: "通勤封面素材.png",
        type: "image",
        url: "/demo-materials/cafe-cover.svg",
        compliance: "safe",
        referenceCount: 0
      }
    });
    const requestBody = await withReviewToken({
      title: "通勤路上的轻量补能建议",
      body: "提前准备一张清单和一张合适的封面素材，可以让内容表达更清楚，也能减少临时决策成本。",
      tags: ["通勤", "素材"],
      platform: "头条",
      coverUrl: material.url,
      materialIds: [material.id]
    });

    const response = await POST(publishRequest(requestBody));
    const referencedMaterial = await prisma.material.findUniqueOrThrow({
      where: { id: material.id }
    });

    expect(response.status).toBe(200);
    expect(referencedMaterial.referenceCount).toBe(1);
  });

  it("persists all selected image materials for the public content detail", async () => {
    const { POST } = await import("@/app/api/posts/route");
    const { GET } = await import("@/app/api/posts/[id]/route");
    const creator = await ensureCreator();
    const firstMaterial = await prisma.material.create({
      data: {
        ownerId: creator.id,
        name: "通勤封面 A.png",
        type: "image",
        url: "/demo-materials/cafe-cover.svg",
        compliance: "safe",
        referenceCount: 0
      }
    });
    const secondMaterial = await prisma.material.create({
      data: {
        ownerId: creator.id,
        name: "通勤封面 B.png",
        type: "image",
        url: "/demo-materials/commute-kit.svg",
        compliance: "safe",
        referenceCount: 0
      }
    });
    const requestBody = await withReviewToken({
      title: "多素材发布详情",
      body: "发布时选择多张图片素材，详情页应该展示所有被选中的合规图片。",
      tags: ["通勤", "素材"],
      platform: "头条",
      coverUrl: firstMaterial.url,
      materialIds: [firstMaterial.id, secondMaterial.id]
    });

    const publishResponse = await POST(publishRequest(requestBody));
    const publishPayload = await publishResponse.json();
    const detailResponse = await GET(
      new Request(`http://localhost/api/posts/${publishPayload.data.post.id}`),
      { params: { id: publishPayload.data.post.id } }
    );
    const detailPayload = await detailResponse.json();

    expect(publishResponse.status).toBe(200);
    expect(detailResponse.status).toBe(200);
    expect(detailPayload.data.post.materials).toEqual([
      expect.objectContaining({
        id: firstMaterial.id,
        name: firstMaterial.name,
        url: firstMaterial.url
      }),
      expect.objectContaining({
        id: secondMaterial.id,
        name: secondMaterial.name,
        url: secondMaterial.url
      })
    ]);
  });

  it("simulates syncing a published safe post to Douyin and returns distribution status in detail", async () => {
    const { POST } = await import("@/app/api/posts/route");
    const distributionRoute = await import("@/app/api/posts/[id]/distributions/route");
    const { GET } = await import("@/app/api/posts/[id]/route");
    const publishResponse = await POST(
      publishRequest(await withReviewToken({
        title: "抖音分发模拟内容",
        body: "这是一篇已经通过审核的安全图文，用于验证抖音图文模拟同步链路。",
        tags: ["抖音", "分发"],
        platform: "头条"
      }))
    );
    const publishPayload = await publishResponse.json();
    const postId = publishPayload.data.post.id;

    const distributeResponse = await distributionRoute.POST(
      new Request(`http://localhost/api/posts/${postId}/distributions`, {
        method: "POST",
        body: JSON.stringify({ platform: "douyin" })
      }),
      { params: { id: postId } }
    );
    const distributePayload = await distributeResponse.json();
    const detailResponse = await GET(
      new Request(`http://localhost/api/posts/${postId}`),
      { params: { id: postId } }
    );
    const detailPayload = await detailResponse.json();

    expect(distributeResponse.status).toBe(200);
    expect(distributePayload.data.distribution).toEqual(
      expect.objectContaining({
        platform: "douyin",
        platformLabel: "抖音图文",
        status: "synced"
      })
    );
    expect(distributePayload.data.distribution.externalId).toMatch(/^mock_douyin_/);
    expect(detailPayload.data.post.distributions).toContainEqual(
      expect.objectContaining({
        platform: "douyin",
        status: "synced"
      })
    );
  });

  it("edits a published post and re-runs review before updating publication", async () => {
    const { POST } = await import("@/app/api/posts/route");
    const { PATCH } = await import("@/app/api/posts/[id]/route");

    const publishResponse = await POST(
      publishRequest(await withReviewToken({
        title: "周末在家整理咖啡角",
        body: "把杯具、豆子和常用器具按使用频率重新排布，能减少早晨找东西的时间，也让小空间更清爽。",
        tags: ["家居", "咖啡"],
        platform: "头条"
      }))
    );
    const publishPayload = await publishResponse.json();
    const updateBody = await withReviewToken({
      title: "周末在家整理咖啡角清单",
      body: "先清空台面，再按每天使用、每周使用和备用物品分层收纳。最后留出一个固定补货位置，方便下次继续维护。",
      tags: ["家居", "咖啡", "清单"],
      platform: "头条"
    });

    const updateResponse = await PATCH(
      new Request(`http://localhost/api/posts/${publishPayload.data.post.id}`, {
        method: "PATCH",
        body: JSON.stringify(updateBody)
      }),
      { params: { id: publishPayload.data.post.id } }
    );
    const updatePayload = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.data.post.status).toBe("published");
    expect(updatePayload.data.post.title).toBe("周末在家整理咖啡角清单");
    expect(updatePayload.data.post.moderationResult.riskLevel).toBe("safe");
    expect(updatePayload.data.post.qualityScore.total).toBeGreaterThan(0);
  });

  it("supports content offline, withdrawal, and rollback actions", async () => {
    const { POST } = await import("@/app/api/posts/route");
    const statusRoute = await import("@/app/api/posts/[id]/status/route");

    const publishResponse = await POST(
      publishRequest(await withReviewToken({
        title: "可控分发内容",
        body: "这是一篇用于测试内容治理操作的安全图文，包含明确场景和可执行建议。",
        tags: ["治理", "分发"],
        platform: "头条"
      }))
    );
    const publishPayload = await publishResponse.json();
    const postId = publishPayload.data.post.id;

    const offlineResponse = await statusRoute.POST(
      new Request(`http://localhost/api/posts/${postId}/status`, {
        method: "POST",
        body: JSON.stringify({ action: "offline" })
      }),
      { params: { id: postId } }
    );
    const offlinePayload = await offlineResponse.json();

    expect(offlineResponse.status).toBe(200);
    expect(offlinePayload.data.post.status).toBe("offline");

    const rollbackResponse = await statusRoute.POST(
      new Request(`http://localhost/api/posts/${postId}/status`, {
        method: "POST",
        body: JSON.stringify({ action: "rollback" })
      }),
      { params: { id: postId } }
    );
    const rollbackPayload = await rollbackResponse.json();

    expect(rollbackPayload.data.post.status).toBe("published");

    const withdrawResponse = await statusRoute.POST(
      new Request(`http://localhost/api/posts/${postId}/status`, {
        method: "POST",
        body: JSON.stringify({ action: "withdraw" })
      }),
      { params: { id: postId } }
    );
    const withdrawPayload = await withdrawResponse.json();

    expect(withdrawPayload.data.post.status).toBe("withdrawn");
  });

  it("returns public content detail with author, publish time, cover, body, tags, and quality", async () => {
    const { POST } = await import("@/app/api/posts/route");
    const { GET } = await import("@/app/api/posts/[id]/route");

    const publishResponse = await POST(
      publishRequest(await withReviewToken({
        title: "城市咖啡店的低糖点单方式",
        coverUrl: "/demo-materials/cafe-cover.svg",
        body: "先确认基底，再选择无糖或低糖选项。把奶量和风味糖浆拆开询问，更容易得到稳定口感。",
        tags: ["咖啡", "低糖", "城市生活"],
        platform: "头条"
      }))
    );
    const publishPayload = await publishResponse.json();

    const detailResponse = await GET(
      new Request(`http://localhost/api/posts/${publishPayload.data.post.id}`),
      { params: { id: publishPayload.data.post.id } }
    );
    const detailPayload = await detailResponse.json();

    expect(detailResponse.status).toBe(200);
    expect(detailPayload.data.post.author.name).toBe("训练营创作者");
    expect(detailPayload.data.post.publishedAt).toBeTruthy();
    expect(detailPayload.data.post.coverUrl).toBe("/demo-materials/cafe-cover.svg");
    expect(detailPayload.data.post.body).toContain("低糖");
    expect(detailPayload.data.post.tags).toContain("咖啡");
    expect(detailPayload.data.post.qualitySummary.total).toBeGreaterThan(0);
  });
});
