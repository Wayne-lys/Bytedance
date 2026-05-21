import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/db";

export default async function RankingsPage() {
  const metrics = await prisma.rankingMetric.findMany({
    orderBy: { rankingScore: "desc" },
    include: { post: { include: { qualityScore: true } } }
  });

  return (
    <section className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink">热点榜单</h2>
          <p className="mt-2 text-sm text-muted">
            当前展示种子榜单；后续会接入热点榜、爆文榜、推荐流和无限滚动。
          </p>
        </div>
        <StatusBadge tone="safe">智能排序</StatusBadge>
      </div>

      <div className="mt-6 space-y-3">
        {metrics.map((metric, index) => (
          <article
            key={metric.id}
            className="grid gap-4 rounded-lg border border-line bg-[#fbfaf6] p-4 md:grid-cols-[auto_1fr_auto]"
          >
            <span className="flex size-10 items-center justify-center rounded-md bg-accent text-sm font-semibold text-white">
              {index + 1}
            </span>
            <div>
              <h3 className="font-semibold text-ink">{metric.post.title}</h3>
              <p className="mt-1 text-sm text-muted">
                质量 {metric.post.qualityScore?.total ?? 0} · 热度 {metric.heatScore} · 新鲜度 {metric.freshnessScore}
              </p>
            </div>
            <p className="text-xl font-semibold text-ink">{metric.rankingScore}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
