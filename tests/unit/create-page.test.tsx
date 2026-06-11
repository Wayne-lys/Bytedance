import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreatePage from "@/app/(workspace)/create/page";

const mocks = vi.hoisted(() => ({
  draftFindFirst: vi.fn(),
  getCurrentUser: vi.fn(),
  getLatestDraft: vi.fn(),
  getPostDetail: vi.fn(),
  hasPermissionAsync: vi.fn(),
  listMaterials: vi.fn(),
  listPromptTemplates: vi.fn()
}));

vi.mock("@/app/(workspace)/create/creation-studio", () => ({
  CreationStudio: ({ initialDraft }: { initialDraft?: { title?: string } | null }) => (
    <div data-testid="loaded-draft-title">{initialDraft?.title ?? "未加载草稿"}</div>
  )
}));

vi.mock("@/features/auth/role-service", () => ({
  hasPermissionAsync: mocks.hasPermissionAsync
}));

vi.mock("@/features/drafts/draft-service", () => ({
  getLatestDraft: mocks.getLatestDraft
}));

vi.mock("@/features/materials/material-service", () => ({
  listMaterials: mocks.listMaterials
}));

vi.mock("@/features/posts/post-service", () => ({
  getPostDetail: mocks.getPostDetail
}));

vi.mock("@/features/prompts/prompt-service", () => ({
  listPromptTemplates: mocks.listPromptTemplates
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    draft: {
      findFirst: mocks.draftFindFirst
    }
  }
}));

describe("create page", () => {
  beforeEach(() => {
    mocks.draftFindFirst.mockReset();
    mocks.getCurrentUser.mockResolvedValue({ id: "admin_1", role: "admin" });
    mocks.getLatestDraft.mockReset();
    mocks.getPostDetail.mockReset();
    mocks.hasPermissionAsync.mockResolvedValue(true);
    mocks.listMaterials.mockResolvedValue([]);
    mocks.listPromptTemplates.mockResolvedValue([]);
  });

  it("loads the requested draft for reviewers even when another user authored it", async () => {
    mocks.draftFindFirst.mockImplementation(async ({ where }) => {
      if (where.authorId) {
        return null;
      }

      return {
        id: "draft_other_author",
        title: "对应草稿标题",
        body: "对应草稿正文",
        tags: "测试",
        coverUrl: null,
        topic: "通勤",
        audience: "白领",
        platform: "头条",
        style: "真实、具体"
      };
    });

    render(await CreatePage({ searchParams: { draftId: "draft_other_author" } }));

    expect(screen.getByTestId("loaded-draft-title")).toHaveTextContent("对应草稿标题");
    expect(mocks.draftFindFirst).toHaveBeenCalledWith({
      where: { id: "draft_other_author" }
    });
  });
});
