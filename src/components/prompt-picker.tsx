type PromptTemplateCard = {
  id: string;
  name: string;
  scenario: string;
  content: string;
  variables: string;
};

export function PromptPicker({ prompts }: { prompts: PromptTemplateCard[] }) {
  return (
    <div className="grid gap-3">
      {prompts.map((prompt, index) => (
        <article key={prompt.id} className="studio-tile p-4 transition hover:-translate-y-0.5 hover:border-accent">
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
        </article>
      ))}
    </div>
  );
}
