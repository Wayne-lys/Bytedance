"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type CreateRuleResponse = {
  ok?: boolean;
  error?: string;
};

export function AuditRuleForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [riskLevel, setRiskLevel] = useState("medium");
  const [action, setAction] = useState("rewrite");
  const [description, setDescription] = useState("");
  const [pattern, setPattern] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const response = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: category.trim(),
        riskLevel,
        action,
        description: description.trim(),
        pattern: pattern.trim()
      })
    });
    const payload = (await response.json()) as CreateRuleResponse;

    if (!response.ok || payload.ok === false) {
      setError(payload.error ?? "规则保存失败");
      return;
    }

    setCategory("");
    setRiskLevel("medium");
    setAction("rewrite");
    setDescription("");
    setPattern("");
    setIsOpen(false);
    setMessage("规则已新增");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => {
            setIsOpen((current) => !current);
            setError("");
            setMessage("");
          }}
          className="studio-button h-10 border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent"
        >
          新增规则
        </button>
        {message ? <p className="text-sm font-semibold text-accent">{message}</p> : null}
      </div>

      {isOpen ? (
        <form onSubmit={createRule} className="studio-tile grid gap-4 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
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
              {isPending ? "保存中" : "保存规则"}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="studio-button h-9 border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent"
            >
              取消
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
