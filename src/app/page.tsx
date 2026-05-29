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
    { label: "草稿数", value: drafts.toString(), tone: "neutral" as const, meta: "自动保存" },
    { label: "已发布", value: published.toString(), tone: "safe" as const, meta: "可进入榜单" },
    {
      label: "平均质量分",
      value: Math.round(quality._avg.total ?? 0).toString(),
      tone: "safe" as const,
      meta: "六维评分"
    },
    { label: "审核通过率", value: `${passRate}%`, tone: "safe" as const, meta: "安全闸门" }
  ];
}

const modules = [
  {
    title: "创作台",
    href: "/create",
    description: "选题、受众、平台和 Prompt 汇入编辑器，生成可审核的短图文草稿。",
    status: "主流程入口",
    index: "01"
  },
  {
    title: "素材库",
    href: "/materials",
    description: "素材合规校验、风险说明和引用次数沉淀为创作前置资产。",
    status: "内容资产",
    index: "02"
  },
  {
    title: "审核与质量",
    href: "/review",
    description: "风险命中、质量评分和合规改写构成发布前的安全闭环。",
    status: "安全闭环",
    index: "03"
  },
  {
    title: "热点榜单",
    href: "/rankings",
    description: "质量、热度、新鲜度、反馈和风险惩罚共同决定分发排序。",
    status: "分发评估",
    index: "04"
  }
];

const deliveryRows = [
  ["核心功能覆盖", "18 / 18", "登录、创作、审核、发布、榜单、详情"],
  ["进阶挑战", "3 / 3", "短图文编辑器、高危识别、智能排序"],
  ["AI 模式", "Real API + Mock", "OpenAI 兼容接口，失败自动兜底"],
  ["LCP 目标", "< 2.5s", "Playwright 浏览器指标验证"]
];

export default async function Home() {
  const metrics = await getDashboardMetrics();

  return (
    <AppShell
      eyebrow="Toutiao AI Frontend Camp"
      title="AI 创作者工作台"
      description="用一个面向答辩展示的内容中台，把 AI 生成、审核、发布、分发和效果评估组织成可演示的闭环。"
    >
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="studio-panel overflow-hidden">
          <div className="grid min-h-[360px] gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="safe">MVP 完成</StatusBadge>
                <StatusBadge tone="warning">进阶挑战已接入</StatusBadge>
              </div>
              <h2 className="mt-8 max-w-3xl text-4xl font-semibold leading-tight text-ink md:text-5xl">
                从灵感到分发的 AI 内容生产控制台
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted">
                首页承担答辩开场：评委能快速看到主链路、关键指标、进阶能力和性能承诺，再进入各模块验证细节。
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/create"
                  className="studio-button inline-flex h-11 items-center justify-center bg-accent px-5 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar"
                >
                  进入创作台
                </a>
                <a
                  href="/evaluation"
                  className="studio-button inline-flex h-11 items-center justify-center border border-line bg-panel px-5 text-sm font-semibold text-ink hover:border-accent"
                >
                  查看评估报告
                </a>
              </div>
            </div>

            <aside className="border-t border-line bg-sidebar p-6 text-white lg:border-l lg:border-t-0">
              <p className="text-sm text-[#cabfb2]">Delivery Board</p>
              <div className="mt-6 space-y-5">
                {deliveryRows.map(([label, value, detail]) => (
                  <div key={label} className="border-b border-white/10 pb-4 last:border-b-0">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-sm text-[#cabfb2]">{label}</span>
                      <span className="text-xl font-semibold">{value}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#a99d90]">{detail}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {metrics.map((metric) => (
            <div key={metric.label} className="studio-tile p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">{metric.label}</p>
                  <p className="mt-2 text-4xl font-semibold text-ink">{metric.value}</p>
                </div>
                <StatusBadge tone={metric.tone}>{metric.meta}</StatusBadge>
              </div>
              <div className="studio-rule mt-5 h-1 rounded-full" />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        {modules.map((module) => (
          <a
            key={module.href}
            href={module.href}
            className="studio-tile group grid min-h-44 gap-5 p-5 transition hover:-translate-y-0.5 hover:border-accent md:grid-cols-[72px_minmax(0,1fr)]"
          >
            <div className="flex size-[72px] items-center justify-center rounded-md bg-sidebar text-xl font-semibold text-white shadow-crisp">
              {module.index}
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-semibold text-ink">{module.title}</h3>
                <span className="text-sm font-semibold text-accent">{module.status}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{module.description}</p>
              <span className="mt-5 inline-flex text-sm font-semibold text-ink group-hover:text-accent">
                打开模块
              </span>
            </div>
          </a>
        ))}
      </section>
    </AppShell>
  );
}
