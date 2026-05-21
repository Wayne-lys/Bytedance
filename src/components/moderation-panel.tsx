import { StatusBadge } from "@/components/status-badge";

type ModerationSummary = {
  riskLevel: string;
  riskTypes: string[];
  reason: string;
  suggestedAction: string;
};

export function ModerationPanel({ result }: { result: ModerationSummary }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-ink">安全审核</h3>
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
      <p className="mt-2 text-sm font-medium text-ink">
        建议动作：{result.suggestedAction}
      </p>
      <p className="mt-2 text-sm text-muted">风险类型：{result.riskTypes.join("、")}</p>
    </div>
  );
}
