import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PostFeedbackPanel } from "@/components/post-feedback-panel";

describe("post feedback panel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates the visible like count after a successful like", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              metric: {
                likes: 3,
                feedbackScore: 18
              }
            }
          }),
          { status: 200 }
        )
      )
    );

    render(
      <PostFeedbackPanel
        postId="post_1"
        initialLikes={2}
        initialFeedbackScore={12}
        initialComments={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "点赞 2" }));

    expect(await screen.findByRole("button", { name: "已点赞 3" })).toBeInTheDocument();
    expect(screen.getByText("反馈分 18")).toBeInTheDocument();
  });

  it("uses icon-only like labels while keeping accessible names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              metric: {
                likes: 3,
                feedbackScore: 18
              }
            }
          }),
          { status: 200 }
        )
      )
    );

    render(
      <PostFeedbackPanel
        postId="post_1"
        initialLikes={2}
        initialFeedbackScore={12}
        initialComments={[]}
      />
    );

    const likeButton = screen.getByRole("button", { name: "点赞 2" });

    expect(likeButton.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(likeButton).toHaveTextContent("2");
    expect(likeButton).not.toHaveTextContent("点赞");

    fireEvent.click(likeButton);

    const likedButton = await screen.findByRole("button", { name: "已点赞 3" });

    expect(likedButton.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(likedButton).toHaveTextContent("3");
    expect(likedButton).not.toHaveTextContent("已点赞");
  });

  it("adds a submitted comment to the visible comment list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              comment: {
                id: "comment_2",
                body: "这个建议很实用。",
                authorName: "匿名读者",
                createdAt: "2026-06-09T08:00:00.000Z"
              },
              metric: {
                likes: 1,
                feedbackScore: 22
              }
            }
          }),
          { status: 200 }
        )
      )
    );

    render(
      <PostFeedbackPanel
        postId="post_1"
        initialLikes={1}
        initialFeedbackScore={10}
        initialComments={[
          {
            id: "comment_1",
            body: "原有评论",
            authorName: "训练营读者",
            createdAt: "2026-06-09T07:00:00.000Z"
          }
        ]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("写下你的看法"), {
      target: { value: "这个建议很实用。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "发表评论" }));

    await waitFor(() => {
      expect(screen.getByText("这个建议很实用。")).toBeInTheDocument();
    });
    expect(screen.getByText("原有评论")).toBeInTheDocument();
    expect(screen.getByText("反馈分 22")).toBeInTheDocument();
  });

  it("deletes a comment when the current user owns it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            deletedId: "comment_1",
            metric: {
              likes: 1,
              feedbackScore: 6
            }
          }
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PostFeedbackPanel
        postId="post_1"
        initialLikes={1}
        initialFeedbackScore={14}
        initialComments={[
          {
            id: "comment_1",
            body: "我自己发的评论",
            authorName: "演示管理员",
            createdAt: "2026-06-09T07:00:00.000Z",
            canDelete: true
          } as any,
          {
            id: "comment_2",
            body: "其他人的评论",
            authorName: "其他读者",
            createdAt: "2026-06-09T07:10:00.000Z",
            canDelete: false
          } as any
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "删除评论 我自己发的评论" }));

    await waitFor(() => {
      expect(screen.queryByText("我自己发的评论")).not.toBeInTheDocument();
    });
    expect(screen.getByText("其他人的评论")).toBeInTheDocument();
    expect(screen.getByText("评论 1")).toBeInTheDocument();
    expect(screen.getByText("反馈分 6")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts/post_1/comments",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ commentId: "comment_1" })
      })
    );
    expect(
      screen.queryByRole("button", { name: "删除评论 其他人的评论" })
    ).not.toBeInTheDocument();
  });
});
