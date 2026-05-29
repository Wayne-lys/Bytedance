import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/db";

const qualityDimensions = [
  { name: "原创性", description: "避免模板化复述，鼓励具体经验和真实场景。" },
  { name: "结构", description: "标题、开头、分点和结尾形成清晰阅读路径。" },
  { name: "信息密度", description: "每段提供可执行信息，减少空泛表达。" },
  { name: "表达清晰", description: "句子短、指代明确，适合信息流快速扫读。" },
  { name: "互动潜力", description: "包含收藏、评论或行动提示，但不诱导违规互动。" },
  { name: "平台适配", description: "符合头条信息流图文内容的标题和正文节奏。" }
];

function ruleTone(level: string) {
  if (level === "high") {
    return "blocked" as const;
  }

  if (level === "medium") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export default async function RulesPage() {
  const rules = await prisma.auditRule.findMany({
    orderBy: [{ riskLevel: "desc" }, { category: "asc" }]
  });
  const grouped = rules.reduce(
    (summary, rule) => {
      summary[rule.riskLevel as keyof typeof summary] += 1;

      return summary;
    },
    { high: 0, medium: 0, low: 0 }
  );

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-ink">规则体系</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              规则库明确高危拦截、人工复核、合规改写和低风险提示边界；质量评分维度用于创作反馈、审核报告和榜单排序。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="blocked">高危 {grouped.high}</StatusBadge>
            <StatusBadge tone="warning">中危 {grouped.medium}</StatusBadge>
            <StatusBadge>低危 {grouped.low}</StatusBadge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
          <h3 className="text-xl font-semibold text-ink">内容安全规则</h3>
          <div className="mt-5 grid gap-3">
            {rules.map((rule) => (
              <article key={rule.id} className="rounded-lg border border-line bg-[#fbfaf6] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-ink">{rule.category}</h4>
                    <p className="mt-1 text-xs text-muted">处理策略：{rule.action}</p>
                  </div>
                  <StatusBadge tone={ruleTone(rule.riskLevel)}>{rule.riskLevel}</StatusBadge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{rule.description}</p>
                <p className="mt-3 rounded-md border border-line bg-white px-3 py-2 text-xs text-muted">
                  识别模式：{rule.pattern}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
          <h3 className="text-xl font-semibold text-ink">质量评分维度</h3>
          <div className="mt-5 space-y-3">
            {qualityDimensions.map((dimension) => (
              <article key={dimension.name} className="rounded-lg border border-line bg-[#fbfaf6] p-4">
                <h4 className="font-semibold text-ink">{dimension.name}</h4>
                <p className="mt-2 text-sm leading-6 text-muted">{dimension.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
