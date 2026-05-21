type StatusTone = "safe" | "warning" | "blocked" | "neutral";

const toneClassName: Record<StatusTone, string> = {
  safe: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
  neutral: "border-line bg-white text-muted"
};

export function StatusBadge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClassName[tone]}`}
    >
      {children}
    </span>
  );
}
