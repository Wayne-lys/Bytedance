import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/db";

export default async function EvaluationPage() {
  const cases = await prisma.evaluationCase.findMany();
  const matched = cases.filter((item) => item.matched).length;
  const accuracy = cases.length === 0 ? 0 : Math.round((matched / cases.length) * 100);

  return (
    <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
        <p className="text-sm text-muted">高危识别准确率</p>
        <p className="mt-3 text-5xl font-semibold text-ink">{accuracy}%</p>
        <div className="mt-4">
          <StatusBadge tone={accuracy >= 90 ? "safe" : "warning"}>目标 90%+</StatusBadge>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
        <h2 className="text-2xl font-semibold text-ink">效果评估</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          后续会展示 AI 改写前后对比、Prompt 调优记录、榜单因子贡献和 LCP 性能结果。
        </p>

        <div className="mt-5 space-y-3">
          {cases.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-[#fbfaf6] p-3"
            >
              <span className="text-sm font-medium text-ink">{item.title}</span>
              <StatusBadge tone={item.matched ? "safe" : "warning"}>
                {item.expectedLevel}
              </StatusBadge>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
