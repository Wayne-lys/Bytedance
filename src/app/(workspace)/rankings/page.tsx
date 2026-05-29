import { RankingList } from "@/components/ranking-list";
import {
  getRankingItems,
  type RankingType
} from "@/features/ranking/ranking-service";

const tabs: Array<{ id: RankingType; label: string; description: string }> = [
  {
    id: "hot",
    label: "热点榜",
    description: "按实时热度、质量和新鲜度综合排序。"
  },
  {
    id: "viral",
    label: "爆文榜",
    description: "突出高互动内容，适合展示传播潜力。"
  },
  {
    id: "recommended",
    label: "推荐流",
    description: "平衡质量、安全和用户反馈，模拟信息流推荐。"
  }
];

function normalizeType(type: string | undefined): RankingType {
  if (type === "viral" || type === "recommended") {
    return type;
  }

  return "hot";
}

export default async function RankingsPage({
  searchParams
}: {
  searchParams?: { type?: string };
}) {
  const activeType = normalizeType(searchParams?.type);
  const ranking = await getRankingItems({
    type: activeType,
    limit: 6
  });

  return (
    <section className="space-y-5" data-testid="rankings-page">
      <div className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-ink">热点与推荐榜单</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              榜单综合质量分、热度、发布时间新鲜度、用户反馈和风险惩罚，支持 cursor 分页和滚动加载。
            </p>
          </div>
          <div className="rounded-md border border-line bg-[#fbfaf6] px-4 py-3 text-sm text-muted">
            公式：质量 45% · 热度 30% · 新鲜度 15% · 反馈 10%
          </div>
        </div>

        <nav className="mt-6 flex gap-2 overflow-x-auto" aria-label="榜单类型">
          {tabs.map((tab) => {
            const active = activeType === tab.id;

            return (
              <a
                key={tab.id}
                href={`/rankings?type=${tab.id}`}
                className={`min-w-40 shrink-0 rounded-md border px-4 py-3 transition ${
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-white text-muted hover:border-accent hover:text-ink"
                }`}
              >
                <span className="block text-sm font-semibold">{tab.label}</span>
                <span className="mt-1 block text-xs opacity-80">{tab.description}</span>
              </a>
            );
          })}
        </nav>
      </div>

      <RankingList
        type={activeType}
        initialItems={ranking.items}
        initialCursor={ranking.nextCursor}
      />
    </section>
  );
}
