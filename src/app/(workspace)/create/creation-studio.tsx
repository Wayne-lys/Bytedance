"use client";

import { useEffect, useMemo, useState } from "react";
import { OfflineSyncIndicator } from "@/components/offline-sync-indicator";
import { PromptPicker } from "@/components/prompt-picker";
import { QualityScoreCard } from "@/components/quality-score-card";
import { StatusBadge } from "@/components/status-badge";

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
  const selectedPrompt = useMemo(() => prompts[0], [prompts]);

  useEffect(() => {
    const cached = window.localStorage.getItem("creator-draft");

    if (cached) {
      setDraft(JSON.parse(cached) as DraftState);
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
      title: `${topic}：给${audience}的 3 个具体建议`,
      body: `围绕${topic}，先说明一个真实生活场景，再给出三条可以立即执行的建议。内容保持具体、可信，适合在${draft.platform}发布，并在结尾留下一个方便评论互动的问题。`,
      tags: `${draft.platform},AI创作,短图文,${topic}`
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
        tags: payload.data.generated.tags.join(",")
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
    <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink">短图文创作台</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              选择 Prompt 后生成草稿。编辑内容会写入本地缓存，并每 30 秒自动云端保存。
            </p>
          </div>
          <OfflineSyncIndicator state={syncState} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ["topic", "选题"],
            ["audience", "目标受众"],
            ["platform", "发布平台"],
            ["style", "内容风格"]
          ].map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-sm font-medium text-ink">{label}</span>
              <input
                value={draft[key as keyof DraftState] ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    [key]: event.target.value
                  }))
                }
                className="mt-2 h-11 w-full rounded-md border border-line bg-[#fbfaf6] px-3 text-sm outline-none focus:border-accent"
              />
            </label>
          ))}
        </div>

        <div className="mt-5 grid gap-4">
          <label>
            <span className="text-sm font-medium text-ink">标题</span>
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              className="mt-2 h-11 w-full rounded-md border border-line bg-[#fbfaf6] px-3 text-sm outline-none focus:border-accent"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-ink">正文</span>
            <textarea
              value={draft.body}
              onChange={(event) =>
                setDraft((current) => ({ ...current, body: event.target.value }))
              }
              className="mt-2 min-h-40 w-full rounded-md border border-line bg-[#fbfaf6] p-3 text-sm leading-6 outline-none focus:border-accent"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-ink">标签</span>
            <input
              value={draft.tags}
              onChange={(event) =>
                setDraft((current) => ({ ...current, tags: event.target.value }))
              }
              className="mt-2 h-11 w-full rounded-md border border-line bg-[#fbfaf6] px-3 text-sm outline-none focus:border-accent"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={generateContent}
            className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-white"
          >
            AI 生成
          </button>
          <button
            type="button"
            onClick={() => void saveCurrentDraft()}
            className="h-10 rounded-md border border-line bg-white px-4 text-sm font-medium text-ink"
          >
            立即保存
          </button>
          <button
            type="button"
            onClick={reviewContent}
            className="h-10 rounded-md border border-line bg-white px-4 text-sm font-medium text-ink"
          >
            审核内容
          </button>
          <button
            type="button"
            onClick={publishContent}
            className="h-10 rounded-md bg-warn px-4 text-sm font-medium text-white"
          >
            发布内容
          </button>
          <StatusBadge tone="neutral">30 秒自动保存</StatusBadge>
        </div>

        {publishState ? (
          <div className="mt-5 rounded-lg border border-line bg-[#fbfaf6] p-4">
            <p className="text-sm font-medium text-ink">{publishState}</p>
            {detailHref ? (
              <a className="mt-3 inline-flex text-sm font-medium text-accent" href={detailHref}>
                查看详情
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-ink">Prompt 模板</h3>
            <StatusBadge tone="safe">{prompts.length} 个</StatusBadge>
          </div>
          <div className="mt-5">
            <PromptPicker prompts={prompts} />
          </div>
        </div>

        {review ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-white/85 p-4 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-ink">安全审核</h3>
                <StatusBadge tone={review.moderation.riskLevel === "high" ? "blocked" : "safe"}>
                  {review.moderation.riskLevel}
                </StatusBadge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{review.moderation.reason}</p>
            </div>
            <QualityScoreCard score={review.quality} />
          </div>
        ) : null}
      </aside>
    </section>
  );
}
