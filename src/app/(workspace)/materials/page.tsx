import { MaterialPicker } from "@/components/material-picker";
import { MaterialUploadPanel } from "@/components/material-upload-panel";
import { listMaterials } from "@/features/materials/material-service";

export default async function MaterialsPage() {
  const materials = await listMaterials();

  return (
    <section className="studio-panel p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-accent">Asset Library</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">素材库</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            展示种子素材和合规结果，创作台可以引用这些素材完成短图文生成。
          </p>
        </div>
        <MaterialUploadPanel />
      </div>

      <div className="mt-6">
        <MaterialPicker materials={materials} />
      </div>
    </section>
  );
}
