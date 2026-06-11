import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";

const replaceMock = vi.fn();
const refreshMock = vi.fn();
let pathnameMock = "/create";

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock,
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock
  })
}));

describe("workspace shell", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    refreshMock.mockClear();
    pathnameMock = "/create";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false }), { status: 401 })
      )
    );
  });

  it("renders the Chinese workspace navigation", () => {
    render(
      <AppShell>
        <p>页面内容</p>
      </AppShell>
    );

    expect(screen.getByRole("link", { name: "创作台" })).toHaveAttribute(
      "href",
      "/create"
    );
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute(
      "href",
      "/"
    );
    expect(screen.getByRole("link", { name: "素材资产" })).toHaveAttribute(
      "href",
      "/materials"
    );
    expect(screen.getByText("页面内容")).toBeInTheDocument();
  });

  it("renders SVG icons for public workspace navigation items", () => {
    render(
      <AppShell>
        <p>页面内容</p>
      </AppShell>
    );

    ["首页", "创作台", "素材资产", "热点榜单"].forEach((label) => {
      const link = screen.getByRole("link", { name: label });

      expect(link.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    });
  });

  it("does not render numeric prefixes before sidebar navigation labels", () => {
    render(
      <AppShell>
        <p>页面内容</p>
      </AppShell>
    );

    expect(screen.queryByText("00")).not.toBeInTheDocument();
    expect(screen.queryByText("01")).not.toBeInTheDocument();
    expect(screen.queryByText("02")).not.toBeInTheDocument();
  });

  it("aligns desktop sidebar and content card bottoms", () => {
    render(
      <AppShell>
        <p>页面内容</p>
      </AppShell>
    );

    const contentCard = screen.getByText("页面内容").closest("section");
    const contentScrollArea = screen.getByText("页面内容").parentElement;

    expect(contentCard).toHaveClass("lg:h-[calc(100vh-1rem)]");
    expect(contentCard).toHaveClass("lg:overflow-hidden");
    expect(contentScrollArea).toHaveClass("lg:flex-1");
    expect(contentScrollArea).toHaveClass("lg:overflow-y-auto");
  });

  it("uses a compact toolbar header away from the home page", () => {
    render(
      <AppShell>
        <p>页面内容</p>
      </AppShell>
    );

    const header = screen.getByTestId("workspace-header");
    const heading = screen.getByRole("heading", { name: "AI 创作者工作台" });
    const description = screen.getByText("围绕创作、审核、发布和榜单的完整演示闭环。");

    expect(header).toHaveClass("py-2");
    expect(header).not.toHaveClass("py-3");
    expect(heading).toHaveClass("text-lg");
    expect(description).toHaveClass("sr-only");
  });

  it("keeps a roomier header on the home page", () => {
    pathnameMock = "/";

    render(
      <AppShell>
        <p>页面内容</p>
      </AppShell>
    );

    const header = screen.getByTestId("workspace-header");
    const heading = screen.getByRole("heading", { name: "AI 创作者工作台" });
    const description = screen.getByText("围绕创作、审核、发布和榜单的完整演示闭环。");

    expect(header).toHaveClass("py-3");
    expect(heading).toHaveClass("text-2xl");
    expect(description).not.toHaveClass("sr-only");
  });

  it("uses a deployment-safe system status label", () => {
    render(
      <AppShell>
        <p>页面内容</p>
      </AppShell>
    );

    expect(screen.getByText("系统状态")).toBeInTheDocument();
    expect(screen.queryByText("本地演示环境")).not.toBeInTheDocument();
  });

  it("does not expose restricted navigation while auth is loading", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => undefined))
    );

    render(
      <AppShell>
        <p>页面内容</p>
      </AppShell>
    );

    expect(screen.queryByRole("link", { name: "内容管理" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "审核与质量" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "规则体系" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "权限管理" })).not.toBeInTheDocument();
  });

  it("hides management navigation for creators", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              user: {
                id: "creator_1",
                email: "creator@example.com",
                name: "普通创作者",
                roleLabel: "创作者",
                permissions: []
              }
            }
          }),
          { status: 200 }
        )
      )
    );

    render(
      <AppShell>
        <p>页面内容</p>
      </AppShell>
    );

    expect(await screen.findByText("普通创作者")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "首页" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "创作台" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "素材资产" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "热点榜单" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "内容管理" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "审核与质量" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "规则体系" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "权限管理" })).not.toBeInTheDocument();
  });

  it("shows restricted navigation when the user has matching permissions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              user: {
                id: "admin_1",
                email: "admin@example.com",
                name: "系统管理员",
                roleLabel: "管理员",
                permissions: ["review_content", "manage_rules", "manage_users"]
              }
            }
          }),
          { status: 200 }
        )
      )
    );

    render(
      <AppShell>
        <p>页面内容</p>
      </AppShell>
    );

    expect(await screen.findByText("系统管理员")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "内容管理" })).toHaveAttribute("href", "/posts");
    expect(screen.getByRole("link", { name: "审核与质量" })).toHaveAttribute("href", "/review");
    expect(screen.getByRole("link", { name: "规则体系" })).toHaveAttribute("href", "/rules");
    expect(screen.getByRole("link", { name: "权限管理" })).toHaveAttribute("href", "/permissions");
  });

  it("shows the logged-in user instead of the login entry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              user: {
                id: "user_1",
                email: "test@example.com",
                name: "测试用户"
              }
            }
          }),
          { status: 200 }
        )
      )
    );

    render(
      <AppShell>
        <p>页面内容</p>
      </AppShell>
    );

    expect(await screen.findByText("测试用户")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "登录入口" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "退出登录" })).toBeInTheDocument();
  });

  it("renders logout as a tooltip icon button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              user: {
                id: "user_1",
                email: "test@example.com",
                name: "测试用户"
              }
            }
          }),
          { status: 200 }
        )
      )
    );

    render(
      <AppShell>
        <p>页面内容</p>
      </AppShell>
    );

    const logoutButton = await screen.findByRole("button", { name: "退出登录" });

    expect(logoutButton).toHaveAttribute("title", "退出登录");
    expect(logoutButton.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(logoutButton).not.toHaveTextContent("退出登录");
  });

  it("redirects to the login page after logout", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              user: {
                id: "user_1",
                email: "test@example.com",
                name: "娴嬭瘯鐢ㄦ埛"
              }
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, data: { cookie: "creator_session" } }), {
          status: 200
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    render(
      <AppShell>
        <p>椤甸潰鍐呭</p>
      </AppShell>
    );

    await screen.findByText("娴嬭瘯鐢ㄦ埛");
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith("/api/auth/logout", { method: "POST" });
    });
    expect(replaceMock).toHaveBeenCalledWith("/login");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("renders status badges with their label", () => {
    render(<StatusBadge tone="safe">种子数据</StatusBadge>);

    expect(screen.getByText("种子数据")).toBeInTheDocument();
  });
});
