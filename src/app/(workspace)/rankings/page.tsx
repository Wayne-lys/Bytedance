import { RankingList } from "@/components/ranking-list";
import {
  getRankingItems,
  type RankingType
} from "@/features/ranking/ranking-service";

const tabs: Array<{ id: RankingType; label: string; description: string }> = [
  {
    id: "hot",
    label: "热点榜",
    description: "按真实阅读次数由高到低排序。"
  },
  {
    id: "latest",
    label: "新发布",
    description: "按发布时间倒序展示最新内容。"
  },
  {
    id: "recommended",
    label: "推荐流",
    description: "平衡质量、安全和平台适配。"
  }
];

function normalizeType(type: string | undefined): RankingType {
  if (type === "latest" || type === "recommended") {
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
            <h2 className="mt-2 text-3xl font-semibold text-ink">内容分发榜单</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              热点榜按阅读次数排序；新发布按时间排序，推荐流按质量和安全分发。
            </p>
          </div>
          <aside className="border-t border-line bg-sidebar p-6 text-white lg:border-l lg:border-t-0">
            {activeType === "latest" ? (
              <>
                <p className="text-xs text-[#cbbfb1]">排序规则</p>
                <p className="mt-3 text-lg font-semibold leading-7">
                  发布时间由新到旧
                </p>
                <p className="mt-3 text-xs leading-5 text-[#a99d90]">
                  同一发布时间按内容 ID 稳定排序。
                </p>
              </>
            ) : (
              <>
                {activeType === "hot" ? (
                  <>
                    <p className="text-xs text-[#cbbfb1]">排序规则</p>
                    <p className="mt-3 text-lg font-semibold leading-7">
                      阅读次数由高到低
                    </p>
                    <p className="mt-3 text-xs leading-5 text-[#a99d90]">
                      打开内容详情即记录 1 次真实阅读。
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-[#cbbfb1]">排序公式</p>
                    <p className="mt-3 text-lg font-semibold leading-7">
                      质量 75% / 发布时效 25% / 风险扣分
                    </p>
                    <p className="mt-3 text-xs leading-5 text-[#a99d90]">
                      用于推荐流的质量分发参考。
                    </p>
                  </>
                )}
              </>
            )}
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
