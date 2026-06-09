import { ReviewWorkspace } from "@/components/review-workspace";
import { hasPermissionAsync } from "@/features/auth/role-service";
import { reviewAndScoreContent } from "@/features/moderation/moderation-service";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function parseRiskTypes(value: string | null | undefined) {
  return (value ?? "none")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fallbackQuality() {
  return {
    originality: 0,
    structure: 0,
    informationDensity: 0,
    clarity: 0,
    interactionPotential: 0,
    platformFit: 0,
    total: 0
  };
}

export default async function ReviewPage() {
  const currentUser = await getCurrentUser();
  const canReviewContent = await hasPermissionAsync(currentUser?.role, "review_content");

  if (!currentUser || !canReviewContent) {
    return (
      <section className="studio-panel p-6">
        <p className="text-xs font-semibold text-accent">Review Workspace</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">审核与质量</h2>
        <div className="mt-5 rounded-md border border-line bg-panel-muted px-4 py-3 text-sm leading-6 text-muted">
          当前账号没有内容审核权限。请使用审核员或管理员账号登录后再操作。
        </div>
      </section>
    );
  }

  const results = await prisma.moderationResult.findMany({
    include: { post: { include: { qualityScore: true } } },
    orderBy: { createdAt: "desc" }
  });
  const demoReview = await reviewAndScoreContent({
    title: "通勤路上的 3 个轻量补能习惯",
    body: "早高峰可以提前准备低糖咖啡、阅读清单和 10 分钟轻运动。每个动作都有明确场景和执行方式。",
    tags: ["通勤", "效率", "生活方式"],
    platform: "头条"
  });
  const fallbackRecord = {
    id: "demo-review",
    title: "通勤路上的 3 个轻量补能习惯",
    body: "早高峰可以提前准备低糖咖啡、阅读清单和 10 分钟轻运动。每个动作都有明确场景和执行方式。",
    riskLevel: demoReview.moderation.riskLevel,
    riskTypes: demoReview.moderation.riskTypes,
    reason: demoReview.moderation.reason,
    suggestedAction: demoReview.moderation.suggestedAction,
    quality: demoReview.quality
  };
  const records = results.map((result) => ({
    id: result.id,
    title: result.post.title,
    body: result.post.body,
    riskLevel: result.riskLevel,
    riskTypes: parseRiskTypes(result.riskTypes),
    reason: result.reason,
    suggestedAction: result.suggestedAction,
    quality: result.post.qualityScore
      ? {
          originality: result.post.qualityScore.originality,
          structure: result.post.qualityScore.structure,
          informationDensity: result.post.qualityScore.informationDensity,
          clarity: result.post.qualityScore.clarity,
          interactionPotential: result.post.qualityScore.interactionPotential,
          platformFit: result.post.qualityScore.platformFit,
          total: result.post.qualityScore.total
        }
      : fallbackQuality()
  }));

  return (
    <ReviewWorkspace
      canReviewContent={canReviewContent}
      records={records}
      fallbackRecord={fallbackRecord}
    />
  );
}
