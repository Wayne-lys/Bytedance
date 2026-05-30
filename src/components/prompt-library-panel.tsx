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
  onSelect: (id: string) => void;
  onCreated: (prompt: PromptTemplateCard) => void;
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
  onSelect,
  onCreated
}: PromptLibraryPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [scenario, setScenario] = useState("");
  const [variables, setVariables] = useState("topic,audience,platform");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  async function createPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const body = {
      name: name.trim(),
      scenario: scenario.trim(),
      variables: variables.trim(),
      content: content.trim()
    };
    const response = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = (await response.json()) as CreatePromptResponse;

    if (!response.ok || payload.ok === false || !payload.data?.prompt) {
      setError(payload.error ?? "Prompt 保存失败");
      return;
    }

    onCreated(payload.data.prompt);
    onSelect(payload.data.prompt.id);
    setIsCreating(false);
    setName("");
    setScenario("");
    setVariables("topic,audience,platform");
    setContent("");
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setIsCreating((current) => !current);
          setError("");
        }}
        className="studio-button h-10 w-full border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent"
      >
        新增 Prompt
      </button>

      {isCreating ? (
        <form onSubmit={createPrompt} className="studio-tile space-y-3 p-4">
          <label className="block">
            <span className="text-xs font-semibold text-muted">模板名称</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="studio-input mt-2 h-10 w-full px-3 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-muted">适用场景</span>
              <input
                value={scenario}
                onChange={(event) => setScenario(event.target.value)}
                className="studio-input mt-2 h-10 w-full px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted">变量</span>
              <input
                value={variables}
                onChange={(event) => setVariables(event.target.value)}
                className="studio-input mt-2 h-10 w-full px-3 text-sm"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-muted">Prompt 内容</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="studio-input mt-2 min-h-24 w-full p-3 text-sm leading-6"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              className="studio-button h-9 flex-1 bg-accent px-3 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar"
            >
              保存 Prompt
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="studio-button h-9 flex-1 border border-line bg-panel px-3 text-sm font-semibold text-ink hover:border-accent"
            >
              取消
            </button>
          </div>
        </form>
      ) : null}

      <PromptPicker
        prompts={prompts}
        selectedPromptId={selectedPromptId}
        onSelect={onSelect}
      />
    </div>
  );
}
