import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/db";

async function getDashboardMetrics() {
  const [drafts, published, quality, moderation] = await Promise.all([
    prisma.draft.count(),
    prisma.post.count({ where: { status: "published" } }),
    prisma.qualityScore.aggregate({ _avg: { total: true } }),
    prisma.moderationResult.findMany({ select: { riskLevel: true } })
  ]);

  const passedModeration = moderation.filter(
    (item) => item.riskLevel === "safe" || item.riskLevel === "low"
  ).length;
  const passRate =
    moderation.length === 0
      ? 0
      : Math.round((passedModeration / moderation.length) * 100);

  return [
    { label: "草稿数", value: drafts.toString(), tone: "neutral" as const },
    { label: "已发布", value: published.toString(), tone: "safe" as const },
    {
      label: "平均质量分",
      value: Math.round(quality._avg.total ?? 0).toString(),
      tone: "safe" as const
    },
    { label: "审核通过率", value: `${passRate}%`, tone: "safe" as const }
  ];
}

const modules = [
  {
    title: "创作台",
    href: "/create",
    description: "围绕素材、选题、受众、平台和 Prompt 生成短图文草稿。",
    status: "主流程入口"
  },
  {
    title: "素材库",
    href: "/materials",
    description: "上传图片素材，查看合规状态、风险说明和引用次数。",
    status: "内容资产"
  },
  {
    title: "审核与质量",
    href: "/review",
    description: "展示风险命中、质量评分和一键合规改写结果。",
    status: "安全防火墙"
  },
  {
    title: "热点榜单",
    href: "/rankings",
    description: "按质量、热度、新鲜度、反馈和风险惩罚综合排序。",
    status: "分发评估"
  }
];

export default async function Home() {
  const metrics = await getDashboardMetrics();

  return (
    <AppShell
      eyebrow="Toutiao AI Frontend Camp"
      title="AI 创作者工作台"
      description="当前基线已经接入本地数据库、演示账号和认证接口；后续任务会继续把素材、创作、审核、发布和榜单串成完整闭环。"
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-line bg-white/85 p-5 shadow-soft"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">{metric.label}</p>
              <StatusBadge tone={metric.tone}>种子数据</StatusBadge>
            </div>
            <p className="mt-4 text-3xl font-semibold text-ink">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-ink">演示主链路</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                从登录到发布分发的关键能力会按实施计划逐步接入。当前页面先提供清晰入口和种子指标。
              </p>
            </div>
            <StatusBadge tone="safe">Task 4</StatusBadge>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {modules.map((module) => (
              <a
                key={module.href}
                href={module.href}
                className="rounded-lg border border-line bg-[#fbfaf6] p-4 transition hover:-translate-y-0.5 hover:border-accent"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink">{module.title}</h3>
                  <span className="text-xs text-accent">{module.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{module.description}</p>
              </a>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-ink">交付指标</h2>
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">核心功能覆盖</span>
                <span className="font-medium text-ink">18 / 18</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#e7e2d6]">
                <div className="h-2 rounded-full bg-accent" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">进阶挑战</span>
                <span className="font-medium text-ink">3 / 3</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#e7e2d6]">
                <div className="h-2 rounded-full bg-warn" style={{ width: "100%" }} />
              </div>
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
