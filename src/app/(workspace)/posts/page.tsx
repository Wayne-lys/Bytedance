import { PostGovernanceActions } from "@/components/post-governance-actions";
import { StatusBadge } from "@/components/status-badge";
import { hasPermissionAsync } from "@/features/auth/role-service";
import { listPosts } from "@/features/posts/post-service";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const statusTabs = [
  { id: "drafts", label: "草稿" },
  { id: "published", label: "已发布" },
  { id: "rejected", label: "被驳回" },
  { id: "offline", label: "已下线" },
  { id: "withdrawn", label: "已撤回" }
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

  if (status === "offline" || status === "withdrawn") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function postStatusLabel(status: string) {
  const labels: Record<string, string> = {
    published: "已发布",
    rejected: "被驳回",
    offline: "已下线",
    withdrawn: "已撤回"
  };

  return labels[status] ?? status;
}

export default async function PostsPage({
  searchParams
}: {
  searchParams?: { status?: string };
}) {
  const currentUser = await getCurrentUser();
  const canReviewContent = await hasPermissionAsync(currentUser?.role, "review_content");

  if (!currentUser || !canReviewContent) {
    return (
      <section className="studio-panel p-6">
        <p className="text-xs font-semibold text-accent">Content Ops</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">内容管理</h2>
        <div className="mt-5 rounded-md border border-line bg-panel-muted px-4 py-3 text-sm leading-6 text-muted">
          当前账号没有内容治理权限。请使用审核员或管理员账号登录后再操作。
        </div>
      </section>
    );
  }

  const activeStatus = searchParams?.status ?? "published";
  const [drafts, publishedPosts, rejectedPosts, offlinePosts, withdrawnPosts] = await Promise.all([
    prisma.draft.findMany({
      orderBy: { updatedAt: "desc" }
    }),
    listPosts("published"),
    listPosts("rejected"),
    listPosts("offline"),
    listPosts("withdrawn")
  ]);

  const counts = {
    drafts: drafts.length,
    published: publishedPosts.length,
    rejected: rejectedPosts.length,
    offline: offlinePosts.length,
    withdrawn: withdrawnPosts.length
  };
  const visiblePosts =
    activeStatus === "rejected"
      ? rejectedPosts
      : activeStatus === "offline"
        ? offlinePosts
        : activeStatus === "withdrawn"
          ? withdrawnPosts
          : publishedPosts;

  return (
    <section className="space-y-5">
      <div className="studio-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-accent">Content Ops</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">内容管理</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              集中管理草稿、已发布和被驳回内容。这里保留继续编辑、重新审核和内容治理入口，方便演示发布后的闭环。
            </p>
          </div>
          <a
            href="/create"
            className="studio-button inline-flex h-10 items-center justify-center bg-accent px-4 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar"
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
                className={`studio-button shrink-0 border px-4 py-2 text-sm font-semibold ${
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-panel text-muted hover:border-accent hover:text-ink"
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
        <div className="studio-panel overflow-hidden">
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
                    className="studio-button bg-accent px-3 py-2 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar"
                  >
                    继续编辑
                  </a>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="studio-panel overflow-hidden">
          {visiblePosts.length === 0 ? (
            <div className="p-6 text-sm text-muted">
              {activeStatus === "rejected" ? "暂无被驳回内容。" : "暂无已发布内容。"}
            </div>
          ) : (
            visiblePosts.map((post) => (
              <article
                key={post.id}
                className="grid gap-4 border-b border-line p-5 last:border-b-0 xl:grid-cols-[minmax(0,1fr)_92px_184px] xl:items-center"
              >
                <a href={`/content/${post.id}`} className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-ink">{post.title}</h3>
                    <StatusBadge tone={postStatusTone(post.status)}>
                      {postStatusLabel(post.status)}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{post.body}</p>
                  <p className="mt-3 text-xs text-muted">
                    {formatDate(post.publishedAt)} · {post.tags.join(" / ")}
                  </p>
                </a>
                <div className="rounded-md border border-line bg-panel/70 px-3 py-2 text-center">
                  <p className="text-xs font-semibold text-muted">质量总分</p>
                  <p className="mt-1 text-2xl font-semibold leading-none text-ink">
                    {post.qualitySummary?.total ?? 0}
                  </p>
                </div>
                <div className="grid gap-2 rounded-md border border-line bg-panel/60 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`/create?postId=${post.id}`}
                      className="studio-button flex h-8 items-center justify-center border border-line bg-panel px-2 text-xs font-semibold text-ink hover:border-accent"
                    >
                      二次编辑
                    </a>
                    <a
                      href={`/review?postId=${post.id}`}
                      className="studio-button flex h-8 items-center justify-center border border-line bg-panel px-2 text-xs font-semibold text-ink hover:border-accent"
                    >
                      重新审核
                    </a>
                  </div>
                  <PostGovernanceActions postId={post.id} status={post.status} />
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
