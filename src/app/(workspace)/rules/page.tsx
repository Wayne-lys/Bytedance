import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/db";

export default async function RulesPage() {
  const rules = await prisma.auditRule.findMany({
    orderBy: [{ riskLevel: "asc" }, { category: "asc" }]
  });

  return (
    <section className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
      <h2 className="text-2xl font-semibold text-ink">规则体系</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        内容安全规则库和质量评分体系会作为审核、改写、评估报告的共同依据。
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {rules.map((rule) => (
          <article key={rule.id} className="rounded-lg border border-line bg-[#fbfaf6] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-ink">{rule.category}</h3>
              <StatusBadge
                tone={
                  rule.riskLevel === "high"
                    ? "blocked"
                    : rule.riskLevel === "medium"
                      ? "warning"
                      : "neutral"
                }
              >
                {rule.action}
              </StatusBadge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{rule.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
