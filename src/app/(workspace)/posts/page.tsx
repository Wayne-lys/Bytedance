import { StatusBadge } from "@/components/status-badge";
import { listPosts } from "@/features/posts/post-service";
import { prisma } from "@/lib/db";

const statusTabs = [
  { id: "drafts", label: "草稿" },
  { id: "published", label: "已发布" },
  { id: "rejected", label: "被驳回" }
];

function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return "未发布";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

function postStatusTone(status: string) {
  if (status === "published") {
    return "safe" as const;
  }

  if (status === "rejected") {
    return "blocked" as const;
  }

  return "neutral" as const;
}

export default async function PostsPage({
  searchParams
}: {
  searchParams?: { status?: string };
}) {
  const activeStatus = searchParams?.status ?? "published";
  const [drafts, publishedPosts, rejectedPosts] = await Promise.all([
    prisma.draft.findMany({
      orderBy: { updatedAt: "desc" }
    }),
    listPosts("published"),
    listPosts("rejected")
  ]);

  const counts = {
    drafts: drafts.length,
    published: publishedPosts.length,
    rejected: rejectedPosts.length
  };
  const visiblePosts = activeStatus === "rejected" ? rejectedPosts : publishedPosts;

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-ink">内容管理</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              集中管理草稿、已发布和被驳回内容。这里保留二次编辑、重新审核和更新发布入口，方便演示发布后的闭环。
            </p>
          </div>
          <a
            href="/create"
            className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-white transition hover:bg-[#176854]"
          >
            继续创作
          </a>
        </div>

        <nav className="mt-6 flex gap-2 overflow-x-auto" aria-label="内容状态">
          {statusTabs.map((tab) => {
            const active = activeStatus === tab.id;

            return (
              <a
                key={tab.id}
                href={`/posts?status=${tab.id}`}
                className={`shrink-0 rounded-md border px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-white text-muted hover:border-accent hover:text-ink"
                }`}
              >
                {tab.label}
                <span className="ml-2 opacity-75">{counts[tab.id as keyof typeof counts]}</span>
              </a>
            );
          })}
        </nav>
      </div>

      {activeStatus === "drafts" ? (
        <div className="overflow-hidden rounded-lg border border-line bg-white/85 shadow-soft">
          {drafts.length === 0 ? (
            <div className="p-6 text-sm text-muted">暂无草稿，进入创作台生成第一篇短图文。</div>
          ) : (
            drafts.map((draft) => (
              <article
                key={draft.id}
                className="grid gap-4 border-b border-line p-5 last:border-b-0 lg:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-ink">{draft.title || "未命名草稿"}</h3>
                    <StatusBadge>草稿</StatusBadge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{draft.body}</p>
                  <p className="mt-3 text-xs text-muted">
                    最近保存 {formatDate(draft.updatedAt)} · 版本 {draft.version}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <a
                    href={`/create?draftId=${draft.id}`}
                    className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink transition hover:border-accent"
                  >
                    二次编辑
                  </a>
                  <a
                    href={`/create?draftId=${draft.id}&publish=true`}
                    className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-[#176854]"
                  >
                    更新发布
                  </a>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-white/85 shadow-soft">
          {visiblePosts.length === 0 ? (
            <div className="p-6 text-sm text-muted">
              {activeStatus === "rejected" ? "暂无被驳回内容。" : "暂无已发布内容。"}
            </div>
          ) : (
            visiblePosts.map((post) => (
              <article
                key={post.id}
                className="grid gap-4 border-b border-line p-5 last:border-b-0 xl:grid-cols-[1fr_140px_220px]"
              >
                <a href={`/content/${post.id}`} className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-ink">{post.title}</h3>
                    <StatusBadge tone={postStatusTone(post.status)}>{post.status}</StatusBadge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{post.body}</p>
                  <p className="mt-3 text-xs text-muted">
                    {formatDate(post.publishedAt)} · {post.tags.join(" / ")}
                  </p>
                </a>
                <div className="self-center">
                  <p className="text-xs text-muted">质量总分</p>
                  <p className="mt-1 text-2xl font-semibold text-ink">
                    {post.qualitySummary?.total ?? 0}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <a
                    href={`/create?postId=${post.id}`}
                    className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink transition hover:border-accent"
                  >
                    二次编辑
                  </a>
                  <a
                    href={`/review?postId=${post.id}`}
                    className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink transition hover:border-accent"
                  >
                    重新审核
                  </a>
                  <a
                    href={`/content/${post.id}`}
                    className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-[#176854]"
                  >
                    查看详情
                  </a>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
