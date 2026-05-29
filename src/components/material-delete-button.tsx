"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteState = "idle" | "deleting" | "deleted" | "error";

function buildConfirmDescription(name: string, referenceCount: number) {
  if (referenceCount > 0) {
    return `素材“${name}”已被引用 ${referenceCount} 次。删除后，已发布内容不会再使用这张素材。`;
  }

  return `删除后，素材“${name}”会从素材库移除。`;
}

export function MaterialDeleteButton({
  id,
  name,
  referenceCount
}: {
  id: string;
  name: string;
  referenceCount: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<DeleteState>("idle");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  async function deleteMaterial() {
    setState("deleting");

    try {
      const response = await fetch(`/api/materials/${id}`, {
        method: "DELETE"
      });
      const payload = await response.json();

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error ?? "删除失败");
      }

      setState("deleted");
      setIsConfirmOpen(false);
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 pt-3">
      <button
        type="button"
        aria-label={`删除 ${name}`}
        disabled={state === "deleting" || state === "deleted"}
        onClick={() => setIsConfirmOpen(true)}
        className="studio-button border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-muted hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "deleting" ? "删除中" : "删除"}
      </button>
      {state === "deleted" ? (
        <span className="text-xs font-semibold text-teal">已删除</span>
      ) : null}
      {state === "error" ? (
        <span className="text-xs font-semibold text-accent">删除失败</span>
      ) : null}

      {isConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/70 px-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-material-title-${id}`}
            className="w-full max-w-md overflow-hidden rounded-lg border border-line bg-panel shadow-[0_24px_80px_rgba(36,31,26,0.34)]"
          >
            <div className="border-b border-line bg-sidebar px-5 py-4 text-white">
              <p className="text-xs font-semibold text-[#d7c9b6]">Material Control</p>
              <h2 id={`delete-material-title-${id}`} className="mt-1 text-xl font-semibold">
                删除素材
              </h2>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-md border border-accent/20 bg-accent/10 px-4 py-3">
                <p className="text-sm font-semibold text-ink">{name}</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {buildConfirmDescription(name, referenceCount)}
                </p>
              </div>

              <p className="text-sm leading-6 text-muted">
                这个操作会立即更新素材库列表。请确认这不是你还要继续用于创作的素材。
              </p>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  disabled={state === "deleting"}
                  onClick={() => setIsConfirmOpen(false)}
                  className="studio-button h-10 border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={state === "deleting"}
                  onClick={() => void deleteMaterial()}
                  className="studio-button h-10 bg-accent px-4 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {state === "deleting" ? "删除中" : "确认删除"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
