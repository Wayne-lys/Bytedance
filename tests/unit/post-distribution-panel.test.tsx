import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostDistributionPanel } from "@/components/post-distribution-panel";

describe("PostDistributionPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("simulates syncing a published post to Douyin", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            distribution: {
              id: "dist_1",
              platform: "douyin",
              platformLabel: "抖音图文",
              status: "synced",
              externalId: "mock_douyin_abc123",
              externalUrl: "https://www.douyin.com/mock/item/mock_douyin_abc123",
              message: "沙盒模拟同步成功，已记录外部分发作品 ID。",
              syncedAt: "2026-06-10T10:00:00.000Z"
            }
          }
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PostDistributionPanel
        postId="post_1"
        status="published"
        moderationRiskLevel="safe"
        initialDistributions={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "同步到抖音图文" }));

    await waitFor(() => {
      expect(screen.getAllByText("模拟同步成功").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("mock_douyin_abc123")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts/post_1/distributions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ platform: "douyin" })
      })
    );
  });
});
