import crypto from "node:crypto";
import OpenAI from "openai";
import {
  chooseAiProviderName,
  resolveAiProviderConfig
} from "@/features/ai/provider";
import { reviewContentWithRules } from "@/features/moderation/rules";
import { scoreQuality } from "@/features/quality/quality-service";

type RiskLevel = "safe" | "low" | "medium" | "high";
type ModerationProvider = "local-rules" | "openai-compatible";
type AuditProviderStatus = "completed" | "skipped" | "failed";

type ReviewInput = {
  title: string;
  body: string;
  tags: string[];
  platform: string;
};

type ModerationReview = {
  riskLevel: RiskLevel;
  riskTypes: string[];
  matchedRules: string[];
  reason: string;
  suggestedAction: string;
  provider?: ModerationProvider;
  providers?: ModerationProvider[];
};

type ReviewWithAi = (input: ReviewInput) => Promise<ModerationReview | null>;

type ReviewAndScoreOptions = {
  reviewWithAi?: ReviewWithAi;
};

type ReviewDecision = "passed" | "blocked";

const riskWeight: Record<RiskLevel, number> = {
  safe: 0,
  low: 1,
  medium: 2,
  high: 3
};

function normalizeRiskLevel(value: unknown): RiskLevel {
  return value === "low" || value === "medium" || value === "high" ? value : "safe";
}

function normalizeAction(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  if (fenced?.[1]) {
    return fenced[1];
  }

  const object = trimmed.match(/\{[\s\S]*\}/);

  return object?.[0] ?? trimmed;
}

function reviewDecisionForRisk(riskLevel: RiskLevel): ReviewDecision {
  return riskLevel === "safe" || riskLevel === "low" ? "passed" : "blocked";
}

function reviewTokenSecret() {
  return (
    process.env.REVIEW_TOKEN_SECRET ??
    process.env.SESSION_SECRET ??
    process.env.VERIFICATION_CODE_SECRET ??
    "local-review-token-secret"
  );
}

function normalizeReviewInput(input: ReviewInput) {
  return {
    title: input.title.trim(),
    body: input.body.trim(),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    platform: input.platform.trim() || "头条"
  };
}

function createReviewToken(input: ReviewInput, riskLevel: RiskLevel) {
  const payload = JSON.stringify({
    version: 1,
    decision: reviewDecisionForRisk(riskLevel),
    ...normalizeReviewInput(input)
  });

  return crypto
    .createHmac("sha256", reviewTokenSecret())
    .update(payload)
    .digest("base64url");
}

export function verifyReviewToken(
  input: ReviewInput,
  riskLevel: RiskLevel,
  token?: string | null
) {
  if (!token) {
    return false;
  }

  const expected = createReviewToken(input, riskLevel);
  const actualBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function buildAiModerationCompletionParams(
  input: ReviewInput,
  config: { model?: string; user?: string }
) {
  return {
    model: config.model ?? "",
    messages: [
      {
        role: "system" as const,
        content:
          "你是中文内容安全审核员。只返回 JSON，不输出 Markdown。riskLevel 只能是 safe、low、medium、high。"
      },
      {
        role: "user" as const,
        content: [
          `平台：${input.platform}`,
          `标题：${input.title}`,
          `正文：${input.body}`,
          `标签：${input.tags.join(",")}`,
          "返回字段：riskLevel、riskTypes、reason、suggestedAction、matchedRules。"
        ].join("\n")
      }
    ],
    temperature: 0.1,
    user: config.user
  };
}

function mergeModerationReviews(local: ModerationReview, ai: ModerationReview) {
  const chosen = riskWeight[ai.riskLevel] > riskWeight[local.riskLevel] ? ai : local;
  const riskTypes = Array.from(new Set([...local.riskTypes, ...ai.riskTypes]))
    .filter((type) => type !== "none");

  return {
    ...chosen,
    riskTypes: riskTypes.length > 0 ? riskTypes : ["none"],
    matchedRules: Array.from(new Set([...local.matchedRules, ...ai.matchedRules])),
    provider: riskWeight[ai.riskLevel] > riskWeight[local.riskLevel]
      ? ai.provider
      : local.provider,
    providers: ["local-rules", "openai-compatible"] as ModerationProvider[]
  };
}

async function reviewContentWithAi(input: ReviewInput): Promise<ModerationReview | null> {
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  const config = resolveAiProviderConfig();

  if (chooseAiProviderName(config) !== "openai-compatible") {
    return null;
  }

  try {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    });
    const completion = await client.chat.completions.create(
      buildAiModerationCompletionParams(input, config)
    );
    const content = completion.choices[0]?.message.content;

    if (!content) {
      return null;
    }

    const parsed = JSON.parse(cleanJson(content)) as {
      riskLevel?: unknown;
      riskTypes?: unknown;
      reason?: unknown;
      suggestedAction?: unknown;
      matchedRules?: unknown;
    };
    const riskTypes = Array.isArray(parsed.riskTypes)
      ? parsed.riskTypes.map(String).filter(Boolean)
      : [];
    const matchedRules = Array.isArray(parsed.matchedRules)
      ? parsed.matchedRules.map(String).filter(Boolean)
      : [];

    return {
      riskLevel: normalizeRiskLevel(parsed.riskLevel),
      riskTypes: riskTypes.length > 0 ? riskTypes : ["none"],
      matchedRules,
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? parsed.reason.trim()
          : "AI 审核未给出详细原因。",
      suggestedAction: normalizeAction(parsed.suggestedAction, "review"),
      provider: "openai-compatible"
    };
  } catch (error) {
    throw error;
  }
}

export async function reviewAndScoreContent(
  input: ReviewInput,
  options: ReviewAndScoreOptions = {}
) {
  const localReview = reviewContentWithRules(
    `${input.title}\n${input.body}\n${input.tags.join(",")}`
  );
  const localModeration: ModerationReview = {
    ...localReview,
    riskLevel: normalizeRiskLevel(localReview.riskLevel),
    riskTypes: localReview.riskTypes.map(String),
    matchedRules: localReview.matchedRules.map(String),
    suggestedAction: String(localReview.suggestedAction),
    provider: "local-rules" as const
  };
  const reviewWithAi = options.reviewWithAi ?? reviewContentWithAi;
  let aiModeration: ModerationReview | null = null;
  let aiStatus: AuditProviderStatus = "skipped";

  try {
    aiModeration = await reviewWithAi(input);
    aiStatus = aiModeration ? "completed" : "skipped";
  } catch {
    aiStatus = "failed";
  }

  const moderation = aiModeration
    ? mergeModerationReviews(localModeration, aiModeration)
    : {
        ...localModeration,
        providers: ["local-rules"] as ModerationProvider[]
      };
  const quality = scoreQuality(input);

  return {
    reviewToken: createReviewToken(input, moderation.riskLevel),
    moderation,
    localModeration,
    aiModeration,
    auditProviders: {
      local: { provider: "local-rules" as const, status: "completed" as const },
      ai: { provider: "openai-compatible" as const, status: aiStatus }
    },
    quality
  };
}

export function rewriteCompliantContent(content: string) {
  return content
    .replace(/下注|博彩|赌博|稳赚/g, "理性规划")
    .replace(
      /毒品|冰毒|大麻|违禁药|海洛因|摇头丸|K粉|麻古|吸\s*毒|吸食毒品|嗑\s*药|贩\s*毒|制\s*毒|买\s*毒|卖\s*毒/gi,
      "健康风险"
    )
    .replace(/加微信|私聊购买|扫码进群/g, "查看官方渠道")
    .replace(/手机号|住址|身份证|银行卡/g, "隐私信息");
}
