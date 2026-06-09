import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getPermissionsForRoleAsync } from "@/features/auth/role-service";
import { getHomePreviewMaterial } from "@/features/materials/home-preview-service";
import { getCurrentUser } from "@/lib/auth";
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

const pipeline = [
  {
    step: "灵感",
    title: "素材资产与选题进入工作台",
    detail: "把入库素材、Prompt 模板和平台目标放在同一张操作面板。"
  },
  {
    step: "生成",
    title: "AI 产出可审草稿",
    detail: "生成标题、正文、标签和封面引用，同时保留 mock fallback。"
  },
  {
    step: "把关",
    title: "规则审核和质量评分",
    detail: "风险等级、命中规则、改写建议和六维质量分一起呈现。"
  },
  {
    step: "分发",
    title: "发布后进入榜单排序",
    detail: "热度、新鲜度、反馈和风险惩罚共同驱动推荐展示。"
  }
];

const creatorPipeline = [
  {
    step: "准备",
    title: "素材资产与选题进入工作台",
    detail: "把入库素材、Prompt 模板和平台目标放在同一张操作面板。"
  },
  {
    step: "生成",
    title: "AI 产出可发布草稿",
    detail: "生成标题、正文、标签和封面引用，同时保留 mock fallback。"
  },
  {
    step: "反馈",
    title: "查看合规反馈和质量分",
    detail: "系统返回风险提示、改写建议和质量评分，辅助二次调整。"
  },
  {
    step: "观察",
    title: "发布后查看榜单表现",
    detail: "热度、新鲜度、反馈和风险惩罚共同驱动推荐展示。"
  }
];

const systemSummary = [
  ["覆盖范围", "创作、素材资产、Prompt 模板、审核、发布、榜单、规则、权限、评估"],
  ["AI 接入", "OpenAI 兼容接口，支持本地 mock 兜底"],
  ["治理能力", "高危规则识别、质量评分、内容下线与回滚"],
  ["性能验证", "首页、榜单和详情页纳入浏览器 LCP 检测"]
];

const creatorSystemSummary = [
  ["可用范围", "创作、素材资产、Prompt 模板、榜单"],
  ["AI 接入", "OpenAI 兼容接口，支持本地 mock 兜底"],
  ["内容反馈", "合规提示、质量评分和发布建议辅助创作者调整"],
  ["性能验证", "首页、榜单和详情页纳入浏览器 LCP 检测"]
];

const operationPanels = [
  {
    label: "素材资产库",
    title: "封面与配图归档",
    detail: "入库素材保留合规状态、风险说明、引用次数和文件来源。",
    status: "已审核"
  },
  {
    label: "Prompt 模板中心",
    title: "生成策略维护",
    detail: "按场景维护模板、变量和启用状态，避免临时拼写提示词。",
    status: "已启用"
  },
  {
    label: "审核规则库",
    title: "内容安全策略",
    detail: "集中管理高危、导流、隐私和低质内容识别规则。",
    status: "运行中"
  }
];

const reviewSignals = ["素材合规", "Prompt 可追踪", "质量评分", "榜单分发"];

function materialComplianceLabel(compliance: string | null | undefined) {
  if (compliance === "safe") {
    return "已通过";
  }

  if (compliance === "warning") {
    return "需注意";
  }

  return "待审核";
}

export default async function Home() {
  const [metrics, currentUser, previewMaterial] = await Promise.all([
    getDashboardMetrics(),
    getCurrentUser(),
    getHomePreviewMaterial()
  ]);
  const userPermissions = await getPermissionsForRoleAsync(currentUser?.role);
  const canReviewContent = userPermissions.includes("review_content");
  const canManageRules = userPermissions.includes("manage_rules");
  const canManageUsers = userPermissions.includes("manage_users");
  const canSeeGovernanceSummary = canManageRules || canManageUsers;
  const visibleOperationPanels = canManageRules
    ? operationPanels
    : operationPanels.filter((panel) => panel.label !== "审核规则库");
  const visiblePipeline = canReviewContent ? pipeline : creatorPipeline;
  const visibleSystemSummary = canSeeGovernanceSummary
    ? systemSummary
    : creatorSystemSummary;
  const visibleMetrics = canReviewContent
    ? metrics
    : metrics.map((metric) =>
        metric.label === "审核通过率"
          ? { ...metric, label: "合规通过率", meta: "合规反馈" }
          : metric
      );

  return (
    <AppShell
      eyebrow="系统首页"
      title={canReviewContent ? "AI 创作者内容管理平台" : "AI 创作者内容生产平台"}
      description={
        canReviewContent
          ? "面向短图文创作者的生产与治理系统，覆盖素材管理、AI 生成、合规审核、发布管理和榜单分发。"
          : "面向短图文创作者的生产系统，覆盖素材管理、AI 生成、发布准备和榜单观察。"
      }
    >
      <section className="home-hero overflow-visible rounded-lg border border-line bg-sidebar text-white shadow-soft">
        <div className="grid min-h-[520px] lg:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.96fr)]">
          <div className="relative z-10 flex flex-col justify-between p-5 sm:p-7 lg:p-9">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="safe">系统已就绪</StatusBadge>
                <StatusBadge tone="neutral">流程闭环</StatusBadge>
                <StatusBadge tone="neutral">
                  {canManageUsers ? "权限治理" : "创作者视图"}
                </StatusBadge>
              </div>
              <p className="mt-10 text-xs font-semibold uppercase text-[#d9c7b4]">
                System Overview
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] text-[#fffaf0] sm:text-5xl 2xl:text-6xl">
                {canReviewContent ? "AI 内容生产与审核工作台" : "AI 内容生产工作台"}
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#d9c7b4]">
                {canReviewContent
                  ? "首页用于集中呈现系统边界、运行指标和核心入口。用户可以从这里进入创作、素材资产、Prompt 模板、审核、内容管理、榜单、规则与权限等模块，完成从生成到分发的完整业务流程。"
                  : "首页用于集中呈现创作者可用入口、运行指标和内容生产流程。用户可以从这里进入创作、素材资产和榜单，完成从素材准备到发布观察的日常工作。"}
              </p>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="/create"
                className="studio-button inline-flex h-12 items-center justify-center bg-accent px-5 text-sm font-semibold text-white shadow-crisp hover:bg-[#f05a36]"
              >
                进入创作台
              </a>
              {canReviewContent ? (
                <a
                  href="/review"
                  className="studio-button inline-flex h-12 items-center justify-center border border-white/18 bg-white/[0.06] px-5 text-sm font-semibold text-[#fffaf0] hover:border-white/40"
                >
                  查看审核台
                </a>
              ) : null}
              <a
                href="/rankings"
                className="studio-button inline-flex h-12 items-center justify-center border border-white/18 bg-white/[0.06] px-5 text-sm font-semibold text-[#fffaf0] hover:border-white/40"
              >
                进入榜单
              </a>
            </div>
          </div>

          <div className="relative min-h-[420px] border-t border-white/10 bg-[#111715] p-5 sm:p-7 lg:border-l lg:border-t-0">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <div className="relative z-10 mx-auto flex h-full max-w-xl flex-col justify-center">
              <div className="home-deck rounded-lg border border-white/14 bg-[#f8f1e4] p-4 text-ink shadow-[0_26px_80px_rgba(0,0,0,0.34)]">
                <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                  <div>
                    <p className="text-xs font-semibold text-accent">内容生产预览</p>
                    <h3 className="mt-1 text-xl font-semibold leading-tight">封面资产与生成策略</h3>
                  </div>
                  <span className="rounded-md border border-teal/25 bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">
                    流程可用
                  </span>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
                  <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-crisp">
                    <div className="border-b border-line px-4 py-3">
                      <p className="text-xs font-semibold text-accent">封面资产</p>
                      <p className="mt-1 text-lg font-semibold leading-tight">
                        {previewMaterial?.name ?? "暂无封面素材"}
                      </p>
                    </div>
                    {previewMaterial ? (
                      <Image
                        src={previewMaterial.url}
                        alt={previewMaterial.name}
                        width={960}
                        height={540}
                        className="aspect-[16/10] w-full object-cover"
                        priority
                      />
                    ) : (
                      <div className="flex aspect-[16/10] w-full items-center justify-center bg-panel-muted px-5 text-center text-sm leading-6 text-muted">
                        素材库暂无可用图片，上传或恢复素材后这里会自动更新。
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 border-t border-line bg-panel-muted p-3 text-xs">
                      <div>
                        <p className="text-muted">合规状态</p>
                        <p className="mt-1 font-semibold text-teal">
                          {previewMaterial
                            ? materialComplianceLabel(previewMaterial.compliance)
                            : "暂无素材"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted">引用次数</p>
                        <p className="mt-1 font-semibold text-ink">
                          {previewMaterial ? `${previewMaterial.referenceCount} 次` : "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {visibleOperationPanels.map((panel) => (
                      <div key={panel.label} className="rounded-lg border border-line bg-panel px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-accent">{panel.label}</p>
                            <p className="mt-1 text-base font-semibold leading-tight text-ink">
                              {panel.title}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-md border border-teal/25 bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal">
                            {panel.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted">{panel.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-line bg-[#1d1916] p-4 text-[#fffaf0]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-[#d9c7b4]">质量评分</p>
                    <span className="text-3xl font-semibold">85</span>
                  </div>
                  <div className="studio-rule mt-3 h-1.5 rounded-full" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {reviewSignals.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-md border border-white/12 bg-white/[0.05] px-2 py-1 text-xs text-[#d9c7b4]"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visibleMetrics.map((metric) => (
          <div key={metric.label} className="studio-tile p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted">{metric.label}</p>
                <p className="mt-2 text-4xl font-semibold leading-none text-ink">{metric.value}</p>
              </div>
              <StatusBadge tone={metric.tone}>{metric.meta}</StatusBadge>
            </div>
            <div className="studio-rule mt-5 h-1 rounded-full" />
          </div>
        ))}
      </section>

      <section className="mt-4 grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="studio-panel flex h-full flex-col p-4 md:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-accent">
                Workflow
              </p>
              <h3 className="mt-1.5 text-2xl font-semibold leading-tight text-ink">
                内容生产流程
              </h3>
            </div>
            <a
              href={canReviewContent ? "/posts" : "/rankings"}
              className="studio-button inline-flex h-10 items-center justify-center border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent"
            >
              {canReviewContent ? "管理已发布内容" : "查看榜单表现"}
            </a>
          </div>

          <div className="mt-4 grid flex-1 gap-3 lg:grid-cols-4">
            {visiblePipeline.map((item, index) => (
              <div
                key={item.step}
                className="relative flex min-h-44 flex-col overflow-hidden rounded-lg border border-line bg-panel/85 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-accent">{item.step}</span>
                  <span className="text-sm text-muted">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h4 className="mt-4 min-h-14 text-lg font-semibold leading-7 text-ink">
                  {item.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
                <div className="mt-auto pt-4">
                  <div className="h-1 rounded-full bg-line">
                    <div className="h-1 rounded-full bg-accent/70" style={{ width: `${(index + 1) * 25}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="studio-panel p-4 md:p-5">
          <div>
            <p className="text-xs font-semibold uppercase text-accent">System Scope</p>
            <h3 className="mt-1.5 text-2xl font-semibold leading-tight text-ink">系统概览</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              以正式工作台方式汇总当前系统能力，便于快速了解模块范围和治理能力。
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {visibleSystemSummary.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line bg-panel/80 p-3">
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="mt-1.5 text-xs leading-5 text-muted">{value}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

    </AppShell>
  );
}
