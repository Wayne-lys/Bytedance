import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/db";

export default async function MaterialsPage() {
  const materials = await prisma.material.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <section className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-ink">素材库</h2>
          <p className="mt-2 text-sm text-muted">
            当前展示种子素材；后续任务会接入上传、合规校验和创作引用。
          </p>
        </div>
        <button className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-white">
          上传素材
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          </article>
        ))}
      </div>
    </section>
  );
}
