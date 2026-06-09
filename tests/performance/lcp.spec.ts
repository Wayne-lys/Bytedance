import { expect, test } from "@playwright/test";
import { reviewAndScoreContent } from "../../src/features/moderation/moderation-service";

declare global {
  interface Window {
    __lcp?: number;
  }
}

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
  const postInput = {
    title: `LCP performance validation ${Date.now()}`,
    body: "This lightweight short article is used for performance validation. The first screen should render quickly and consistently.",
    tags: ["performance", "lcp", "validation"],
    coverUrl: "/demo-materials/cafe-cover.svg",
    platform: "Toutiao"
  };
  const review = await reviewAndScoreContent(postInput);
  const publishResponse = await request.post("/api/posts", {
    data: {
      ...postInput,
      reviewToken: review.reviewToken
    }
  });
  const publishPayload = await publishResponse.json();
  expect(
    publishResponse.ok(),
    `publish failed: ${publishResponse.status()} ${JSON.stringify(publishPayload)}`
  ).toBe(true);
  const detailUrl = `/content/${publishPayload.data.post.id}`;

  const rankingsLcp = await measureLcp(page, "/rankings");
  const detailLcp = await measureLcp(page, detailUrl);

  console.log(`LCP rankings=${Math.round(rankingsLcp)}ms detail=${Math.round(detailLcp)}ms`);

  expect(rankingsLcp).toBeLessThanOrEqual(2500);
  expect(detailLcp).toBeLessThanOrEqual(2500);
});
