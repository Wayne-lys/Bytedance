import { notFound } from "next/navigation";
import { QualityScoreCard } from "@/components/quality-score-card";
import { StatusBadge } from "@/components/status-badge";
import { getPostDetail } from "@/features/posts/post-service";

function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return "未发布";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

export default async function ContentDetailPage({
  params
}: {
  params: { id: string };
}) {
  const post = await getPostDetail(params.id);

  if (!post) {
    notFound();
  }

  const readCount = post.rankingMetric?.views ?? 0;

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <article className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-line bg-white/90 p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone="safe">已发布</StatusBadge>
            <span className="text-sm text-muted">{formatDate(post.publishedAt)}</span>
            <span className="text-sm text-muted">{readCount.toLocaleString("zh-CN")} 阅读</span>
          </div>

          <h1 className="mt-5 text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>发布者：{post.author.name}</span>
            <span>·</span>
            <span>{post.tags.join(" / ")}</span>
          </div>

          {post.coverUrl ? (
            <img
              src={post.coverUrl}
              alt=""
              className="mt-6 aspect-[16/9] w-full rounded-lg border border-line object-cover"
            />
          ) : null}

          <div className="mt-7 whitespace-pre-wrap text-base leading-8 text-ink">
            {post.body}
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-line bg-[#fbfaf6] px-3 py-1 text-sm text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-line bg-white/90 p-5 shadow-soft">
            <p className="text-sm text-muted">内容状态</p>
            <p className="mt-2 text-xl font-semibold text-ink">审核通过，可分发</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              详情页聚合了创作者、发布时间、正文、标签和质量评分，满足内容消费侧展示要求。
            </p>
          </div>

          {post.qualitySummary ? (
            <QualityScoreCard score={post.qualitySummary} />
          ) : (
            <div className="rounded-lg border border-line bg-white/90 p-5 text-sm text-muted shadow-soft">
              暂无质量评分。
            </div>
          )}

          <a
            href="/posts"
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-line bg-white text-sm font-medium text-ink transition hover:border-accent"
          >
            返回内容管理
          </a>
        </aside>
      </article>
    </main>
  );
}
