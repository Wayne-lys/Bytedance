import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PostsPage from "@/app/(workspace)/posts/page";

const mocks = vi.hoisted(() => ({
  draftFindMany: vi.fn(),
  getCurrentUser: vi.fn(),
  hasPermissionAsync: vi.fn(),
  listPosts: vi.fn()
}));

vi.mock("@/features/auth/role-service", () => ({
  hasPermissionAsync: mocks.hasPermissionAsync
}));

vi.mock("@/features/posts/post-service", () => ({
  listPosts: mocks.listPosts
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    draft: {
      findMany: mocks.draftFindMany
    }
  }
}));

describe("posts page", () => {
  beforeEach(() => {
    mocks.draftFindMany.mockResolvedValue([
      {
        id: "draft_1",
        title: "草稿标题",
        body: "草稿正文",
        updatedAt: new Date("2026-06-11T08:00:00Z"),
        version: 3
      }
    ]);
    mocks.getCurrentUser.mockResolvedValue({ id: "admin_1", role: "admin" });
    mocks.hasPermissionAsync.mockResolvedValue(true);
    mocks.listPosts.mockResolvedValue([]);
  });

  it("shows one draft edit action instead of duplicate edit and publish links", async () => {
    render(await PostsPage({ searchParams: { status: "drafts" } }));

    const editLink = screen.getByRole("link", { name: "继续编辑" });

    expect(editLink).toHaveAttribute("href", "/create?draftId=draft_1");
    expect(screen.queryByRole("link", { name: "二次编辑" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "更新发布" })).not.toBeInTheDocument();
  });
});
