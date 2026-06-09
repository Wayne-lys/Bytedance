"use client";

import { useMemo, useState } from "react";
import { ModerationPanel } from "@/components/moderation-panel";
import { QualityScoreCard } from "@/components/quality-score-card";
import { StatusBadge } from "@/components/status-badge";

type QualityScore = {
  originality: number;
  structure: number;
  informationDensity: number;
  clarity: number;
  interactionPotential: number;
  platformFit: number;
  total: number;
};

type ReviewRecord = {
  id: string;
  title: string;
  body: string;
  riskLevel: string;
  riskTypes: string[];
  reason: string;
  suggestedAction: string;
  quality: QualityScore;
};

function riskTone(riskLevel: string) {
  return riskLevel === "high"
    ? "blocked"
    : riskLevel === "medium" || riskLevel === "low"
      ? "warning"
      : "safe";
}

export function ReviewWorkspace({
  canReviewContent,
  records,
  fallbackRecord
}: {
  canReviewContent: boolean;
  records: ReviewRecord[];
  fallbackRecord: ReviewRecord;
}) {
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? fallbackRecord.id);
  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? fallbackRecord,
    [fallbackRecord, records, selectedId]
  );

  return (
    <section className="grid gap-4 xl:h-[calc(100vh-14rem)] xl:min-h-[640px] xl:grid-cols-[0.95fr_1.05fr] xl:items-stretch xl:overflow-hidden">
      <div
        className="studio-panel flex min-h-0 flex-col overflow-hidden p-6"
        data-testid="review-detail-panel"
      >
        <p className="text-xs font-semibold text-accent">Review Desk</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">审核与质量</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          这里会展示风险等级、命中规则、质量分和合规改写前后对比。
        </p>
        <div className="mt-4 rounded-md border border-line bg-panel-muted px-3 py-2 text-sm leading-6 text-muted">
          {canReviewContent
            ? "当前账号具备内容审核权限，可在创作台执行审核动作。"
            : "当前账号只能查看审核记录；执行审核需要审核员或管理员权限。"}
        </div>

        <div className="mt-5 grid min-h-0 gap-4 overflow-y-auto pr-1">
          <div className="studio-tile p-4">
            <p className="text-xs font-semibold text-accent">Selected Record</p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold leading-6 text-ink">
                  {selectedRecord.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                  {selectedRecord.body}
                </p>
              </div>
              <StatusBadge tone={riskTone(selectedRecord.riskLevel)}>
                {selectedRecord.riskLevel}
              </StatusBadge>
            </div>
          </div>
          <ModerationPanel
            result={{
              riskLevel: selectedRecord.riskLevel,
              riskTypes: selectedRecord.riskTypes,
              reason: selectedRecord.reason,
              suggestedAction: selectedRecord.suggestedAction
            }}
          />
          <QualityScoreCard score={selectedRecord.quality} />
        </div>
      </div>

      <div className="min-h-0 space-y-3 xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
        {records.length === 0 ? (
          <div className="studio-tile p-5 text-sm text-muted">暂无审核记录。</div>
        ) : (
          records.map((record) => {
            const selected = selectedRecord.id === record.id;

            return (
              <button
                key={record.id}
                type="button"
                aria-label={`查看审核记录 ${record.title}`}
                aria-pressed={selected}
                onClick={() => setSelectedId(record.id)}
                className={`studio-tile block w-full p-5 text-left transition hover:-translate-y-0.5 hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  selected ? "border-accent bg-accent/10 shadow-crisp" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="min-w-0 truncate font-semibold text-ink" title={record.title}>
                    {record.title}
                  </h3>
                  <StatusBadge tone={riskTone(record.riskLevel)}>
                    {record.riskLevel}
                  </StatusBadge>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
                  {record.reason}
                </p>
                <p className="mt-3 text-sm font-medium text-ink">
                  质量分：{record.quality.total}
                </p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
