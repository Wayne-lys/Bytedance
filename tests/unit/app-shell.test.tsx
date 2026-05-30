import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";

vi.mock("next/navigation", () => ({
  usePathname: () => "/create"
}));

describe("workspace shell", () => {
  beforeEach(() => {
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
    expect(screen.getByRole("link", { name: "素材库" })).toHaveAttribute(
      "href",
      "/materials"
    );
    expect(screen.getByText("页面内容")).toBeInTheDocument();
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

  it("renders status badges with their label", () => {
    render(<StatusBadge tone="safe">种子数据</StatusBadge>);

    expect(screen.getByText("种子数据")).toBeInTheDocument();
  });
});
