"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Permission } from "@/features/auth/permissions";

type NavItem = {
  label: string;
  href: string;
  requiredPermission?: Permission;
};

const navItems: NavItem[] = [
  { label: "首页", href: "/" },
  { label: "创作台", href: "/create" },
  { label: "素材资产", href: "/materials" },
  { label: "内容管理", href: "/posts", requiredPermission: "review_content" },
  { label: "审核与质量", href: "/review", requiredPermission: "review_content" },
  { label: "热点榜单", href: "/rankings" },
  { label: "规则体系", href: "/rules", requiredPermission: "manage_rules" },
  { label: "权限管理", href: "/permissions", requiredPermission: "manage_users" }
];

type SessionUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  roleLabel?: string;
  permissions?: string[];
  permissionLabels?: string[];
};

function resolveSystemStatusLabel() {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "preview") {
    return "预览演示环境";
  }

  if (
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return "线上演示环境";
  }

  return "开发调试环境";
}

export function AppShell({
  children,
  eyebrow = "AI 内容工作台",
  title = "AI 创作者工作台",
  description = "围绕创作、审核、发布和榜单的完整演示闭环。"
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
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
    router.replace("/login");
    router.refresh();
  }

  const visibleNavItems = navItems.filter(
    (item) =>
      !item.requiredPermission ||
      currentUser?.permissions?.includes(item.requiredPermission)
  );
  const systemStatusLabel = resolveSystemStatusLabel();

  return (
    <main className="min-h-screen p-1.5 sm:p-2">
      <div className="grid w-full gap-2 lg:grid-cols-[244px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-lg bg-sidebar text-[#f6efe4] shadow-soft lg:sticky lg:top-2 lg:h-[calc(100vh-1rem)]">
          <div className="flex h-full flex-col">
            <Link href="/" className="border-b border-white/10 p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-md bg-accent text-base font-semibold text-white shadow-crisp sm:size-10">
                  AI
                </span>
                <div>
                  <p className="text-sm font-semibold leading-5">Toutiao Studio</p>
                  <p className="mt-1 text-xs text-[#cbbfb1]">内容生产与治理平台</p>
                </div>
              </div>
            </Link>

            <nav className="flex gap-2 overflow-x-auto border-b border-white/10 p-2 sm:p-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:border-b-0" aria-label="工作区导航">
              {visibleNavItems.map((item, visibleIndex) => {
                const active = pathname === item.href;
                const displayIndex = visibleIndex.toString().padStart(2, "0");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex min-w-28 shrink-0 items-center gap-3 rounded-md border px-3 py-2 text-sm transition lg:min-w-0 lg:py-2.5 ${
                      active
                        ? "border-accent bg-accent text-white shadow-crisp"
                        : "border-white/10 bg-white/[0.035] text-[#d9cec2] hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`text-xs ${active ? "text-white/75" : "text-[#a99686]"}`}
                    >
                      {displayIndex}
                    </span>
                    <span className="font-medium leading-5">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="hidden border-t border-white/10 p-3 lg:block">
              <div className="rounded-md border border-white/10 bg-white/[0.04] p-3.5">
                <p className="text-xs text-[#cbbfb1]">系统状态</p>
                <p className="mt-2 text-base font-semibold text-white">
                  {systemStatusLabel}
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-white/10">
                  <div className="h-1.5 w-full rounded-full bg-accent" />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-lg border border-line bg-paper/80 shadow-soft lg:flex lg:h-[calc(100vh-1rem)] lg:flex-col lg:overflow-hidden">
          <header className="shrink-0 border-b border-line bg-panel/78 px-4 py-3 backdrop-blur md:px-5 md:py-4">
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
                <Link
                  href="/rankings"
                  className="studio-button inline-flex h-10 items-center justify-center border border-line bg-panel px-4 text-sm font-medium text-ink hover:border-accent"
                >
                  查看榜单
                </Link>
                {currentUser ? (
                  <>
                    <span className="studio-button inline-flex h-10 items-center justify-center border border-line bg-panel px-4 text-sm font-medium text-ink">
                      <span className="max-w-44 truncate">
                        {currentUser.name ?? currentUser.email ?? currentUser.phone ?? "已登录"}
                      </span>
                      {currentUser.roleLabel ? (
                        <span className="ml-2 rounded-sm bg-panel-muted px-1.5 py-0.5 text-xs text-muted">
                          {currentUser.roleLabel}
                        </span>
                      ) : null}
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
                  <Link
                    href="/login"
                    className="studio-button inline-flex h-10 items-center justify-center bg-sidebar px-4 text-sm font-medium text-white shadow-crisp hover:bg-accent"
                  >
                    登录入口
                  </Link>
                ) : null}
              </div>
            </div>
          </header>

          <div className="px-4 py-4 md:px-5 md:py-5 lg:flex lg:flex-1 lg:flex-col lg:overflow-y-auto">{children}</div>
        </section>
      </div>
    </main>
  );
}
