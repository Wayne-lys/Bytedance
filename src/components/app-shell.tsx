"use client";

import { usePathname } from "next/navigation";

const navItems = [
  { label: "创作台", href: "/create" },
  { label: "素材库", href: "/materials" },
  { label: "内容管理", href: "/posts" },
  { label: "审核与质量", href: "/review" },
  { label: "热点榜单", href: "/rankings" },
  { label: "规则体系", href: "/rules" },
  { label: "效果评估", href: "/evaluation" }
];

export function AppShell({
  children,
  eyebrow = "AI Creator Platform",
  title = "AI 创作者辅助生产与分发平台",
  description = "围绕创作、审核、发布、榜单和评估的一条完整演示闭环。"
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="border-b border-line pb-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
                {description}
              </p>
            </div>

            <a
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink transition hover:border-accent"
            >
              登录入口
            </a>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="工作区导航">
            {navItems.map((item) => {
              const active = pathname === item.href;

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-md border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-white/80 text-muted hover:border-accent hover:text-ink"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}
