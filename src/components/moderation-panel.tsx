import { StatusBadge } from "@/components/status-badge";

type ModerationSummary = {
  riskLevel: string;
  riskTypes: string[];
  reason: string;
  suggestedAction: string;
};

export function ModerationPanel({ result }: { result: ModerationSummary }) {
  return (
    <div className="studio-tile p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-accent">Safety Gate</p>
          <h3 className="mt-1 font-semibold text-ink">安全审核</h3>
        </div>
        <StatusBadge
          tone={
            result.riskLevel === "high"
              ? "blocked"
              : result.riskLevel === "medium"
                ? "warning"
                : "safe"
          }
        >
          {result.riskLevel}
        </StatusBadge>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{result.reason}</p>
      <p className="mt-3 rounded-md bg-panel-muted px-3 py-2 text-sm font-medium text-ink">
        建议动作: {result.suggestedAction}
      </p>
      <p className="mt-2 text-sm text-muted">风险类型: {result.riskTypes.join("、")}</p>
    </div>
  );
}
