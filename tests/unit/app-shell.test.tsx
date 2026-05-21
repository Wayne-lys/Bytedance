import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";

vi.mock("next/navigation", () => ({
  usePathname: () => "/create"
}));

describe("workspace shell", () => {
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

  it("renders status badges with their label", () => {
    render(<StatusBadge tone="safe">种子数据</StatusBadge>);

    expect(screen.getByText("种子数据")).toBeInTheDocument();
  });
});
