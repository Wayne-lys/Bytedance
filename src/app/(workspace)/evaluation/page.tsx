import { StatusBadge } from "@/components/status-badge";
import { evaluateSafetyCases } from "@/features/evaluation/evaluation-service";
import { prisma } from "@/lib/db";

export default async function EvaluationPage() {
  const cases = await prisma.evaluationCase.findMany({
    orderBy: { createdAt: "asc" }
  });
  const report = evaluateSafetyCases(cases);

  return (
    <section className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="studio-tile p-6">
          <p className="text-sm text-muted">高危识别准确率</p>
          <p className="mt-3 text-5xl font-semibold text-ink">
            {report.highRiskAccuracy}%
          </p>
          <div className="mt-4">
            <StatusBadge tone={report.highRiskAccuracy >= 90 ? "safe" : "warning"}>
              目标 90%+
            </StatusBadge>
          </div>
        </div>
        <div className="studio-tile p-6">
          <p className="text-sm text-muted">评估用例</p>
          <p className="mt-3 text-4xl font-semibold text-ink">{report.totalCases}</p>
          <p className="mt-3 text-sm text-muted">覆盖 safe / medium / high 场景</p>
        </div>
        <div className="studio-tile p-6">
          <p className="text-sm text-muted">误报 / 漏报</p>
          <p className="mt-3 text-4xl font-semibold text-ink">
            {report.falsePositives} / {report.falseNegatives}
          </p>
          <p className="mt-3 text-sm text-muted">用于后续规则和 Prompt 调优</p>
        </div>
        <div className="studio-tile p-6">
          <p className="text-sm text-muted">LCP 性能</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{report.lcp.target}</p>
          <p className="mt-3 text-sm text-muted">{report.lcp.note}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="studio-panel p-6">
          <h2 className="text-2xl font-semibold text-ink">评估用例结果</h2>
          <div className="mt-5 space-y-3">
            {report.caseResults.map((item) => (
              <article key={item.id} className="studio-tile p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-ink">{item.title}</h3>
                    <p className="mt-1 text-xs text-muted">
                      预期 {item.expectedLevel} · 实际 {item.actualLevel}
                    </p>
                  </div>
                  <StatusBadge tone={item.matched ? "safe" : "warning"}>
                    {item.matched ? "命中" : "需调优"}
                  </StatusBadge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{item.reason}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="studio-panel p-6">
            <h2 className="text-xl font-semibold text-ink">风险分布</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {Object.entries(report.riskDistribution).map(([level, count]) => (
                <div key={level} className="studio-tile p-4">
                  <p className="text-sm text-muted">{level}</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{count}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="studio-panel p-6">
            <h2 className="text-xl font-semibold text-ink">Prompt 调优记录</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
              {report.promptTuningNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>

          <section className="studio-panel p-6">
            <h2 className="text-xl font-semibold text-ink">榜单因子</h2>
            <div className="mt-4 space-y-2 text-sm text-muted">
              <p>质量权重：{report.rankingFactors.qualityWeight}</p>
              <p>热度权重：{report.rankingFactors.heatWeight}</p>
              <p>新鲜度权重：{report.rankingFactors.freshnessWeight}</p>
              <p>反馈权重：{report.rankingFactors.feedbackWeight}</p>
            </div>
          </section>
        </aside>
      </div>

      <section className="studio-panel p-6">
        <h2 className="text-2xl font-semibold text-ink">合规改写样例</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {report.rewriteSamples.map((sample) => (
            <article key={sample.title} className="studio-tile p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-ink">{sample.title}</h3>
                <StatusBadge tone="warning">{sample.riskLevel}</StatusBadge>
              </div>
              <p className="mt-3 text-xs font-semibold text-muted">改写前</p>
              <p className="mt-1 text-sm leading-6 text-muted">{sample.before}</p>
              <p className="mt-3 text-xs font-semibold text-muted">改写后</p>
              <p className="mt-1 text-sm leading-6 text-ink">{sample.after}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
