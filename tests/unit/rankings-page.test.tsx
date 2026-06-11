import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RankingsPage from "@/app/(workspace)/rankings/page";

vi.mock("@/features/ranking/ranking-service", () => ({
  getRankingItems: vi.fn().mockResolvedValue({
    items: [],
    nextCursor: null
  })
}));

vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    disconnect() {}
  }
);

describe("rankings page", () => {
  it("describes the hot ranking sort rule as heat-based", async () => {
    render(await RankingsPage({ searchParams: { type: "hot" } }));

    expect(screen.getAllByText("排序规则")[0]).toBeInTheDocument();
    expect(screen.getByText("热度由高到低")).toBeInTheDocument();
    expect(screen.getByText("按热度由高到低排序。")).toBeInTheDocument();
    expect(screen.queryByText("阅读次数由高到低")).not.toBeInTheDocument();
  });
});
