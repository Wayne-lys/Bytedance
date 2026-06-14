import { notFound } from "next/navigation";
import { PostFeedbackPanel } from "@/components/post-feedback-panel";
import { PostDistributionPanel } from "@/components/post-distribution-panel";
import { QualityScoreCard } from "@/components/quality-score-card";
import { StatusBadge } from "@/components/status-badge";
import { getPostDetail } from "@/features/posts/post-service";
import { getCurrentUser } from "@/lib/auth";

type PostDetail = NonNullable<Awaited<ReturnType<typeof getPostDetail>>>;
type RankingDetailType = "hot" | "latest" | "recommended";
type FeedbackComment = PostDetail["comments"][number] & { canDelete: boolean };

const rankingTypeLabel: Record<RankingDetailType, string> = {
  hot: "热点榜单",
  latest: "新发布",
  recommended: "推荐榜单"
};

function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return "未发布";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

function getReturnTarget(searchParams?: { from?: string; type?: string }) {
  if (searchParams?.from !== "rankings") {
    return {
      href: "/posts",
      label: "返回内容管理"
    };
  }

  const type = searchParams.type;
  const href =
    type === "latest" || type === "recommended"
      ? `/rankings?type=${type}`
      : "/rankings";

  const label =
    type === "latest"
      ? "返回新发布"
      : type === "recommended"
        ? "返回推荐榜单"
        : "返回热点榜单";

  return { href, label };
}

function normalizeRankingType(type: string | undefined): RankingDetailType {
  if (type === "latest" || type === "recommended") {
    return type;
  }

  return "hot";
}

function formatNumber(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("zh-CN");
}

function clampPercent(value: number | null | undefined) {
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

function deriveFreshnessScore(publishedAt: Date | string | null | undefined) {
  if (!publishedAt) {
    return 0;
  }

  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const ageDays = Math.max(0, ageMs / 86_400_000);

  return clampPercent(100 - ageDays * 12);
}

function deriveHeatScore(post: PostDetail) {
  const metric = post.rankingMetric;

  if (!metric) {
    return 0;
  }

  if (metric.heatScore > 0) {
    return metric.heatScore;
  }

  return clampPercent(metric.views * 0.03 + metric.likes * 0.35 + metric.saves * 0.25);
}

function getFeedbackScore(post: PostDetail) {
  return clampPercent(post.rankingMetric?.feedbackScore ?? 0);
}

function getSafetyScore(riskLevel: string | null | undefined) {
  if (riskLevel === "high") {
    return 0;
  }

  if (riskLevel === "medium") {
    return 55;
  }

  if (riskLevel === "low") {
    return 80;
  }

  return 100;
}

function formatRiskLevel(riskLevel: string | null | undefined) {
  if (riskLevel === "high") {
    return "高风险";
  }

  if (riskLevel === "medium") {
    return "中风险";
  }

  if (riskLevel === "low") {
    return "低风险";
  }

  return "安全";
}

function getRankingScore(post: PostDetail) {
  const qualityScore = post.qualitySummary?.total ?? 0;
  const heatScore = deriveHeatScore(post);
  const freshnessScore =
    post.rankingMetric?.freshnessScore && post.rankingMetric.freshnessScore > 0
      ? post.rankingMetric.freshnessScore
      : deriveFreshnessScore(post.publishedAt);
  const feedbackScore = getFeedbackScore(post);
  const riskPenalty = post.rankingMetric?.riskPenalty ?? 0;

  return clampPercent(
    qualityScore * 0.45 +
      heatScore * 0.3 +
      freshnessScore * 0.15 +
      feedbackScore * 0.1 -
      riskPenalty
  );
}

function getRankingFactors(post: PostDetail) {
  const heatScore = deriveHeatScore(post);
  const freshnessScore =
    post.rankingMetric?.freshnessScore && post.rankingMetric.freshnessScore > 0
      ? post.rankingMetric.freshnessScore
      : deriveFreshnessScore(post.publishedAt);
  const feedbackScore = getFeedbackScore(post);
  const riskLevel = post.moderationResult?.riskLevel;

  return [
    {
      label: "内容质量",
      value: post.qualitySummary?.total ?? 0,
      note: "标题、结构和信息密度"
    },
    {
      label: "阅读热度",
      value: heatScore,
      note: `${formatNumber(post.rankingMetric?.views)} 阅读 / ${formatNumber(post.rankingMetric?.likes)} 点赞`
    },
    {
      label: "发布时效",
      value: freshnessScore,
      note: "发布时间与榜单时效"
    },
    {
      label: "用户反馈",
      value: feedbackScore,
      note: `${formatNumber(post.comments.length)} 条评论参与推荐排序`
    },
    {
      label: "审核安全",
      value: getSafetyScore(riskLevel),
      note: formatRiskLevel(riskLevel)
    }
  ];
}

function getPostMedia(post: PostDetail) {
  const materialMedia = post.materials
    .map((item) => {
      const material = "material" in item ? item.material : item;

      return {
        id: material.id,
        name: material.name,
        url: material.url
      };
    })
    .filter((material) => material.url);

  if (materialMedia.length > 0) {
    return materialMedia;
  }

  if (post.coverUrl) {
    return [
      {
        id: "cover",
        name: post.title,
        url: post.coverUrl
      }
    ];
  }

  return [];
}

function serializableDistributions(post: PostDetail) {
  return post.distributions.map((distribution) => ({
    ...distribution,
    syncedAt:
      distribution.syncedAt instanceof Date
        ? distribution.syncedAt.toISOString()
        : distribution.syncedAt
  }));
}

function PostMediaGallery({
  post,
  className = ""
}: {
  post: PostDetail;
  className?: string;
}) {
  const media = getPostMedia(post);

  if (media.length === 0) {
    return null;
  }

  if (media.length === 1) {
    return (
      <img
        src={media[0].url}
        alt={media[0].name}
        width={960}
        height={540}
        className={`${className} aspect-[16/9] w-full rounded-lg border border-line object-cover shadow-crisp`}
      />
    );
  }

  const [primary, ...secondary] = media;

  return (
    <div className={`${className} grid gap-3`}>
      <img
        src={primary.url}
        alt={primary.name}
        width={960}
        height={540}
        className="aspect-[16/9] w-full rounded-lg border border-line object-cover shadow-crisp"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {secondary.map((item) => (
          <figure
            key={item.id}
            className="overflow-hidden rounded-lg border border-line bg-panel-muted shadow-crisp"
          >
            <img
              src={item.url}
              alt={item.name}
              width={420}
              height={315}
              className="aspect-[4/3] w-full object-cover"
            />
            <figcaption className="truncate px-3 py-2 text-sm font-semibold text-muted">
              {item.name}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export default async function ContentDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { from?: string; type?: string };
}) {
  const [post, currentUser] = await Promise.all([
    getPostDetail(params.id, { incrementView: true }),
    getCurrentUser()
  ]);

  if (!post) {
    notFound();
  }

  const feedbackComments = post.comments.map((comment) => ({
    ...comment,
    canDelete: Boolean(currentUser?.id && comment.authorId === currentUser.id)
  }));
  const returnTarget = getReturnTarget(searchParams);
  const isRankingDetail = searchParams?.from === "rankings";
  const readCount = post.rankingMetric?.views ?? 0;

  if (isRankingDetail) {
    return (
      <RankingDetailView
        post={post}
        comments={feedbackComments}
        returnHref={returnTarget.href}
        rankingType={normalizeRankingType(searchParams?.type)}
      />
    );
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8"
      data-testid="content-detail-page"
    >
      <article className="grid w-full max-w-[1360px] gap-7 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="studio-panel min-h-[620px] p-7 sm:p-9 lg:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone="safe">已发布</StatusBadge>
            <span className="text-base text-muted">{formatDate(post.publishedAt)}</span>
            <span className="text-base text-muted">{formatNumber(readCount)} 阅读</span>
          </div>

          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            {post.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-base text-muted">
            <span>发布者：{post.author.name}</span>
            <span>·</span>
            <span>{post.tags.join(" / ")}</span>
          </div>

          <PostMediaGallery post={post} className="mt-8" />

          <div className="mt-8 max-w-4xl whitespace-pre-wrap text-lg leading-9 text-ink">
            {post.body}
          </div>

          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-line bg-panel-muted px-3 py-1.5 text-sm text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        </section>

        <aside className="space-y-5 lg:self-center">
          <div className="studio-panel p-6">
            <p className="text-xs font-semibold text-accent">Reader View</p>
            <p className="mt-3 text-sm text-muted">内容状态</p>
            <p className="mt-2 text-2xl font-semibold text-ink">审核通过，可分发</p>
            <p className="mt-4 text-base leading-7 text-muted">
              详情页聚合了创作者、发布时间、正文、标签和质量评分，满足内容消费侧展示要求。
            </p>
          </div>

          <PostDistributionPanel
            postId={post.id}
            status={post.status}
            moderationRiskLevel={post.moderationResult?.riskLevel}
            initialDistributions={serializableDistributions(post)}
          />

          {post.qualitySummary ? (
            <QualityScoreCard score={post.qualitySummary} size="large" />
          ) : (
            <div className="studio-tile p-6 text-base text-muted">
              暂无质量评分。
            </div>
          )}

          <PostFeedbackPanel
            postId={post.id}
            initialLikes={post.rankingMetric?.likes ?? 0}
            initialFeedbackScore={post.rankingMetric?.feedbackScore ?? 0}
            initialComments={feedbackComments}
          />

          <a
            href={returnTarget.href}
            className="studio-button inline-flex h-12 w-full items-center justify-center border border-line bg-panel text-base font-semibold text-ink hover:border-accent"
          >
            {returnTarget.label}
          </a>
        </aside>
      </article>
    </main>
  );
}

function RankingDetailView({
  post,
  comments,
  returnHref,
  rankingType
}: {
  post: PostDetail;
  comments: FeedbackComment[];
  returnHref: string;
  rankingType: RankingDetailType;
}) {
  const rankingScore = getRankingScore(post);
  const factors = getRankingFactors(post);
  const mediaCount = getPostMedia(post).length;
  const readCount = post.rankingMetric?.views ?? 0;
  const summary =
    rankingType === "hot"
      ? {
          label: "阅读次数",
          value: formatNumber(readCount),
          suffix: "次",
          description: null
        }
        : {
          label: "推荐分",
          value: String(rankingScore),
          suffix: "/ 100",
          description: "综合内容质量、阅读热度、发布时间、用户反馈和风险扣分。"
        };

  return (
    <main
      className="min-h-screen p-4 sm:p-6 lg:p-8"
      data-testid="content-detail-page"
    >
      <article className="mx-auto grid w-full max-w-[1440px] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-crisp">
          <header className="bg-sidebar px-6 py-6 text-white sm:px-8 sm:py-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <a
                href={returnHref}
                className="studio-button inline-flex h-10 items-center justify-center border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white hover:border-white/50"
              >
                返回
              </a>
              <span className="rounded-md border border-teal/40 bg-teal/20 px-3 py-1 text-sm font-semibold text-teal-100">
                {rankingTypeLabel[rankingType]}
              </span>
            </div>

            <p className="mt-9 text-sm font-semibold uppercase tracking-normal text-accent">
              榜单详情
            </p>
            <h1 className="mt-3 max-w-5xl text-4xl font-semibold leading-tight sm:text-5xl">
              {post.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-white/72">
              <span>{post.author.name}</span>
              <span>{formatDate(post.publishedAt)}</span>
              <span>{post.tags.join(" / ")}</span>
            </div>
          </header>

          <div className="p-6 sm:p-8">
            <PostMediaGallery post={post} className="mb-6" />

            <div className="mb-8 max-w-4xl">
              <details
                data-testid="content-info-panel"
                className="group rounded-md border border-line bg-panel/70"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="text-sm font-semibold text-accent">
                      内容信息
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted">
                      发布时间、阅读、互动、审核与素材记录
                    </span>
                  </span>
                  <span className="shrink-0 rounded-sm border border-line bg-panel-muted px-2.5 py-1 text-xs font-semibold text-muted">
                    <span className="group-open:hidden">展开信息</span>
                    <span className="hidden group-open:inline">收起信息</span>
                  </span>
                </summary>

                <div className="divide-y divide-line/80 border-t border-line px-4">
                  {[
                    ["发布时间", formatDate(post.publishedAt)],
                    ["阅读次数", `${formatNumber(readCount)} 次`],
                    ["点赞数量", `${formatNumber(post.rankingMetric?.likes)} 次`],
                    ["评论数量", `${formatNumber(post.comments.length)} 条`],
                    ["审核状态", formatRiskLevel(post.moderationResult?.riskLevel)],
                    ["素材数量", `${mediaCount} 个`],
                    ["发布者", post.author.name]
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="grid gap-1 py-3 sm:grid-cols-[76px_minmax(0,1fr)] sm:items-baseline"
                    >
                      <span className="text-xs font-medium text-muted">
                        {label}
                      </span>
                      <span className="text-left text-sm font-semibold leading-6 text-ink sm:text-right">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>

            <p className="text-sm font-semibold text-accent">正文内容</p>
            <div className="mt-4 max-w-4xl whitespace-pre-wrap text-lg leading-9 text-ink">
              {post.body}
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-line bg-panel-muted px-3 py-1.5 text-sm text-muted"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
          <div className="studio-panel overflow-hidden">
            <div className="bg-sidebar p-6 text-white">
              <p className="text-sm font-semibold text-accent">{summary.label}</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <p className="text-7xl font-semibold leading-none">
                  {summary.value}
                </p>
                <span className="mb-2 rounded-md border border-white/20 px-3 py-1 text-sm text-white/72">
                  {summary.suffix}
                </span>
              </div>
              {summary.description ? (
                <p className="mt-5 text-sm leading-6 text-white/68">
                  {summary.description}
                </p>
              ) : null}
            </div>

            <div className="p-6">
              <p className="text-sm font-semibold text-accent">上榜因素</p>
              <div className="mt-5 space-y-5">
                {factors.map((factor) => (
                  <div key={factor.label}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-semibold text-ink">
                        {factor.label}
                      </span>
                      <span className="text-sm text-muted">
                        {Math.round(factor.value)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-line/70">
                      <div
                        className="h-full rounded-full bg-teal"
                        style={{ width: `${clampPercent(factor.value)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {factor.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <PostFeedbackPanel
            postId={post.id}
            initialLikes={post.rankingMetric?.likes ?? 0}
            initialFeedbackScore={post.rankingMetric?.feedbackScore ?? 0}
            initialComments={comments}
          />

          <a
            href={returnHref}
            className="studio-button inline-flex h-12 w-full items-center justify-center border border-accent bg-panel text-base font-semibold text-ink hover:border-accent"
          >
            返回{rankingTypeLabel[rankingType]}
          </a>
        </aside>
      </article>
    </main>
  );
}
