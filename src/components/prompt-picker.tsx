type PromptTemplateCard = {
  id: string;
  name: string;
  scenario: string;
  content: string;
  variables: string;
};

export function PromptPicker({
  prompts,
  selectedPromptId,
  onSelect
}: {
  prompts: PromptTemplateCard[];
  selectedPromptId?: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {prompts.map((prompt, index) => {
        const selected = selectedPromptId === prompt.id;

        return (
          <button
            key={prompt.id}
            type="button"
            aria-label={`选择 ${prompt.name}`}
            aria-pressed={selected}
            onClick={() => onSelect?.(prompt.id)}
            className={`studio-tile p-4 text-left transition hover:-translate-y-0.5 hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              selected ? "border-accent bg-accent/10 shadow-crisp" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink">{prompt.name}</h3>
                <p className="mt-1 text-xs font-medium text-accent">{prompt.scenario}</p>
              </div>
              <span className="rounded-md border border-line bg-sidebar px-2.5 py-1 text-xs font-semibold text-white">
                P{index + 1}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">{prompt.variables}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{prompt.content}</p>
            {selected ? (
              <p className="mt-3 text-xs font-semibold text-accent">当前用于 AI 生成</p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
