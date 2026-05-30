"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "创作台", href: "/create", index: "01" },
  { label: "素材库", href: "/materials", index: "02" },
  { label: "内容管理", href: "/posts", index: "03" },
  { label: "审核与质量", href: "/review", index: "04" },
  { label: "热点榜单", href: "/rankings", index: "05" },
  { label: "规则体系", href: "/rules", index: "06" },
  { label: "效果评估", href: "/evaluation", index: "07" }
];

type SessionUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
};

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
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me");
        const payload = await response.json();

        if (!active) {
          return;
        }

        setCurrentUser(payload.ok ? payload.data.user : null);
      } catch {
        if (active) {
          setCurrentUser(null);
        }
      } finally {
        if (active) {
          setAuthChecked(true);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setAuthChecked(true);
  }

  return (
    <main className="min-h-screen p-3 sm:p-4">
      <div className="mx-auto grid max-w-[1720px] gap-4 lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-lg bg-sidebar text-[#f6efe4] shadow-soft lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="flex h-full flex-col">
            <a href="/" className="border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-accent text-base font-semibold text-white shadow-crisp">
                  AI
                </span>
                <div>
                  <p className="text-sm font-semibold leading-5">Toutiao Studio</p>
                  <p className="mt-1 text-xs text-[#cbbfb1]">Creator Ops Console</p>
                </div>
              </div>
            </a>

            <nav className="flex gap-2 overflow-x-auto border-b border-white/10 p-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:border-b-0" aria-label="工作区导航">
              {navItems.map((item) => {
                const active = pathname === item.href;

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`group flex min-w-32 shrink-0 items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition lg:min-w-0 ${
                      active
                        ? "border-accent bg-accent text-white shadow-crisp"
                        : "border-white/10 bg-white/[0.035] text-[#d9cec2] hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`text-xs ${active ? "text-white/75" : "text-[#a99686]"}`}
                    >
                      {item.index}
                    </span>
                    <span className="font-medium leading-5">{item.label}</span>
                  </a>
                );
              })}
            </nav>

            <div className="hidden border-t border-white/10 p-3 lg:block">
              <div className="rounded-md border border-white/10 bg-white/[0.04] p-3.5">
                <p className="text-xs text-[#cbbfb1]">交付状态</p>
                <p className="mt-2 text-base font-semibold text-white">MVP + 进阶挑战</p>
                <div className="mt-3 h-1.5 rounded-full bg-white/10">
                  <div className="h-1.5 w-full rounded-full bg-accent" />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-lg border border-line bg-paper/80 shadow-soft">
          <header className="border-b border-line bg-panel/78 px-5 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl">
                <p className="text-xs font-semibold text-accent">{eyebrow}</p>
                <h1 className="mt-2 text-2xl font-semibold leading-tight text-ink sm:text-3xl">
                  {title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                  {description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/rankings"
                  className="studio-button inline-flex h-10 items-center justify-center border border-line bg-panel px-4 text-sm font-medium text-ink hover:border-accent"
                >
                  查看榜单
                </a>
                {currentUser ? (
                  <>
                    <span className="studio-button inline-flex h-10 items-center justify-center border border-line bg-panel px-4 text-sm font-medium text-ink">
                      {currentUser.name ?? currentUser.email ?? currentUser.phone ?? "已登录"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="studio-button inline-flex h-10 items-center justify-center bg-sidebar px-4 text-sm font-medium text-white shadow-crisp hover:bg-accent"
                    >
                      退出登录
                    </button>
                  </>
                ) : authChecked ? (
                  <a
                    href="/login"
                    className="studio-button inline-flex h-10 items-center justify-center bg-sidebar px-4 text-sm font-medium text-white shadow-crisp hover:bg-accent"
                  >
                    登录入口
                  </a>
                ) : null}
              </div>
            </div>
          </header>

          <div className="px-5 py-5 md:px-6 md:py-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
