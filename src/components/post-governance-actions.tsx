"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DistributionAction = "offline" | "withdraw" | "rollback";

function actionLabel(action: DistributionAction) {
  if (action === "offline") {
    return "内容下线";
  }

  if (action === "withdraw") {
    return "撤回";
  }

  return "回滚为已发布";
}

export function PostGovernanceActions({
  postId,
  status
}: {
  postId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<DistributionAction | null>(null);

  async function runAction(action: DistributionAction) {
    setPending(action);

    try {
      const response = await fetch(`/api/posts/${postId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        router.refresh();
      }
    } finally {
      setPending(null);
    }
  }

  const actions: DistributionAction[] =
    status === "published" ? ["offline", "withdraw"] : ["rollback"];

  return (
    <>
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          onClick={() => void runAction(action)}
          disabled={pending !== null}
          className="studio-button border border-line px-3 py-2 text-sm font-semibold text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === action ? "处理中" : actionLabel(action)}
        </button>
      ))}
    </>
  );
}
