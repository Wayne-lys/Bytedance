import { StatusBadge } from "@/components/status-badge";
import { ModerationPanel } from "@/components/moderation-panel";
import { QualityScoreCard } from "@/components/quality-score-card";
import { reviewAndScoreContent } from "@/features/moderation/moderation-service";
import { prisma } from "@/lib/db";

export default async function ReviewPage() {
  const results = await prisma.moderationResult.findMany({
    include: { post: { include: { qualityScore: true } } },
    orderBy: { createdAt: "desc" }
  });
  const demoReview = reviewAndScoreContent({
    title: "通勤路上的 3 个轻量补能习惯",
    body: "早高峰可以提前准备低糖咖啡、阅读清单和 10 分钟轻运动。每个动作都有明确场景和执行方式。",
    tags: ["通勤", "效率", "生活方式"],
    platform: "头条"
  });

  return (
    <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
        <h2 className="text-2xl font-semibold text-ink">审核与质量</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          这里会展示风险等级、命中规则、质量分和合规改写前后对比。
        </p>
        <div className="mt-5 grid gap-4">
          <ModerationPanel result={demoReview.moderation} />
          <QualityScoreCard score={demoReview.quality} />
        </div>
      </div>

      <div className="space-y-3">
        {results.map((result) => (
          <article key={result.id} className="rounded-lg border border-line bg-white/85 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-ink">{result.post.title}</h3>
              <StatusBadge tone={result.riskLevel === "safe" ? "safe" : "warning"}>
                {result.riskLevel}
              </StatusBadge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{result.reason}</p>
            <p className="mt-3 text-sm font-medium text-ink">
              质量分：{result.post.qualityScore?.total ?? 0}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
