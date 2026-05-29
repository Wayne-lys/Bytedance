import { StatusBadge } from "@/components/status-badge";

type MaterialCard = {
  id: string;
  name: string;
  url?: string;
  compliance: string;
  referenceCount: number;
  riskReason: string | null;
};

const complianceLabel: Record<string, string> = {
  safe: "通过",
  warning: "预警",
  blocked: "阻断"
};

function formatRiskReason(reason: string | null) {
  if (!reason) {
    return "素材基础校验通过，可用于短图文生成。";
  }

  const keyword = reason.split("：").at(-1);

  return keyword ? `风险词：${keyword}` : reason;
}

export function MaterialPicker({ materials }: { materials: MaterialCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {materials.map((material, index) => (
        <article key={material.id} className="studio-tile flex min-h-[310px] flex-col overflow-hidden">
          <div className="relative aspect-[16/10] border-b border-line bg-panel-muted">
            {material.url ? (
              <img src={material.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(217,75,43,0.12),transparent_36%),linear-gradient(45deg,rgba(17,116,111,0.12),transparent_44%)]" />
            )}
            <div className="absolute left-3 top-3 rounded-md bg-sidebar px-2.5 py-1 text-xs font-semibold text-white">
              Asset {String(index + 1).padStart(2, "0")}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <h3
                  className="truncate text-base font-semibold leading-6 text-ink"
                  title={material.name}
                >
                  {material.name}
                </h3>
                <p className="mt-1 text-sm leading-5 text-muted">
                  引用 {material.referenceCount} 次
                </p>
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
                {complianceLabel[material.compliance] ?? material.compliance}
              </StatusBadge>
            </div>

            <div className="mt-auto pt-4">
              <p className="text-sm leading-6 text-muted">
                {formatRiskReason(material.riskReason)}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
