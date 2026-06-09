"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OfflineSyncIndicator } from "@/components/offline-sync-indicator";
import { PromptLibraryPanel } from "@/components/prompt-library-panel";
import { QualityScoreCard } from "@/components/quality-score-card";
import { StatusBadge } from "@/components/status-badge";
import { removeTopicTag } from "@/features/ai/generated-tags";
import { buildPromptFallbackDraft } from "@/features/ai/prompt-fallback";

type PromptTemplate = {
  id: string;
  name: string;
  scenario: string;
  content: string;
  variables: string;
};

type MaterialOption = {
  id: string;
  name: string;
  url?: string | null;
  compliance: string;
  referenceCount: number;
  riskReason: string | null;
};

type DraftState = {
  id?: string;
  coverUrl?: string | null;
  materialIds: string[];
  topic: string;
  audience: string;
  platform: string;
  style: string;
  title: string;
  body: string;
  tags: string;
};

type ReviewResult = {
  reviewToken?: string;
  moderation: {
    riskLevel: string;
    reason: string;
    suggestedAction: string;
    riskTypes: string[];
    providers?: string[];
  };
  auditProviders?: {
    local?: { provider: string; status: string };
    ai?: { provider: string; status: string };
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

type ActiveAction = "generate" | "save" | "review" | "publish" | "rewrite" | "clear";

const DRAFT_STORAGE_KEY = "creator-draft";

const emptyDraft: DraftState = {
  materialIds: [],
  topic: "",
  audience: "",
  platform: "头条",
  style: "真实、具体、信息密度高",
  title: "",
  body: "",
  tags: ""
};

function normalizeDraft(draft?: Partial<DraftState> | null): DraftState {
  return {
    ...emptyDraft,
    ...draft,
    materialIds: draft?.materialIds ?? emptyDraft.materialIds,
    tags: draft?.tags ?? emptyDraft.tags,
    coverUrl: draft?.coverUrl ?? null
  };
}

function createEmptyDraft(): DraftState {
  return normalizeDraft(null);
}

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

function providerLabel(provider: string) {
  if (provider === "local-rules") {
    return "本地规则";
  }

  if (provider === "openai-compatible") {
    return "Ark AI";
  }

  return provider;
}

function providerStatusLabel(status: string) {
  if (status === "completed") {
    return "已完成";
  }

  if (status === "failed") {
    return "失败";
  }

  return "未启用";
}

function materialComplianceLabel(compliance: string) {
  if (compliance === "safe") {
    return "可用";
  }

  if (compliance === "warning") {
    return "预警";
  }

  if (compliance === "blocked") {
    return "阻断";
  }

  return compliance;
}

function materialComplianceTone(compliance: string) {
  if (compliance === "safe") {
    return "safe" as const;
  }

  if (compliance === "warning") {
    return "warning" as const;
  }

  if (compliance === "blocked") {
    return "blocked" as const;
  }

  return "neutral" as const;
}

function reviewKeyFromDraft(draft: DraftState) {
  return JSON.stringify({
    title: draft.title.trim(),
    body: draft.body.trim(),
    tags: splitTags(draft.tags),
    platform: draft.platform.trim() || "头条"
  });
}

function isReviewPassed(review: ReviewResult) {
  return (
    review.moderation.riskLevel === "safe" ||
    review.moderation.riskLevel === "low"
  );
}

function reviewFailureMessage(review: ReviewResult) {
  return `审核未通过：${review.moderation.reason || "内容命中风险规则。"}`;
}

function actionButtonContent(isLoading: boolean, label: string) {
  return (
    <>
      {isLoading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      <span>{label}</span>
    </>
  );
}

export function CreationStudio({
  prompts,
  materials = [],
  canReviewContent = false,
  initialDraft,
  editingPostId = null
}: {
  prompts: PromptTemplate[];
  materials?: MaterialOption[];
  canReviewContent?: boolean;
  initialDraft?: Partial<DraftState> | null;
  editingPostId?: string | null;
}) {
  const [draft, setDraft] = useState<DraftState>(() => normalizeDraft(initialDraft));
  const [syncState, setSyncState] = useState("synced");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [reviewedDraftKey, setReviewedDraftKey] = useState("");
  const [publishState, setPublishState] = useState("");
  const [detailHref, setDetailHref] = useState("");
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);
  const storageReadyRef = useRef(false);
  const [promptList, setPromptList] = useState(prompts);
  const [selectedPromptId, setSelectedPromptId] = useState(prompts[0]?.id ?? "");
  const selectedPrompt = useMemo(
    () => promptList.find((prompt) => prompt.id === selectedPromptId) ?? promptList[0],
    [promptList, selectedPromptId]
  );
  const usableMaterials = useMemo(
    () => materials.filter((material) => material.compliance !== "blocked"),
    [materials]
  );
  const selectedMaterials = useMemo(
    () => materials.filter((material) => draft.materialIds.includes(material.id)),
    [draft.materialIds, materials]
  );

  useEffect(() => {
    setPromptList(prompts);
  }, [prompts]);

  useEffect(() => {
    if (!selectedPromptId && promptList[0]) {
      setSelectedPromptId(promptList[0].id);
    }
  }, [promptList, selectedPromptId]);

  useEffect(() => {
    if (editingPostId) {
      storageReadyRef.current = true;
      return;
    }

    const cached = window.localStorage.getItem(DRAFT_STORAGE_KEY);

    if (cached) {
      const cachedDraft = JSON.parse(cached) as DraftState;

      storageReadyRef.current = false;
      setDraft({
        ...normalizeDraft(cachedDraft),
        tags: removeTopicTag(cachedDraft.tags, cachedDraft.topic)
      });
      return;
    }

    storageReadyRef.current = true;
  }, [editingPostId]);

  useEffect(() => {
    if (editingPostId) {
      return;
    }

    if (!storageReadyRef.current) {
      storageReadyRef.current = true;
      return;
    }

    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draft, editingPostId]);

  async function runAction(action: ActiveAction, task: () => Promise<void>) {
    if (activeAction) {
      return;
    }

    setActiveAction(action);

    try {
      await task();
    } finally {
      setActiveAction(null);
    }
  }

  function resetComposer() {
    const nextDraft = createEmptyDraft();

    storageReadyRef.current = true;
    setDraft(nextDraft);
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
    setReview(null);
    setReviewedDraftKey("");
  }

  function toggleMaterial(material: MaterialOption, checked: boolean) {
    if (material.compliance === "blocked") {
      return;
    }

    setDraft((current) => {
      const currentIds = current.materialIds ?? [];
      const nextIds = checked
        ? Array.from(new Set([...currentIds, material.id]))
        : currentIds.filter((id) => id !== material.id);
      const nextSelectedMaterials = materials.filter((item) => nextIds.includes(item.id));
      const nextCoverUrl =
        nextSelectedMaterials.find((item) => item.url)?.url ?? null;
      const selectedCoverUrls = materials
        .filter((item) => currentIds.includes(item.id))
        .map((item) => item.url)
        .filter(Boolean);
      const shouldReplaceCover =
        !current.coverUrl ||
        current.coverUrl === material.url ||
        selectedCoverUrls.includes(current.coverUrl);

      return {
        ...current,
        materialIds: nextIds,
        coverUrl: shouldReplaceCover ? nextCoverUrl : current.coverUrl
      };
    });
    setReview(null);
    setReviewedDraftKey("");
  }

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

  async function clearCurrentDraft() {
    await runAction("clear", async () => {
      const draftId = draft.id;
      const nextDraft = createEmptyDraft();

      resetComposer();
      setDetailHref("");
      setPublishState("已清空当前草稿。");

      if (!draftId) {
        setSyncState("synced");
        return;
      }

      if (!navigator.onLine) {
        setSyncState("offline");
        return;
      }

      setSyncState("syncing");
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nextDraft,
          id: draftId,
          localState: "cleared"
        })
      });
      const payload = await response.json();

      if (payload.ok) {
        setSyncState("synced");
        return;
      }

      setSyncState("offline");
    });
  }

  async function generateContent() {
    await runAction("generate", async () => {
      setPublishState("AI 生成中...");
      const topic = draft.topic || "通勤路上的轻量补能";
      const audience = draft.audience || "城市白领";
      const promptContent = selectedPrompt?.content ?? "生成短图文";
      const selectedMaterialNames = selectedMaterials.map((material) => material.name);
      const selectedCoverUrl =
        selectedMaterials.find((material) => material.url)?.url ?? null;
      const fallbackGenerated = buildPromptFallbackDraft({
        topic,
        audience,
        platform: draft.platform,
        style: draft.style,
        prompt: promptContent,
        materials: selectedMaterialNames
      });
      const fallbackDraft = {
        title: fallbackGenerated.title,
        body: fallbackGenerated.body,
        tags: removeTopicTag(fallbackGenerated.tags.join(","), topic)
      };

      setReview(null);
      setReviewedDraftKey("");

      try {
        const response = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            audience,
            platform: draft.platform,
            style: draft.style,
            prompt: promptContent,
            materials: selectedMaterialNames
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
          tags: removeTopicTag(payload.data.generated.tags.join(","), topic),
          coverUrl: current.coverUrl ?? selectedCoverUrl
        }));
        setReview(null);
        setReviewedDraftKey("");
        setPublishState("AI 生成完成，请审核后发布。");
      } catch {
        setDraft((current) => ({
          ...current,
          ...fallbackDraft,
          coverUrl: current.coverUrl ?? selectedCoverUrl
        }));
        setPublishState("AI 生成失败，已使用本地兜底草稿。");
      }
    });
  }

  async function requestReviewForPublish() {
    if (!canReviewContent) {
      setPublishState("需要审核员或管理员权限才能审核并发布内容");
      return null;
    }

    setPublishState("正在审核内容...");
    const currentReviewKey = reviewKeyFromDraft(draft);
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

    if (!payload.ok) {
      setPublishState(payload.error ?? "审核失败");
      return null;
    }

    setReview(payload.data);
    setReviewedDraftKey(currentReviewKey);

    if (!isReviewPassed(payload.data)) {
      setPublishState(reviewFailureMessage(payload.data));
      return null;
    }

    setPublishState("审核通过，正在发布...");
    return payload.data as ReviewResult;
  }

  async function publishContent() {
    await runAction("publish", async () => {
      const publishReview = await requestReviewForPublish();

      if (!publishReview) {
        return;
      }

      if (!publishReview.reviewToken) {
        setPublishState("审核未返回发布凭证，请重试。");
        return;
      }

      const response = await fetch(editingPostId ? `/api/posts/${editingPostId}` : "/api/posts", {
        method: editingPostId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: editingPostId ? undefined : draft.id,
          title: draft.title,
          body: draft.body,
          tags: splitTags(draft.tags),
          platform: draft.platform,
          coverUrl: draft.coverUrl ?? selectedMaterials.find((material) => material.url)?.url ?? null,
          materialIds: editingPostId ? [] : selectedMaterials.map((material) => material.id),
          reviewToken: publishReview.reviewToken
        })
      });
      const payload = await response.json();

      if (payload.ok) {
        const nextDetailHref = `/content/${payload.data.post.id}`;

        if (!editingPostId) {
          resetComposer();
        }

        setPublishState(editingPostId ? "更新成功" : "发布成功");
        setDetailHref(nextDetailHref);
        return;
      }

      if (payload.data?.moderation && payload.data?.quality) {
        setReview(payload.data);
        setReviewedDraftKey(reviewKeyFromDraft(draft));
        setPublishState(reviewFailureMessage(payload.data));
        return;
      }

      setPublishState(payload.error ?? "发布失败");
    });
  }

  async function rewriteCurrentContent() {
    await runAction("rewrite", async () => {
      const response = await fetch("/api/moderation/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draft.body
        })
      });
      const payload = await response.json();

      if (!payload.ok) {
        setPublishState(payload.error ?? "改写失败");
        return;
      }

      setDraft((current) => ({
        ...current,
        body: payload.data.content
      }));
      setReview(null);
      setReviewedDraftKey("");
      setPublishState("已生成合规改写，请确认后重新发布。");
    });
  }

  function handlePromptUpdated(prompt: PromptTemplate) {
    setPromptList((current) =>
      current.map((item) => (item.id === prompt.id ? prompt : item))
    );
    setSelectedPromptId(prompt.id);
  }

  function handlePromptDeleted(id: string) {
    const nextPrompt = promptList.find((prompt) => prompt.id !== id);

    setPromptList((current) => current.filter((prompt) => prompt.id !== id));

    if (selectedPromptId === id) {
      setSelectedPromptId(nextPrompt?.id ?? "");
    }
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

  const needsRewrite = Boolean(
    review && review.moderation.riskLevel !== "safe"
  );
  const isActionBusy = activeAction !== null;

  return (
    <section className="grid gap-5 xl:h-full xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-stretch xl:overflow-hidden">
      <div className="studio-panel flex min-h-0 flex-col overflow-hidden">
        <div className="border-b border-line bg-sidebar px-5 py-4 text-white md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold text-[#d7c9b6]">Creation Desk</p>
              <h2 className="mt-1 text-2xl font-semibold">
                {editingPostId ? "编辑已发布内容" : "短图文创作台"}
              </h2>
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
                  disabled={isActionBusy}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [key]: event.target.value
                    }))
                  }
                  className="studio-input mt-2 h-11 w-full px-3 text-sm disabled:cursor-not-allowed disabled:bg-panel-muted/70 disabled:text-muted"
                />
              </label>
            ))}
          </div>

          <div className="grid gap-4">
            <label>
              <span className="text-sm font-semibold text-ink">标题</span>
              <input
                value={draft.title}
                disabled={isActionBusy}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                className="studio-input mt-2 h-12 w-full px-3 text-sm disabled:cursor-not-allowed disabled:bg-panel-muted/70 disabled:text-muted"
              />
            </label>

            <label>
              <span className="text-sm font-semibold text-ink">正文</span>
              <textarea
                value={draft.body}
                disabled={isActionBusy}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, body: event.target.value }))
                }
                className="studio-input mt-2 min-h-56 w-full p-4 text-sm leading-7 disabled:cursor-not-allowed disabled:bg-panel-muted/70 disabled:text-muted"
              />
            </label>

            <label>
              <span className="text-sm font-semibold text-ink">标签</span>
              <input
                value={draft.tags}
                disabled={isActionBusy}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, tags: event.target.value }))
                }
                className="studio-input mt-2 h-11 w-full px-3 text-sm disabled:cursor-not-allowed disabled:bg-panel-muted/70 disabled:text-muted"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-line pt-5">
            <button
              type="button"
              onClick={generateContent}
              disabled={isActionBusy}
              aria-busy={activeAction === "generate"}
              className="studio-button inline-flex h-10 min-w-24 items-center justify-center gap-2 bg-accent px-4 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionButtonContent(activeAction === "generate", "AI 生成")}
            </button>
            <button
              type="button"
              onClick={() => void runAction("save", () => saveCurrentDraft())}
              disabled={isActionBusy}
              aria-busy={activeAction === "save"}
              className="studio-button inline-flex h-10 min-w-24 items-center justify-center gap-2 border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionButtonContent(activeAction === "save", "立即保存")}
            </button>
            <button
              type="button"
              onClick={clearCurrentDraft}
              disabled={isActionBusy}
              aria-busy={activeAction === "clear"}
              className="studio-button inline-flex h-10 min-w-24 items-center justify-center gap-2 border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionButtonContent(activeAction === "clear", "一键清空")}
            </button>
            <button
              type="button"
              onClick={publishContent}
              disabled={isActionBusy || !canReviewContent}
              aria-busy={activeAction === "publish"}
              title={canReviewContent ? undefined : "需要审核员或管理员权限"}
              className="studio-button inline-flex h-10 min-w-24 items-center justify-center gap-2 bg-sidebar px-4 text-sm font-semibold text-white shadow-crisp hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionButtonContent(
                activeAction === "publish",
                editingPostId ? "更新内容" : "发布内容"
              )}
            </button>
          </div>

          {!canReviewContent ? (
            <p className="mt-3 rounded-md border border-line bg-panel-muted px-3 py-2 text-sm leading-6 text-muted">
              发布前会自动审核；当前账号缺少审核员或管理员权限，无法发布内容。
            </p>
          ) : null}

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
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-accent">Material Context</p>
              <h3 className="mt-1 text-xl font-semibold text-ink">生成素材</h3>
              <p className="mt-2 text-xs leading-5 text-muted">
                选择素材后，AI 会把素材名称作为上下文；图片素材会作为发布封面。
              </p>
            </div>
            <StatusBadge tone={selectedMaterials.length > 0 ? "safe" : "neutral"}>
              {selectedMaterials.length}/{usableMaterials.length}
            </StatusBadge>
          </div>

          {selectedMaterials.length > 0 ? (
            <div className="mt-5 rounded-md border border-line bg-panel-muted p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-accent">已选素材</p>
                <span className="text-xs font-semibold text-muted">
                  {selectedMaterials.length} 张
                </span>
              </div>
              <div
                aria-label="已选素材预览"
                className="mt-3 grid grid-cols-3 gap-2"
              >
                {selectedMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="overflow-hidden rounded-md border border-line bg-panel"
                  >
                    <div className="aspect-[4/3] bg-panel-muted">
                      {material.url ? (
                        <img
                          src={material.url}
                          alt={`${material.name} 预览`}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <p className="truncate px-2 py-1.5 text-xs font-semibold text-ink">
                      {material.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {materials.length > 0 ? (
            <div
              data-testid="material-option-grid"
              className="mt-5 grid max-h-[236px] grid-cols-2 gap-3 overflow-y-auto pr-1"
            >
              {materials.map((material) => {
                const selected = draft.materialIds.includes(material.id);
                const blocked = material.compliance === "blocked";

                return (
                  <label
                    key={material.id}
                    className={`studio-tile grid min-h-[92px] grid-cols-[48px_minmax(0,1fr)] gap-2 p-3 transition ${
                      selected ? "border-accent bg-accent/10 shadow-crisp" : ""
                    } ${blocked ? "opacity-60" : "hover:border-accent"}`}
                  >
                    <span className="relative h-12 w-12 overflow-hidden rounded-md border border-line bg-panel-muted">
                      {material.url ? (
                        <img src={material.url} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                    <span className="min-w-0 pr-6">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {material.name}
                      </span>
                      <span className="mt-1 block text-xs font-medium text-muted">
                        引用 {material.referenceCount} 次
                      </span>
                      {material.riskReason ? (
                        <span className="mt-1 block truncate text-xs text-muted">
                          {material.riskReason}
                        </span>
                      ) : null}
                    </span>
                    <span className="col-span-2 flex items-center justify-between gap-2">
                      <StatusBadge tone={materialComplianceTone(material.compliance)}>
                        {materialComplianceLabel(material.compliance)}
                      </StatusBadge>
                      <input
                        type="checkbox"
                        aria-label={`选择素材 ${material.name}`}
                        checked={selected}
                        disabled={isActionBusy || blocked}
                        onChange={(event) => toggleMaterial(material, event.target.checked)}
                        className="size-4 accent-[rgb(217,75,43)] disabled:cursor-not-allowed"
                      />
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-md border border-line bg-panel-muted px-3 py-4 text-sm leading-6 text-muted">
              素材库暂无可用素材，上传后可在这里选择并用于 AI 生成。
            </p>
          )}
        </section>

        <section className="studio-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-accent">Prompt Library</p>
              <h3 className="mt-1 text-xl font-semibold text-ink">Prompt 模板</h3>
              <p className="mt-2 text-xs leading-5 text-muted">点击模板切换 AI 生成指令。</p>
            </div>
            <StatusBadge tone="safe">{promptList.length} 个</StatusBadge>
          </div>
          <div className="mt-5">
            <PromptLibraryPanel
              prompts={promptList}
              selectedPromptId={selectedPrompt?.id}
              disabled={isActionBusy}
              onSelect={setSelectedPromptId}
              onCreated={(prompt) =>
                setPromptList((current) => [prompt, ...current])
              }
              onUpdated={handlePromptUpdated}
              onDeleted={handlePromptDeleted}
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
              {review.moderation.providers?.length ? (
                <p className="mt-3 text-sm font-semibold text-ink">
                  审核来源：{review.moderation.providers.map(providerLabel).join(" / ")}
                </p>
              ) : null}
              {review.auditProviders?.ai ? (
                <p className="mt-2 text-sm text-muted">
                  Ark AI：{providerStatusLabel(review.auditProviders.ai.status)}
                </p>
              ) : null}
              {needsRewrite ? (
                <button
                  type="button"
                  onClick={rewriteCurrentContent}
                  disabled={isActionBusy}
                  aria-busy={activeAction === "rewrite"}
                  className="studio-button mt-4 inline-flex h-10 w-full items-center justify-center gap-2 bg-accent px-4 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionButtonContent(activeAction === "rewrite", "一键合规改写")}
                </button>
              ) : null}
            </div>
            <QualityScoreCard score={review.quality} />
          </section>
        ) : null}
      </aside>
    </section>
  );
}
