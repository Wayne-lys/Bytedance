"use client";

import { useState } from "react";

type PostCommentView = {
  id: string;
  body: string;
  authorName: string;
  createdAt: Date | string;
};

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function LikeIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.2 10.2v9.1" />
      <path d="M7.2 10.2 11.7 4c.8-1.1 2.5-.5 2.5.9v3.4h4.2c1.4 0 2.5 1.2 2.2 2.6l-1.1 5.4a3.6 3.6 0 0 1-3.5 2.9H6.2a2.2 2.2 0 0 1-2.2-2.2v-4.6a2.2 2.2 0 0 1 2.2-2.2z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v5A3.5 3.5 0 0 1 15.5 15H11l-4.5 4v-4A3.5 3.5 0 0 1 5 11.5z" />
      <path d="M9 8h6" />
      <path d="M9 11h4" />
    </svg>
  );
}

export function PostFeedbackPanel({
  postId,
  initialLikes,
  initialFeedbackScore,
  initialComments
}: {
  postId: string;
  initialLikes: number;
  initialFeedbackScore: number;
  initialComments: PostCommentView[];
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [feedbackScore, setFeedbackScore] = useState(initialFeedbackScore);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [commentBody, setCommentBody] = useState("");
  const [pendingAction, setPendingAction] = useState<"like" | "comment" | null>(null);
  const [message, setMessage] = useState("");

  async function submitLike() {
    if (pendingAction || liked) {
      return;
    }

    setPendingAction("like");
    setMessage("");

    try {
      const response = await fetch(`/api/posts/${postId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like" })
      });
      const payload = await response.json();

      if (!payload.ok) {
        throw new Error(payload.error ?? "点赞失败");
      }

      setLikes(payload.data.metric.likes);
      setFeedbackScore(payload.data.metric.feedbackScore);
      setLiked(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "点赞失败");
    } finally {
      setPendingAction(null);
    }
  }

  async function submitComment() {
    const body = commentBody.trim();

    if (pendingAction || !body) {
      return;
    }

    setPendingAction("comment");
    setMessage("");

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
      const payload = await response.json();

      if (!payload.ok) {
        throw new Error(payload.error ?? "评论失败");
      }

      setComments((current) => [payload.data.comment, ...current]);
      setFeedbackScore(payload.data.metric.feedbackScore);
      setCommentBody("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "评论失败");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="studio-panel p-5" data-testid="post-feedback-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-accent">Reader Feedback</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">读者反馈</h2>
        </div>
        <span className="rounded-md border border-line bg-panel-muted px-3 py-1 text-sm font-semibold text-muted">
          反馈分 {feedbackScore}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void submitLike()}
          disabled={pendingAction !== null || liked}
          aria-label={liked ? `已点赞 ${likes}` : `点赞 ${likes}`}
          aria-pressed={liked}
          className={`studio-button inline-flex h-10 items-center justify-center gap-2 border px-4 text-sm font-semibold hover:border-accent disabled:cursor-not-allowed disabled:opacity-60 ${
            liked
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-line bg-panel text-ink"
          }`}
        >
          <LikeIcon filled={liked} />
          <span aria-hidden="true">{likes}</span>
        </button>
        <span className="inline-flex h-10 items-center rounded-md border border-line bg-panel-muted px-3 text-sm text-muted">
          <CommentIcon />
          <span className="ml-2">评论 {comments.length}</span>
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        <textarea
          value={commentBody}
          onChange={(event) => setCommentBody(event.target.value)}
          placeholder="写下你的看法"
          disabled={pendingAction !== null}
          className="studio-input min-h-24 w-full p-3 text-sm leading-6 disabled:cursor-not-allowed disabled:bg-panel-muted/70"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            评论会作为真实反馈参与推荐排序。
          </p>
          <button
            type="button"
            onClick={() => void submitComment()}
            disabled={pendingAction !== null || !commentBody.trim()}
            className="studio-button inline-flex h-10 items-center justify-center bg-sidebar px-4 text-sm font-semibold text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction === "comment" ? "发布中" : "发表评论"}
          </button>
        </div>
      </div>

      {message ? (
        <p className="mt-3 rounded-md border border-accent/30 bg-panel-muted px-3 py-2 text-sm text-accent">
          {message}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {comments.length === 0 ? (
          <p className="rounded-md border border-line bg-panel-muted px-3 py-3 text-sm text-muted">
            还没有评论。
          </p>
        ) : (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-md border border-line bg-panel-muted px-3 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  {comment.authorName}
                </p>
                <p className="text-xs text-muted">{formatDate(comment.createdAt)}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{comment.body}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
