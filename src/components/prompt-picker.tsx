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
  disabled = false,
  onSelect,
  onEdit,
  onDelete
}: {
  prompts: PromptTemplateCard[];
  selectedPromptId?: string;
  disabled?: boolean;
  onSelect?: (id: string) => void;
  onEdit?: (prompt: PromptTemplateCard) => void;
  onDelete?: (prompt: PromptTemplateCard) => void;
}) {
  return (
    <div className="grid gap-3">
      {prompts.map((prompt, index) => {
        const selected = selectedPromptId === prompt.id;

        return (
          <article
            key={prompt.id}
            className={`studio-tile p-4 transition ${
              disabled ? "opacity-70" : "hover:-translate-y-0.5 hover:border-accent"
            } ${
              selected ? "border-accent bg-accent/10 shadow-crisp" : ""
            }`}
          >
            <button
              type="button"
              aria-label={`选择 ${prompt.name}`}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onSelect?.(prompt.id)}
              className="block w-full text-left disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-ink" title={prompt.name}>
                    {prompt.name}
                  </h3>
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

            {onEdit || onDelete ? (
              <div className="mt-3 flex gap-2 border-t border-line pt-3">
                {onEdit ? (
                  <button
                    type="button"
                    aria-label={`编辑 ${prompt.name}`}
                    disabled={disabled}
                    onClick={() => onEdit(prompt)}
                    className="studio-button h-8 flex-1 border border-line bg-panel px-2 text-xs font-semibold text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    编辑
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    aria-label={`删除 ${prompt.name}`}
                    disabled={disabled}
                    onClick={() => onDelete(prompt)}
                    className="studio-button h-8 flex-1 border border-accent/30 bg-accent/10 px-2 text-xs font-semibold text-accent hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    删除
                  </button>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
