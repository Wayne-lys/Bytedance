"use client";

import { FormEvent, useState } from "react";
import { PromptPicker } from "@/components/prompt-picker";

export type PromptTemplateCard = {
  id: string;
  name: string;
  scenario: string;
  content: string;
  variables: string;
};

type PromptLibraryPanelProps = {
  prompts: PromptTemplateCard[];
  selectedPromptId?: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onCreated: (prompt: PromptTemplateCard) => void;
  onUpdated?: (prompt: PromptTemplateCard) => void;
  onDeleted?: (id: string) => void;
};

type CreatePromptResponse = {
  ok?: boolean;
  data?: {
    prompt?: PromptTemplateCard;
  };
  error?: string;
};

export function PromptLibraryPanel({
  prompts,
  selectedPromptId,
  disabled = false,
  onSelect,
  onCreated,
  onUpdated,
  onDeleted
}: PromptLibraryPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptToDelete, setPromptToDelete] = useState<PromptTemplateCard | null>(null);
  const [name, setName] = useState("");
  const [scenario, setScenario] = useState("");
  const [variables, setVariables] = useState("topic,audience,platform");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const isEditing = editingPromptId !== null;
  const formVisible = isCreating || isEditing;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPrompts = normalizedQuery
    ? prompts.filter((prompt) =>
        [prompt.name, prompt.scenario, prompt.variables, prompt.content]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : prompts;

  function resetForm() {
    setIsCreating(false);
    setEditingPromptId(null);
    setName("");
    setScenario("");
    setVariables("topic,audience,platform");
    setContent("");
    setError("");
  }

  function startCreating() {
    if (disabled) {
      return;
    }

    if (isCreating) {
      resetForm();
      return;
    }

    setIsCreating(true);
    setEditingPromptId(null);
    setName("");
    setScenario("");
    setVariables("topic,audience,platform");
    setContent("");
    setError("");
  }

  function startEditing(prompt: PromptTemplateCard) {
    if (disabled) {
      return;
    }

    setIsCreating(false);
    setEditingPromptId(prompt.id);
    setName(prompt.name);
    setScenario(prompt.scenario);
    setVariables(prompt.variables);
    setContent(prompt.content);
    setError("");
  }

  async function savePrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    setError("");

    const body = {
      name: name.trim(),
      scenario: scenario.trim(),
      variables: variables.trim(),
      content: content.trim()
    };
    const response = await fetch(
      isEditing ? `/api/prompts/${editingPromptId}` : "/api/prompts",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );
    const payload = (await response.json()) as CreatePromptResponse;

    if (!response.ok || payload.ok === false || !payload.data?.prompt) {
      setError(payload.error ?? "Prompt 保存失败");
      return;
    }

    if (isEditing) {
      onUpdated?.(payload.data.prompt);
      onSelect(payload.data.prompt.id);
    } else {
      onCreated(payload.data.prompt);
      onSelect(payload.data.prompt.id);
    }

    resetForm();
  }

  async function deletePrompt() {
    if (!promptToDelete || disabled) {
      return;
    }

    setError("");
    const response = await fetch(`/api/prompts/${promptToDelete.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    const payload = (await response.json()) as CreatePromptResponse;

    if (!response.ok || payload.ok === false) {
      setError(payload.error ?? "Prompt 删除失败");
      return;
    }

    if (editingPromptId === promptToDelete.id) {
      resetForm();
    }

    onDeleted?.(promptToDelete.id);
    setPromptToDelete(null);
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={startCreating}
        disabled={disabled}
        className="studio-button h-10 w-full border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        新增 Prompt
      </button>

      <div className="studio-tile space-y-2 p-3">
        <label className="block">
          <span className="text-xs font-semibold text-muted">查找 Prompt</span>
          <input
            value={query}
            disabled={disabled}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="按名称、场景、变量或内容查找"
            className="studio-input mt-2 h-10 w-full px-3 text-sm disabled:cursor-not-allowed disabled:bg-panel-muted/70 disabled:text-muted"
          />
        </label>
        <p className="text-xs font-semibold text-muted">
          显示 {filteredPrompts.length} / {prompts.length} 个
        </p>
      </div>

      {formVisible ? (
        <form onSubmit={savePrompt} className="studio-tile space-y-3 p-4">
          <div>
            <p className="text-xs font-semibold text-accent">
              {isEditing ? "Edit Prompt" : "New Prompt"}
            </p>
            <h4 className="mt-1 text-base font-semibold text-ink">
              {isEditing ? "编辑 Prompt" : "新增 Prompt"}
            </h4>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-muted">模板名称</span>
            <input
              value={name}
              disabled={disabled}
              onChange={(event) => setName(event.target.value)}
              className="studio-input mt-2 h-10 w-full px-3 text-sm disabled:cursor-not-allowed disabled:bg-panel-muted/70 disabled:text-muted"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-muted">适用场景</span>
              <input
                value={scenario}
                disabled={disabled}
                onChange={(event) => setScenario(event.target.value)}
                className="studio-input mt-2 h-10 w-full px-3 text-sm disabled:cursor-not-allowed disabled:bg-panel-muted/70 disabled:text-muted"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted">变量</span>
              <input
                value={variables}
                disabled={disabled}
                onChange={(event) => setVariables(event.target.value)}
                className="studio-input mt-2 h-10 w-full px-3 text-sm disabled:cursor-not-allowed disabled:bg-panel-muted/70 disabled:text-muted"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-muted">Prompt 内容</span>
            <textarea
              value={content}
              disabled={disabled}
              onChange={(event) => setContent(event.target.value)}
              className="studio-input mt-2 min-h-24 w-full p-3 text-sm leading-6 disabled:cursor-not-allowed disabled:bg-panel-muted/70 disabled:text-muted"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={disabled}
              className="studio-button h-9 flex-1 bg-accent px-3 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEditing ? "保存修改" : "保存 Prompt"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={disabled}
              className="studio-button h-9 flex-1 border border-line bg-panel px-3 text-sm font-semibold text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              取消
            </button>
          </div>
        </form>
      ) : null}

      <div
        data-testid="prompt-library-scroll"
        className="max-h-[560px] overflow-y-auto pr-1"
      >
        <PromptPicker
          prompts={filteredPrompts}
          selectedPromptId={selectedPromptId}
          disabled={disabled}
          onSelect={onSelect}
          onEdit={startEditing}
          onDelete={setPromptToDelete}
        />

        {filteredPrompts.length === 0 ? (
          <p className="rounded-md border border-line bg-panel-muted px-3 py-4 text-center text-sm font-semibold text-muted">
            没有找到匹配的 Prompt
          </p>
        ) : null}
      </div>

      {promptToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/70 px-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-prompt-title"
            className="studio-dialog w-full max-w-md overflow-hidden rounded-lg border border-line shadow-[0_24px_80px_rgba(36,31,26,0.34)]"
          >
            <div className="border-b border-line bg-sidebar px-5 py-4 text-white">
              <p className="text-xs font-semibold text-[#d7c9b6]">Prompt Control</p>
              <h2 id="delete-prompt-title" className="mt-1 text-xl font-semibold">
                删除 Prompt
              </h2>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm leading-6 text-muted">
                删除后该模板将不再出现在创作台模板列表中。
              </p>
              <div className="rounded-md border border-accent/20 bg-accent/10 px-4 py-3">
                <p className="text-sm font-semibold text-ink">{promptToDelete.name}</p>
                <p className="mt-1 text-xs text-muted">{promptToDelete.content}</p>
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPromptToDelete(null)}
                  disabled={disabled}
                  className="studio-button h-10 border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void deletePrompt()}
                  disabled={disabled}
                  className="studio-button h-10 bg-accent px-4 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-60"
                >
                  确认删除
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
