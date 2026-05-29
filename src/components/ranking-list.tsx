"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import type { RankedItem, RankingType } from "@/features/ranking/ranking-service";

const typeLabel: Record<RankingType, string> = {
  hot: "热点榜",
  viral: "爆文榜",
  recommended: "推荐流"
};

function formatNumber(value: number | undefined) {
  return (value ?? 0).toLocaleString("zh-CN");
}

export function RankingList({
  initialItems,
  initialCursor,
  type
}: {
  initialItems: RankedItem[];
  initialCursor: string | null;
  type: RankingType;
}) {
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) {
      return;
    }

    setLoading(true);
    const response = await fetch(
      `/api/ranking?type=${type}&limit=6&cursor=${encodeURIComponent(nextCursor)}`
    );
    const payload = await response.json();

    if (payload.ok) {
      setItems((current) => [...current, ...payload.data.items]);
      setNextCursor(payload.data.nextCursor);
    }

    setLoading(false);
  }, [loading, nextCursor, type]);

  useEffect(() => {
    setItems(initialItems);
    setNextCursor(initialCursor);
  }, [initialCursor, initialItems, type]);

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        void loadMore();
      }
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <article
          key={`${type}-${item.postId}`}
          className="grid gap-4 rounded-lg border border-line bg-white/85 p-4 shadow-soft md:grid-cols-[auto_minmax(0,1fr)_180px]"
        >
          <span className="flex size-11 items-center justify-center rounded-md bg-accent text-sm font-semibold text-white">
            {index + 1}
          </span>

          <a href={`/content/${item.postId}`} className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
              <StatusBadge tone="safe">{typeLabel[type]}</StatusBadge>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
              {item.body}
            </p>
            <p className="mt-3 text-xs text-muted">
              {item.authorName} · {item.tags?.join(" / ")} · {formatNumber(item.views)} 阅读
            </p>
          </a>

          <div className="rounded-md border border-line bg-[#fbfaf6] p-3">
            <p className="text-xs text-muted">综合分</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{item.rankingScore}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
              <span>质量 {item.explanation.qualityContribution}</span>
              <span>热度 {item.explanation.heatContribution}</span>
              <span>新鲜 {item.explanation.freshnessContribution}</span>
              <span>反馈 {item.explanation.feedbackContribution}</span>
            </div>
          </div>
        </article>
      ))}

      <div ref={sentinelRef} className="flex min-h-12 items-center justify-center">
        {nextCursor ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "加载中" : "加载更多"}
          </button>
        ) : (
          <span className="text-sm text-muted">已加载全部内容</span>
        )}
      </div>
    </div>
  );
}
