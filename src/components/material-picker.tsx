import { StatusBadge } from "@/components/status-badge";

type MaterialCard = {
  id: string;
  name: string;
  compliance: string;
  referenceCount: number;
  riskReason: string | null;
};

export function MaterialPicker({ materials }: { materials: MaterialCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {materials.map((material, index) => (
        <article key={material.id} className="studio-tile overflow-hidden">
          <div className="relative aspect-[16/9] border-b border-line bg-panel-muted">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(217,75,43,0.16),transparent_36%),linear-gradient(45deg,rgba(17,116,111,0.14),transparent_44%)]" />
            <div className="absolute left-4 top-4 rounded-md bg-sidebar px-3 py-1 text-xs font-semibold text-white">
              Asset {String(index + 1).padStart(2, "0")}
            </div>
          </div>
          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-ink">{material.name}</h3>
              <p className="mt-1 text-sm text-muted">引用 {material.referenceCount} 次</p>
            </div>
            <StatusBadge
              tone={
                material.compliance === "safe"
                  ? "safe"
                  : material.compliance === "warning"
                    ? "warning"
                    : "blocked"
              }
            >
              {material.compliance}
            </StatusBadge>
          </div>
          {material.riskReason ? (
            <p className="mt-3 text-sm leading-6 text-muted">{material.riskReason}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
