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
      {prompts.map((prompt) => (
        <article key={prompt.id} className="rounded-lg border border-line bg-[#fbfaf6] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-ink">{prompt.name}</h3>
              <p className="mt-1 text-xs font-medium text-accent">{prompt.scenario}</p>
            </div>
            <span className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted">
              {prompt.variables}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{prompt.content}</p>
        </article>
      ))}
    </div>
  );
}
