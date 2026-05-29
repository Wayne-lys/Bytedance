import { expect, test } from "@playwright/test";

async function measureLcp(page: import("@playwright/test").Page, url: string) {
  await page.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];

      window.__lcp = lastEntry?.startTime ?? 0;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  return page.evaluate(() => window.__lcp || performance.now());
}

test("rankings and content detail stay within the LCP target", async ({
  page,
  request
}) => {
  const publishResponse = await request.post("/api/posts", {
    data: {
      title: `LCP 验证内容 ${Date.now()}`,
      body: "这是一篇用于性能验证的短图文内容，正文保持轻量，首屏可以稳定渲染。",
      tags: ["性能", "LCP", "验证"],
      coverUrl: "/demo-materials/cafe-cover.svg",
      platform: "头条"
    }
  });
  const publishPayload = await publishResponse.json();
  const detailUrl = `/content/${publishPayload.data.post.id}`;

  const rankingsLcp = await measureLcp(page, "/rankings");
  const detailLcp = await measureLcp(page, detailUrl);

  console.log(`LCP rankings=${Math.round(rankingsLcp)}ms detail=${Math.round(detailLcp)}ms`);

  expect(rankingsLcp).toBeLessThanOrEqual(2500);
  expect(detailLcp).toBeLessThanOrEqual(2500);
});
