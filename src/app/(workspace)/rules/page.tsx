import { AuditRuleCard } from "@/components/audit-rule-card";
import { AuditRuleForm } from "@/components/audit-rule-form";
import { StatusBadge } from "@/components/status-badge";
import { hasPermissionAsync } from "@/features/auth/role-service";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const qualityDimensions = [
  { name: "原创性", description: "避免模板化复述，鼓励具体经验和真实场景。" },
  { name: "结构", description: "标题、开头、分点和结尾形成清晰阅读路径。" },
  { name: "信息密度", description: "每段提供可执行信息，减少空泛表达。" },
  { name: "表达清晰", description: "句子短、指代明确，适合信息流快速扫读。" },
  { name: "互动潜力", description: "包含收藏、评论或行动提示，但不诱导违规互动。" },
  { name: "平台适配", description: "符合头条信息流图文内容的标题和正文节奏。" }
];

export default async function RulesPage() {
  const currentUser = await getCurrentUser();
  const canManageRules = await hasPermissionAsync(currentUser?.role, "manage_rules");

  if (!currentUser || !canManageRules) {
    return (
      <section className="studio-panel p-6">
        <p className="text-xs font-semibold text-accent">规则体系</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">规则体系</h2>
        <div className="mt-5 rounded-md border border-line bg-panel-muted px-4 py-3 text-sm leading-6 text-muted">
          当前账号没有规则管理权限。请使用管理员账号登录后再操作。
        </div>
      </section>
    );
  }

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
      <div className="studio-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-accent">规则体系</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">规则体系</h2>
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

      <div className="grid gap-4">
        <section className="studio-panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-ink">内容安全规则</h3>
              <p className="mt-1 text-sm text-muted">
                {canManageRules
                  ? "可新增临时审核规则，立刻进入规则库展示和后续审核说明。"
                  : "当前为只读规则库。新增、编辑和删除规则需要管理员权限。"}
              </p>
            </div>
          </div>
          {canManageRules ? (
            <div className="mt-4">
              <AuditRuleForm />
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-line bg-panel-muted px-4 py-3 text-sm leading-6 text-muted">
              只读模式：规则变更会影响全局审核结果，仅管理员可以维护。
            </div>
          )}
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {rules.map((rule) => (
              <AuditRuleCard
                key={rule.id}
                canManageRules={canManageRules}
                rule={{
                  id: rule.id,
                  category: rule.category,
                  description: rule.description,
                  riskLevel: rule.riskLevel,
                  pattern: rule.pattern,
                  action: rule.action
                }}
              />
            ))}
          </div>
        </section>

        <section className="studio-panel p-6">
          <h3 className="text-xl font-semibold text-ink">质量评分维度</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {qualityDimensions.map((dimension) => (
              <article key={dimension.name} className="studio-tile p-4">
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
