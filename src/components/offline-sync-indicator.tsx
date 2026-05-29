import { StatusBadge } from "@/components/status-badge";

export function OfflineSyncIndicator({ state }: { state: string }) {
  if (state === "offline") {
    return <StatusBadge tone="warning">本地待同步</StatusBadge>;
  }

  if (state === "syncing") {
    return <StatusBadge tone="neutral">正在同步</StatusBadge>;
  }

  return <StatusBadge tone="safe">已同步</StatusBadge>;
}
