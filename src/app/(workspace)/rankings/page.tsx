import { RankingList } from "@/components/ranking-list";
import {
  getRankingItems,
  type RankingType
} from "@/features/ranking/ranking-service";

const tabs: Array<{ id: RankingType; label: string; description: string }> = [
  {
    id: "hot",
    label: "热点榜",
    description: "实时热度、质量和新鲜度综合排序。"
  },
  {
    id: "viral",
    label: "爆文榜",
    description: "突出互动和传播潜力。"
  },
  {
    id: "recommended",
    label: "推荐流",
    description: "平衡质量、安全和用户反馈。"
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
      <div className="studio-panel overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-6">
            <p className="text-xs font-semibold text-accent">Distribution Desk</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">热点与推荐榜单</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              质量分、热度、发布时间新鲜度、用户反馈和风险惩罚共同决定排序，支持 cursor 分页和滚动加载。
            </p>
          </div>
          <aside className="border-t border-line bg-sidebar p-6 text-white lg:border-l lg:border-t-0">
            <p className="text-xs text-[#cbbfb1]">排序公式</p>
            <p className="mt-3 text-lg font-semibold leading-7">
              质量 45% / 热度 30% / 新鲜度 15% / 反馈 10%
            </p>
            <p className="mt-3 text-xs leading-5 text-[#a99d90]">风险惩罚会在最终分中扣减。</p>
          </aside>
        </div>

        <nav className="grid gap-2 border-t border-line bg-panel-muted p-3 md:grid-cols-3" aria-label="榜单类型">
          {tabs.map((tab) => {
            const active = activeType === tab.id;

            return (
              <a
                key={tab.id}
                href={`/rankings?type=${tab.id}`}
                className={`rounded-md border px-4 py-3 transition ${
                  active
                    ? "border-accent bg-accent text-white shadow-crisp"
                    : "border-line bg-panel text-muted hover:border-accent hover:text-ink"
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
