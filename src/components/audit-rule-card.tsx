"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";

type AuditRuleCardData = {
  id: string;
  category: string;
  description: string;
  riskLevel: string;
  pattern: string;
  action: string;
};

type RuleResponse = {
  ok?: boolean;
  error?: string;
};

function ruleTone(level: string) {
  if (level === "high") {
    return "blocked" as const;
  }

  if (level === "medium") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export function AuditRuleCard({
  rule,
  canManageRules
}: {
  rule: AuditRuleCardData;
  canManageRules: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [category, setCategory] = useState(rule.category);
  const [riskLevel, setRiskLevel] = useState(rule.riskLevel);
  const [action, setAction] = useState(rule.action);
  const [description, setDescription] = useState(rule.description);
  const [pattern, setPattern] = useState(rule.pattern);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function updateRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch(`/api/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: category.trim(),
        riskLevel,
        action,
        description: description.trim(),
        pattern: pattern.trim()
      })
    });
    const payload = (await response.json()) as RuleResponse;

    if (!response.ok || payload.ok === false) {
      setError(payload.error ?? "规则保存失败");
      return;
    }

    setIsEditing(false);
    startTransition(() => router.refresh());
  }

  async function deleteRule() {
    setError("");

    const response = await fetch(`/api/rules/${rule.id}`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as RuleResponse;

    if (!response.ok || payload.ok === false) {
      setError(payload.error ?? "规则删除失败");
      setIsDeleteOpen(false);
      return;
    }

    setIsDeleteOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <article className="studio-tile p-4">
      {isEditing ? (
        <form onSubmit={updateRule} className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_150px]">
            <label className="block">
              <span className="text-xs font-semibold text-muted">规则类别</span>
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="studio-input mt-2 h-10 w-full px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted">风险等级</span>
              <select
                value={riskLevel}
                onChange={(event) => setRiskLevel(event.target.value)}
                className="studio-input mt-2 h-10 w-full px-3 text-sm"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted">处理策略</span>
              <select
                value={action}
                onChange={(event) => setAction(event.target.value)}
                className="studio-input mt-2 h-10 w-full px-3 text-sm"
              >
                <option value="allow">allow</option>
                <option value="warn">warn</option>
                <option value="review">review</option>
                <option value="rewrite">rewrite</option>
                <option value="block">block</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-muted">规则说明</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="studio-input mt-2 min-h-20 w-full p-3 text-sm leading-6"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted">识别模式</span>
            <input
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              className="studio-input mt-2 h-10 w-full px-3 text-sm"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="studio-button h-9 bg-accent px-4 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "保存中" : "保存修改"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setCategory(rule.category);
                setRiskLevel(rule.riskLevel);
                setAction(rule.action);
                setDescription(rule.description);
                setPattern(rule.pattern);
                setError("");
              }}
              className="studio-button h-9 border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent"
            >
              取消
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold text-ink">{rule.category}</h4>
              <p className="mt-1 text-xs text-muted">处理策略：{rule.action}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <StatusBadge tone={ruleTone(rule.riskLevel)}>{rule.riskLevel}</StatusBadge>
              {canManageRules ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setError("");
                    }}
                    className="studio-button border border-line bg-panel px-2.5 py-1 text-xs font-semibold text-muted hover:border-accent hover:text-accent"
                  >
                    编辑规则
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeleteOpen(true)}
                    className="studio-button border border-line bg-panel px-2.5 py-1 text-xs font-semibold text-muted hover:border-accent hover:text-accent"
                  >
                    删除规则
                  </button>
                </>
              ) : null}
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{rule.description}</p>
          <p className="mt-3 rounded-md border border-line bg-panel-muted px-3 py-2 text-xs text-muted">
            识别模式：{rule.pattern}
          </p>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </>
      )}

      {isDeleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/70 px-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-rule-title-${rule.id}`}
            className="studio-dialog w-full max-w-md overflow-hidden rounded-lg border border-line shadow-[0_24px_80px_rgba(36,31,26,0.34)]"
          >
            <div className="border-b border-line bg-sidebar px-5 py-4 text-white">
              <p className="text-xs font-semibold text-[#d7c9b6]">Rule Control</p>
              <h2 id={`delete-rule-title-${rule.id}`} className="mt-1 text-xl font-semibold">
                删除规则
              </h2>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-md border border-accent/20 bg-accent/10 px-4 py-3">
                <p className="text-sm font-semibold text-ink">{rule.category}</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  删除后，这条审核规则会从规则体系中移除。
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="studio-button h-10 border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => void deleteRule()}
                  className="studio-button h-10 bg-accent px-4 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "删除中" : "确认删除"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  );
}
