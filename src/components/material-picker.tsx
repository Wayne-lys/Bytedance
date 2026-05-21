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
      {materials.map((material) => (
        <article key={material.id} className="rounded-lg border border-line bg-[#fbfaf6] p-4">
          <div className="aspect-[16/9] rounded-md border border-line bg-white" />
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
