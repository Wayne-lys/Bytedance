"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteState = "idle" | "deleting" | "deleted" | "error";

function buildConfirmMessage(name: string, referenceCount: number) {
  if (referenceCount > 0) {
    return `素材“${name}”已被引用 ${referenceCount} 次，仍要删除吗？`;
  }

  return `确定删除素材“${name}”吗？`;
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

  async function deleteMaterial() {
    if (!window.confirm(buildConfirmMessage(name, referenceCount))) {
      return;
    }

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
        onClick={deleteMaterial}
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
    </div>
  );
}
