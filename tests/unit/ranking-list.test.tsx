import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RankingList } from "@/components/ranking-list";

vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    disconnect() {}
  }
);

describe("ranking list", () => {
  it("links detail pages back to the active ranking tab", () => {
    render(
      <RankingList
        type="latest"
        initialCursor={null}
        initialItems={[
          {
            postId: "post_1",
            title: "榜单内容",
            body: "正文摘要",
            authorName: "作者",
            tags: ["测试"],
            views: 10,
            rankingScore: 88,
            explanation: {
              qualityContribution: 40,
              heatContribution: 20,
              freshnessContribution: 10,
              feedbackContribution: 8,
              riskPenalty: 0
            }
          }
        ]}
      />
    );

    expect(screen.getByRole("link", { name: /榜单内容/ })).toHaveAttribute(
      "href",
      "/content/post_1?from=rankings&type=latest"
    );
  });
});
