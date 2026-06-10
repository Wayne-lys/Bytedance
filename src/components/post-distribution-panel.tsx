"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";

export type PostDistributionView = {
  id: string;
  platform: string;
  platformLabel: string;
  status: string;
  externalId: string;
  externalUrl: string | null;
  message: string | null;
  syncedAt: Date | string;
};

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function findDouyinDistribution(distributions: PostDistributionView[]) {
  return distributions.find((item) => item.platform === "douyin") ?? null;
}

function canDistribute(status: string, moderationRiskLevel?: string | null) {
  return (
    status === "published" &&
    moderationRiskLevel !== "high" &&
    moderationRiskLevel !== "medium"
  );
}

export function PostDistributionPanel({
  postId,
  status,
  moderationRiskLevel,
  initialDistributions
}: {
  postId: string;
  status: string;
  moderationRiskLevel?: string | null;
  initialDistributions: PostDistributionView[];
}) {
  const [distributions, setDistributions] = useState(initialDistributions);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const douyinDistribution = findDouyinDistribution(distributions);
  const distributable = canDistribute(status, moderationRiskLevel);

  async function syncToDouyin() {
    if (pending || douyinDistribution || !distributable) {
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const response = await fetch(`/api/posts/${postId}/distributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "douyin" })
      });
      const payload = await response.json();

      if (!payload.ok) {
        throw new Error(payload.error ?? "同步失败");
      }

      setDistributions((current) => [
        payload.data.distribution,
        ...current.filter((item) => item.platform !== "douyin")
      ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "同步失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="studio-panel p-5" data-testid="post-distribution-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-accent">Distribution</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">外部分发</h2>
        </div>
        <StatusBadge tone={douyinDistribution ? "safe" : "neutral"}>
          {douyinDistribution ? "模拟同步成功" : "待同步"}
        </StatusBadge>
      </div>

      <div className="mt-4 rounded-md border border-line bg-panel-muted p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-ink">抖音图文</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              沙盒适配器模拟开放 API 一键分发，并记录外部作品 ID。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void syncToDouyin()}
            disabled={pending || Boolean(douyinDistribution) || !distributable}
            className="studio-button inline-flex h-10 items-center justify-center bg-sidebar px-4 text-sm font-semibold text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending
              ? "同步中"
              : douyinDistribution
                ? "已同步"
                : "同步到抖音图文"}
          </button>
        </div>

        {douyinDistribution ? (
          <div className="mt-4 divide-y divide-line/80 border-t border-line pt-2">
            {[
              ["同步状态", "模拟同步成功"],
              ["外部作品 ID", douyinDistribution.externalId],
              ["同步时间", formatDate(douyinDistribution.syncedAt)]
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4 py-2"
              >
                <span className="text-sm text-muted">{label}</span>
                <span className="max-w-[180px] truncate text-right text-sm font-semibold text-ink">
                  {value}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {!distributable ? (
        <p className="mt-3 rounded-md border border-line bg-panel-muted px-3 py-2 text-sm text-muted">
          内容需保持已发布且审核通过后才能同步。
        </p>
      ) : null}

      {message ? (
        <p className="mt-3 rounded-md border border-accent/30 bg-panel-muted px-3 py-2 text-sm text-accent">
          {message}
        </p>
      ) : null}
    </section>
  );
}
