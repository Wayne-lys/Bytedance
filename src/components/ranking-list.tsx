"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import type { RankedItem, RankingType } from "@/features/ranking/ranking-service";

const typeLabel: Record<RankingType, string> = {
  hot: "热点榜",
  latest: "新发布",
  recommended: "推荐流"
};

function formatNumber(value: number | undefined) {
  return (value ?? 0).toLocaleString("zh-CN");
}

function formatPublishedAt(value: Date | string | null | undefined) {
  if (!value) {
    return "未发布";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
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
  const isLatest = type === "latest";

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
    <div className="space-y-4">
      {items.map((item, index) => (
        <article
          key={`${type}-${item.postId}`}
          className="studio-tile grid gap-4 p-4 transition hover:-translate-y-0.5 hover:border-accent md:grid-cols-[72px_minmax(0,1fr)_210px]"
        >
          <div className="flex size-[72px] items-center justify-center rounded-md bg-sidebar text-2xl font-semibold text-white shadow-crisp">
            {String(index + 1).padStart(2, "0")}
          </div>

          <a
            href={`/content/${item.postId}?from=rankings&type=${encodeURIComponent(type)}`}
            className="min-w-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-ink">{item.title}</h3>
              <StatusBadge tone="safe">{typeLabel[type]}</StatusBadge>
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
              {item.body}
            </p>
            <p className="mt-4 text-xs text-muted">
              {item.authorName} / {formatPublishedAt(item.publishedAt)} / {formatNumber(item.views)} 阅读 / {item.tags?.join(" / ")}
            </p>
          </a>

          <div className="rounded-md border border-line bg-panel-muted p-4">
            <p className="text-xs font-semibold text-accent">
              {type === "hot" ? "阅读次数" : isLatest ? "发布时间" : "分发分"}
            </p>
            {type === "hot" ? (
              <>
                <p className="mt-2 text-4xl font-semibold leading-none text-ink">
                  {formatNumber(item.views)}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted">
                  <span>质量 {item.qualityScore}</span>
                  <span>时效 {item.explanation.freshnessContribution}</span>
                  <span>风险 -{item.explanation.riskPenalty}</span>
                  <span>分发 {item.rankingScore}</span>
                </div>
              </>
            ) : isLatest ? (
              <>
                <p className="mt-2 text-2xl font-semibold leading-tight text-ink">
                  {formatPublishedAt(item.publishedAt)}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted">
                  <span>质量 {item.qualityScore}</span>
                  <span>阅读 {formatNumber(item.views)}</span>
                  <span>时效 {item.explanation.freshnessContribution}</span>
                  <span>风险 -{item.explanation.riskPenalty}</span>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-4xl font-semibold leading-none text-ink">
                  {item.rankingScore}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted">
                  <span>质量 {item.explanation.qualityContribution}</span>
                  <span>时效 {item.explanation.freshnessContribution}</span>
                  <span>风险 -{item.explanation.riskPenalty}</span>
                  <span>总分 {item.rankingScore}</span>
                </div>
              </>
            )}
          </div>
        </article>
      ))}

      <div ref={sentinelRef} className="flex min-h-16 items-center justify-center">
        {nextCursor ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="studio-button border border-line bg-panel px-5 py-2.5 text-sm font-semibold text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
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
