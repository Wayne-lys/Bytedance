import { StatusBadge } from "@/components/status-badge";
import { PromptPicker } from "@/components/prompt-picker";
import { listPromptTemplates } from "@/features/prompts/prompt-service";

export default async function CreatePage() {
  const prompts = await listPromptTemplates();

  return (
    <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink">短图文创作台</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              后续会接入素材选择、Prompt 模板、AI 生成、30 秒自动保存和断网同步。
            </p>
          </div>
          <StatusBadge tone="warning">待接入 AI</StatusBadge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {["选题", "目标受众", "发布平台", "内容风格"].map((label) => (
            <label key={label} className="block">
              <span className="text-sm font-medium text-ink">{label}</span>
              <div className="mt-2 h-11 rounded-md border border-line bg-[#fbfaf6]" />
            </label>
          ))}
        </div>

        <div className="mt-5 h-44 rounded-lg border border-line bg-[#fbfaf6] p-4 text-sm text-muted">
          编辑器区域会在后续任务中升级为标题、正文、标签和封面建议的完整短图文编辑器。
        </div>
      </div>

      <aside className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-ink">Prompt 模板</h3>
          <StatusBadge tone="safe">{prompts.length} 个</StatusBadge>
        </div>
        <div className="mt-5">
          <PromptPicker prompts={prompts} />
        </div>
      </aside>
    </section>
  );
}
