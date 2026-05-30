import { beforeEach, describe, expect, it } from "vitest";
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

  return creator;
}

function publishRequest(body: unknown) {
  return new Request("http://localhost/api/posts", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

describe("content publishing flow api", () => {
  beforeEach(async () => {
    await resetContentFlowData();
  });

  it("blocks high-risk content from publishing", async () => {
    const { POST } = await import("@/app/api/posts/route");

    const response = await POST(
      publishRequest({
        title: "稳赚下注技巧",
        body: "这个下注方法稳赚不赔，今晚就能回本。",
        tags: ["热点"],
        platform: "头条"
      })
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
      publishRequest({
        title: "通勤路上的三种轻量补能习惯",
        coverUrl: "/demo-materials/cafe-cover.svg",
        body: "早高峰不一定只能消耗体力。提前准备一杯低糖咖啡、一个可复用清单和十分钟阅读，可以让通勤更有掌控感。",
        tags: ["通勤", "效率", "生活方式"],
        platform: "头条"
      })
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

  it("edits a published post and re-runs review before updating publication", async () => {
    const { POST } = await import("@/app/api/posts/route");
    const { PATCH } = await import("@/app/api/posts/[id]/route");

    const publishResponse = await POST(
      publishRequest({
        title: "周末在家整理咖啡角",
        body: "把杯具、豆子和常用器具按使用频率重新排布，能减少早晨找东西的时间，也让小空间更清爽。",
        tags: ["家居", "咖啡"],
        platform: "头条"
      })
    );
    const publishPayload = await publishResponse.json();

    const updateResponse = await PATCH(
      new Request(`http://localhost/api/posts/${publishPayload.data.post.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: "周末在家整理咖啡角清单",
          body: "先清空台面，再按每天使用、每周使用和备用物品分层收纳。最后留出一个固定补货位置，方便下次继续维护。",
          tags: ["家居", "咖啡", "清单"],
          platform: "头条"
        })
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
      publishRequest({
        title: "可控分发内容",
        body: "这是一篇用于测试内容治理操作的安全图文，包含明确场景和可执行建议。",
        tags: ["治理", "分发"],
        platform: "头条"
      })
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
      publishRequest({
        title: "城市咖啡店的低糖点单方式",
        coverUrl: "/demo-materials/cafe-cover.svg",
        body: "先确认基底，再选择无糖或低糖选项。把奶量和风味糖浆拆开询问，更容易得到稳定口感。",
        tags: ["咖啡", "低糖", "城市生活"],
        platform: "头条"
      })
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
