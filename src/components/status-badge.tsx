type StatusTone = "safe" | "warning" | "blocked" | "neutral";

const toneClassName: Record<StatusTone, string> = {
  safe: "border-teal/25 bg-teal/10 text-teal",
  warning: "border-warn/30 bg-warn/10 text-warn",
  blocked: "border-accent/30 bg-accent/10 text-accent",
  neutral: "border-line bg-panel-muted text-muted"
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
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${toneClassName[tone]}`}
    >
      {children}
    </span>
  );
}
