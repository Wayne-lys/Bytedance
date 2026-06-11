"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Permission } from "@/features/auth/permissions";

type NavItem = {
  label: string;
  href: string;
  icon: NavIconName;
  requiredPermission?: Permission;
};

type NavIconName =
  | "home"
  | "create"
  | "materials"
  | "posts"
  | "review"
  | "rankings"
  | "rules"
  | "permissions";

const navItems: NavItem[] = [
  { label: "首页", href: "/", icon: "home" },
  { label: "创作台", href: "/create", icon: "create" },
  { label: "素材资产", href: "/materials", icon: "materials" },
  { label: "内容管理", href: "/posts", icon: "posts", requiredPermission: "review_content" },
  { label: "审核与质量", href: "/review", icon: "review", requiredPermission: "review_content" },
  { label: "热点榜单", href: "/rankings", icon: "rankings" },
  { label: "规则体系", href: "/rules", icon: "rules", requiredPermission: "manage_rules" },
  { label: "权限管理", href: "/permissions", icon: "permissions", requiredPermission: "manage_users" }
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

function IconSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function NavIcon({ name }: { name: NavIconName }) {
  switch (name) {
    case "home":
      return (
        <IconSvg>
          <path d="M4 10.5 12 4l8 6.5" />
          <path d="M6.5 9.5V20h11V9.5" />
          <path d="M10 20v-5h4v5" />
        </IconSvg>
      );
    case "create":
      return (
        <IconSvg>
          <path d="M5 19h14" />
          <path d="M7 16.5 16.8 6.7a1.7 1.7 0 0 1 2.4 2.4L9.4 18.9 6 19.5z" />
          <path d="m15.5 8 2.5 2.5" />
        </IconSvg>
      );
    case "materials":
      return (
        <IconSvg>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m4 16 4.2-4.2a1.5 1.5 0 0 1 2.1 0L13 14.5l1.4-1.4a1.5 1.5 0 0 1 2.1 0L20 16.6" />
        </IconSvg>
      );
    case "posts":
      return (
        <IconSvg>
          <path d="M6 4h9l3 3v13H6z" />
          <path d="M15 4v4h4" />
          <path d="M9 12h6" />
          <path d="M9 16h6" />
        </IconSvg>
      );
    case "review":
      return (
        <IconSvg>
          <path d="M12 3 19 6v5.2c0 4.2-2.7 7.2-7 9.1-4.3-1.9-7-4.9-7-9.1V6z" />
          <path d="m8.5 12.2 2.2 2.2 4.8-5" />
        </IconSvg>
      );
    case "rankings":
      return (
        <IconSvg>
          <path d="M5 19V9" />
          <path d="M12 19V5" />
          <path d="M19 19v-7" />
          <path d="M4 19h16" />
        </IconSvg>
      );
    case "rules":
      return (
        <IconSvg>
          <path d="M7 7h10" />
          <path d="M7 12h10" />
          <path d="M7 17h7" />
          <path d="m4 7 .8.8L6 6.5" />
          <path d="m4 12 .8.8L6 11.5" />
          <path d="m4 17 .8.8L6 16.5" />
        </IconSvg>
      );
    case "permissions":
      return (
        <IconSvg>
          <circle cx="9" cy="8" r="3" />
          <path d="M4 19c.8-3 2.6-4.5 5-4.5 1.2 0 2.2.3 3 1" />
          <path d="M15 14.5h5" />
          <path d="M18 11.5v6" />
        </IconSvg>
      );
  }
}

function LogoutIcon() {
  return (
    <IconSvg>
      <path d="M9 6H6.8A1.8 1.8 0 0 0 5 7.8v8.4A1.8 1.8 0 0 0 6.8 18H9" />
      <path d="M13 8l4 4-4 4" />
      <path d="M17 12H9" />
    </IconSvg>
  );
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
  const isHomePage = pathname === "/";

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
              {visibleNavItems.map((item) => {
                const active = pathname === item.href;

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
                      className={`flex size-7 shrink-0 items-center justify-center rounded-sm border ${
                        active
                          ? "border-white/25 bg-white/15 text-white"
                          : "border-white/10 bg-white/[0.04] text-[#b7a999] group-hover:border-white/20 group-hover:text-white"
                      }`}
                    >
                      <NavIcon name={item.icon} />
                    </span>
                    <span className="min-w-0 truncate font-medium leading-5">{item.label}</span>
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
          <header
            data-testid="workspace-header"
            className="shrink-0 border-b border-line bg-panel/78 px-4 py-2 backdrop-blur md:px-5"
          >
            <div
              data-testid="workspace-header-layout"
              className={
                isHomePage
                  ? "flex flex-wrap items-center justify-end gap-2"
                  : "flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
              }
            >
              {!isHomePage ? (
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="shrink-0 text-xs font-semibold text-accent">{eyebrow}</p>
                  <h1 className="min-w-0 truncate text-lg font-semibold leading-6 text-ink">
                    {title}
                  </h1>
                  <p className="sr-only">{description}</p>
                </div>
              ) : null}

              <div
                data-testid="workspace-header-actions"
                className="flex flex-wrap items-center justify-end gap-2"
              >
                <Link
                  href="/rankings"
                  className="studio-button inline-flex h-9 items-center justify-center border border-line bg-panel px-3 text-sm font-medium text-ink hover:border-accent"
                >
                  查看榜单
                </Link>
                {currentUser ? (
                  <>
                    <span
                      className="studio-button inline-flex h-9 items-center justify-center border border-line bg-panel px-3 text-sm font-medium text-ink"
                    >
                      <span className="max-w-36 truncate">
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
                      aria-label="退出登录"
                      title="退出登录"
                      onClick={() => void logout()}
                      className="studio-button inline-flex size-9 items-center justify-center bg-sidebar text-white shadow-crisp hover:bg-accent"
                    >
                      <LogoutIcon />
                    </button>
                  </>
                ) : authChecked ? (
                  <Link
                    href="/login"
                    className="studio-button inline-flex h-9 items-center justify-center bg-sidebar px-3 text-sm font-medium text-white shadow-crisp hover:bg-accent"
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
