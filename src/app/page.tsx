const sections = [
  {
    title: "创作台",
    description: "围绕素材、选题、受众和 Prompt 生成短图文内容。",
    href: "/create"
  },
  {
    title: "素材库",
    description: "上传图片素材，查看基础合规状态和引用情况。",
    href: "/materials"
  },
  {
    title: "内容管理",
    description: "管理草稿、已发布和被驳回内容，支持二次编辑。",
    href: "/posts"
  },
  {
    title: "审核与质量",
    description: "展示安全风险、质量评分和一键合规改写入口。",
    href: "/review"
  },
  {
    title: "热点榜单",
    description: "查看热点榜、爆文榜和推荐流的智能排序解释。",
    href: "/rankings"
  },
  {
    title: "规则体系",
    description: "沉淀内容安全审核规则库和质量评估标准。",
    href: "/rules"
  },
  {
    title: "效果评估",
    description: "展示审核准确率、Prompt 调优和 LCP 性能结果。",
    href: "/evaluation"
  }
];

const metrics = [
  { label: "主链路", value: "创作-审核-发布-分发" },
  { label: "AI 模式", value: "真实 API + Mock 兜底" },
  { label: "性能目标", value: "LCP <= 2.5s" },
  { label: "审核目标", value: "高危识别 90%+" }
];

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <section className="mx-auto flex max-w-7xl flex-col gap-10">
        <header className="flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">
              Toutiao AI Frontend Camp
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              AI 创作者辅助生产与分发平台
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              一个面向短图文创作者的端到端工作台，覆盖素材管理、AI
              生成、内容审核、质量评分、发布分发和效果评估。
            </p>
          </div>
          <div className="rounded-lg border border-line bg-white/70 px-5 py-4 shadow-soft">
            <p className="text-sm text-muted">当前阶段</p>
            <p className="mt-1 text-xl font-semibold text-ink">工程基线已就绪</p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-line bg-white/80 p-5 shadow-soft"
            >
              <p className="text-sm text-muted">{metric.label}</p>
              <p className="mt-2 text-xl font-semibold text-ink">{metric.value}</p>
            </div>
          ))}
        </section>

        <section>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-ink">功能入口</h2>
              <p className="mt-2 text-sm text-muted">
                后续任务会按实施计划逐步接入真实数据和交互。
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <a
                key={section.title}
                href={section.href}
                className="group rounded-lg border border-line bg-white/75 p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-accent"
              >
                <h3 className="text-lg font-semibold text-ink">{section.title}</h3>
                <p className="mt-3 min-h-12 text-sm leading-6 text-muted">
                  {section.description}
                </p>
                <span className="mt-5 inline-flex text-sm font-medium text-accent">
                  进入模块
                  <span className="ml-1 transition group-hover:translate-x-1">→</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
