"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

export function MaterialPicker({
  materials,
  canManageMaterials
}: {
  materials: MaterialCard[];
  canManageMaterials: boolean;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedMaterials = useMemo(
    () => materials.filter((material) => selectedIds.includes(material.id)),
    [materials, selectedIds]
  );

  function toggleMaterial(id: string, checked: boolean) {
    setError("");
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }

      return current.filter((item) => item !== id);
    });
  }

  function toggleAll(checked: boolean) {
    setError("");
    setSelectedIds(checked ? materials.map((material) => material.id) : []);
  }

  async function bulkDeleteMaterials() {
    if (selectedIds.length === 0) {
      setIsConfirmOpen(false);
      return;
    }

    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch("/api/materials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      const payload = await response.json();

      if (!response.ok || payload.ok === false) {
        setError(payload.error ?? "批量删除失败");
        setIsConfirmOpen(false);
        return;
      }

      setSelectedIds([]);
      setIsConfirmOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setIsDeleting(false);
    }
  }

  const allSelected = materials.length > 0 && selectedIds.length === materials.length;

  return (
    <div className={`space-y-4 ${canManageMaterials && selectedIds.length > 0 ? "pb-24" : ""}`}>
      {canManageMaterials ? (
        <div className="studio-tile flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={allSelected}
              disabled={materials.length === 0}
              onChange={(event) => toggleAll(event.target.checked)}
              className="size-4 accent-[rgb(217,75,43)]"
            />
            全选
          </label>
          <p className="text-sm font-medium leading-6 text-muted">
            {materials.length > 0 ? `共 ${materials.length} 个素材，勾选后可统一删除。` : "暂无素材"}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {materials.map((material, index) => {
          const selected = selectedIds.includes(material.id);

          return (
            <article
              key={material.id}
              className={`studio-tile flex min-h-[330px] flex-col overflow-hidden ${
                selected ? "ring-2 ring-accent/60" : ""
              }`}
            >
              <div className="relative aspect-[16/10] border-b border-line bg-panel-muted">
                {material.url ? (
                  <img src={material.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(217,75,43,0.12),transparent_36%),linear-gradient(45deg,rgba(17,116,111,0.12),transparent_44%)]" />
                )}
                <div className="absolute left-3 top-3 rounded-md bg-sidebar px-2.5 py-1 text-xs font-semibold text-white">
                  Asset {String(index + 1).padStart(2, "0")}
                </div>
                {canManageMaterials ? (
                  <label className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-md border border-white/20 bg-sidebar/90 shadow-crisp">
                    <span className="sr-only">选择 {material.name}</span>
                    <input
                      type="checkbox"
                      aria-label={`选择 ${material.name}`}
                      checked={selected}
                      onChange={(event) => toggleMaterial(material.id, event.target.checked)}
                      className="size-4 accent-[rgb(217,75,43)]"
                    />
                  </label>
                ) : null}
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
                  {!canManageMaterials ? (
                    <p className="pt-3 text-xs font-semibold text-muted">
                      只读素材：需要素材管理权限才能删除。
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {canManageMaterials && selectedIds.length > 0 ? (
        <div className="pointer-events-none fixed bottom-4 left-0 right-0 z-40 px-3 sm:px-4">
          <div className="mx-auto flex max-w-[1720px] justify-end lg:pl-[268px]">
            <div className="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-md border border-line bg-sidebar/95 px-3 py-2 text-white shadow-[0_12px_36px_rgba(36,31,26,0.28)] backdrop-blur">
              <p className="truncate text-sm font-semibold">
                已选择 {selectedIds.length} 个素材
              </p>
              <button
                type="button"
                disabled={isDeleting || isPending}
                onClick={() => setIsConfirmOpen(true)}
                className="studio-button h-9 shrink-0 bg-accent px-3 text-sm font-semibold text-white shadow-crisp hover:bg-panel hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                删除选中
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/70 px-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-material-title"
            className="studio-dialog w-full max-w-lg overflow-hidden rounded-lg border border-line shadow-[0_24px_80px_rgba(36,31,26,0.34)]"
          >
            <div className="border-b border-line bg-sidebar px-5 py-4 text-white">
              <p className="text-xs font-semibold text-[#d7c9b6]">Material Control</p>
              <h2 id="bulk-delete-material-title" className="mt-1 text-xl font-semibold">
                批量删除素材
              </h2>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-md border border-accent/20 bg-accent/10 px-4 py-3">
                <p className="text-sm font-semibold text-ink">
                  即将删除 {selectedMaterials.length} 个素材
                </p>
                <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-sm leading-6 text-muted">
                  {selectedMaterials.map((material) => (
                    <li key={material.id}>{material.name}</li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  disabled={isDeleting || isPending}
                  onClick={() => setIsConfirmOpen(false)}
                  className="studio-button h-10 border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={isDeleting || isPending}
                  onClick={() => void bulkDeleteMaterials()}
                  className="studio-button h-10 bg-accent px-4 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting || isPending ? "删除中" : "确认批量删除"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
