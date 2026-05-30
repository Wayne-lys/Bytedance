"use client";

import { useEffect, useMemo, useState } from "react";
import { OfflineSyncIndicator } from "@/components/offline-sync-indicator";
import { PromptPicker } from "@/components/prompt-picker";
import { QualityScoreCard } from "@/components/quality-score-card";
import { StatusBadge } from "@/components/status-badge";
import { buildGeneratedTags, removeTopicTag } from "@/features/ai/generated-tags";

type PromptTemplate = {
  id: string;
  name: string;
  scenario: string;
  content: string;
  variables: string;
};

type DraftState = {
  id?: string;
  topic: string;
  audience: string;
  platform: string;
  style: string;
  title: string;
  body: string;
  tags: string;
};

type ReviewResult = {
  moderation: {
    riskLevel: string;
    reason: string;
    suggestedAction: string;
    riskTypes: string[];
  };
  quality: {
    originality: number;
    structure: number;
    informationDensity: number;
    clarity: number;
    interactionPotential: number;
    platformFit: number;
    total: number;
  };
};

const initialDraft: DraftState = {
  topic: "",
  audience: "",
  platform: "头条",
  style: "真实、具体、信息密度高",
  title: "",
  body: "",
  tags: ""
};

const fieldRows: Array<[keyof DraftState, string, string]> = [
  ["topic", "选题", "例如：城市咖啡店的低糖点单方式"],
  ["audience", "目标受众", "例如：城市白领"],
  ["platform", "发布平台", "头条 / 抖音图文 / 小红书"],
  ["style", "内容风格", "真实、具体、信息密度高"]
];

function splitTags(tags: string) {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function CreationStudio({ prompts }: { prompts: PromptTemplate[] }) {
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [syncState, setSyncState] = useState("synced");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [publishState, setPublishState] = useState("");
  const [detailHref, setDetailHref] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState(prompts[0]?.id ?? "");
  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === selectedPromptId) ?? prompts[0],
    [prompts, selectedPromptId]
  );

  useEffect(() => {
    if (!selectedPromptId && prompts[0]) {
      setSelectedPromptId(prompts[0].id);
    }
  }, [prompts, selectedPromptId]);

  useEffect(() => {
    const cached = window.localStorage.getItem("creator-draft");

    if (cached) {
      const cachedDraft = JSON.parse(cached) as DraftState;

      setDraft({
        ...cachedDraft,
        tags: removeTopicTag(cachedDraft.tags, cachedDraft.topic)
      });
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("creator-draft", JSON.stringify(draft));
  }, [draft]);

  async function saveCurrentDraft(nextState = "synced") {
    if (!navigator.onLine) {
      setSyncState("offline");
      return;
    }

    setSyncState("syncing");
    const response = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draft,
        localState: nextState
      })
    });
    const payload = await response.json();

    if (payload.ok) {
      setDraft((current) => ({ ...current, id: payload.data.draft.id }));
      setSyncState("synced");
    }
  }

  async function generateContent() {
    setPublishState("");
    const topic = draft.topic || "通勤路上的轻量补能";
    const audience = draft.audience || "城市白领";
    const fallbackDraft = {
      title: `${topic}: 给${audience}的 3 个具体建议`,
      body: `围绕${topic}，先说明一个真实生活场景，再给出三条可以立即执行的建议。内容保持具体、可信，适合在${draft.platform}发布，并在结尾留下一个方便评论互动的问题。`,
      tags: buildGeneratedTags(draft.platform, topic).join(",")
    };

    setDraft((current) => ({
      ...current,
      ...fallbackDraft
    }));
    setReview(null);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          audience,
          platform: draft.platform,
          style: draft.style,
          prompt: selectedPrompt?.content ?? "生成短图文",
          materials: []
        })
      });
      const payload = await response.json();

      if (!payload.ok || !payload.data?.generated?.title) {
        throw new Error(payload.error ?? "AI 生成失败");
      }

      setDraft((current) => ({
        ...current,
        title: payload.data.generated.title,
        body: payload.data.generated.body,
        tags: removeTopicTag(payload.data.generated.tags.join(","), topic)
      }));
      setReview(null);
    } catch {
      // The deterministic fallback above is already visible to the user.
    }
  }

  async function reviewContent() {
    const response = await fetch("/api/moderation/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        body: draft.body,
        tags: splitTags(draft.tags),
        platform: draft.platform
      })
    });
    const payload = await response.json();

    if (payload.ok) {
      setReview(payload.data);
      setPublishState(payload.data.moderation.riskLevel === "high" ? "审核未通过" : "审核通过");
    }
  }

  async function publishContent() {
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        body: draft.body,
        tags: splitTags(draft.tags),
        platform: draft.platform
      })
    });
    const payload = await response.json();

    if (payload.ok) {
      setPublishState("发布成功");
      setDetailHref(`/content/${payload.data.post.id}`);
      return;
    }

    setPublishState(payload.error ?? "发布失败");
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      void saveCurrentDraft();
    }, 30_000);
    const handleOnline = () => {
      void saveCurrentDraft();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", handleOnline);
    };
  });

  return (
    <section className="grid gap-5 xl:h-[calc(100vh-14rem)] xl:min-h-[640px] xl:grid-cols-[minmax(0,1fr)_390px] xl:items-stretch xl:overflow-hidden">
      <div className="studio-panel flex min-h-0 flex-col overflow-hidden">
        <div className="border-b border-line bg-sidebar px-5 py-4 text-white md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold text-[#d7c9b6]">Creation Desk</p>
              <h2 className="mt-1 text-2xl font-semibold">短图文创作台</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <OfflineSyncIndicator state={syncState} />
              <StatusBadge tone="neutral">30 秒自动保存</StatusBadge>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {fieldRows.map(([key, label, placeholder]) => (
              <label key={key} className="block">
                <span className="text-sm font-semibold text-ink">{label}</span>
                <input
                  value={draft[key] ?? ""}
                  placeholder={placeholder}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [key]: event.target.value
                    }))
                  }
                  className="studio-input mt-2 h-11 w-full px-3 text-sm"
                />
              </label>
            ))}
          </div>

          <div className="grid gap-4">
            <label>
              <span className="text-sm font-semibold text-ink">标题</span>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                className="studio-input mt-2 h-12 w-full px-3 text-sm"
              />
            </label>

            <label>
              <span className="text-sm font-semibold text-ink">正文</span>
              <textarea
                value={draft.body}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, body: event.target.value }))
                }
                className="studio-input mt-2 min-h-56 w-full p-4 text-sm leading-7"
              />
            </label>

            <label>
              <span className="text-sm font-semibold text-ink">标签</span>
              <input
                value={draft.tags}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, tags: event.target.value }))
                }
                className="studio-input mt-2 h-11 w-full px-3 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-line pt-5">
            <button
              type="button"
              onClick={generateContent}
              className="studio-button h-10 bg-accent px-4 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar"
            >
              AI 生成
            </button>
            <button
              type="button"
              onClick={() => void saveCurrentDraft()}
              className="studio-button h-10 border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent"
            >
              立即保存
            </button>
            <button
              type="button"
              onClick={reviewContent}
              className="studio-button h-10 border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent"
            >
              审核内容
            </button>
            <button
              type="button"
              onClick={publishContent}
              className="studio-button h-10 bg-sidebar px-4 text-sm font-semibold text-white shadow-crisp hover:bg-accent"
            >
              发布内容
            </button>
          </div>

          {publishState ? (
            <div className="studio-tile flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-ink">{publishState}</p>
              {detailHref ? (
                <a className="text-sm font-semibold text-accent" href={detailHref}>
                  查看详情
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <aside className="min-h-0 space-y-5 xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
        <section className="studio-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-accent">Prompt Library</p>
              <h3 className="mt-1 text-xl font-semibold text-ink">Prompt 模板</h3>
              <p className="mt-2 text-xs leading-5 text-muted">点击模板切换 AI 生成指令。</p>
            </div>
            <StatusBadge tone="safe">{prompts.length} 个</StatusBadge>
          </div>
          <div className="mt-5">
            <PromptPicker
              prompts={prompts}
              selectedPromptId={selectedPrompt?.id}
              onSelect={setSelectedPromptId}
            />
          </div>
        </section>

        {review ? (
          <section className="space-y-5">
            <div className="studio-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-accent">Safety Gate</p>
                  <h3 className="mt-1 text-xl font-semibold text-ink">安全审核</h3>
                </div>
                <StatusBadge tone={review.moderation.riskLevel === "high" ? "blocked" : "safe"}>
                  {review.moderation.riskLevel}
                </StatusBadge>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">{review.moderation.reason}</p>
              <p className="mt-3 rounded-md bg-panel-muted px-3 py-2 text-sm font-semibold text-ink">
                {review.moderation.suggestedAction}
              </p>
            </div>
            <QualityScoreCard score={review.quality} />
          </section>
        ) : null}
      </aside>
    </section>
  );
}
