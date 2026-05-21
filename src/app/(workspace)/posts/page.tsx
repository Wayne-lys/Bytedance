import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/db";

export default async function PostsPage() {
  const posts = await prisma.post.findMany({
    orderBy: { updatedAt: "desc" },
    include: { qualityScore: true }
  });

  return (
    <section className="rounded-lg border border-line bg-white/85 p-6 shadow-soft">
      <h2 className="text-2xl font-semibold text-ink">内容管理</h2>
      <p className="mt-2 text-sm text-muted">
        管理草稿、已发布和被驳回内容；后续会接入二次编辑、重新审核和更新发布。
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-line">
        {posts.map((post) => (
          <a
            key={post.id}
            href={`/content/${post.id}`}
            className="grid gap-3 border-b border-line bg-white p-4 last:border-b-0 md:grid-cols-[1fr_auto_auto]"
          >
            <div>
              <h3 className="font-semibold text-ink">{post.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{post.body}</p>
            </div>
            <StatusBadge tone="safe">{post.status}</StatusBadge>
            <p className="text-sm font-medium text-ink">
              {post.qualityScore?.total ?? 0} 分
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
