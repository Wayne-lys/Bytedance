import { MaterialPicker } from "@/components/material-picker";
import { listMaterials } from "@/features/materials/material-service";

export default async function MaterialsPage() {
  const materials = await listMaterials();

  return (
    <section className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-ink">素材库</h2>
          <p className="mt-2 text-sm text-muted">
            展示种子素材和合规结果，创作台可以引用这些素材完成短图文生成。
          </p>
        </div>
        <button className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-white">
          上传素材
        </button>
      </div>

      <div className="mt-6">
        <MaterialPicker materials={materials} />
      </div>
    </section>
  );
}
