import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MaterialDeleteButton } from "@/components/material-delete-button";

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock
  })
}));

describe("material delete button", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    vi.unstubAllGlobals();
    vi.stubGlobal("confirm", vi.fn(() => {
      throw new Error("native confirm should not be used");
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, data: { deletedId: "material_1" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
    );
  });

  it("uses an in-app dialog before deleting a material and refreshes the list", async () => {
    render(
      <MaterialDeleteButton
        id="material_1"
        name="通勤清单.png"
        referenceCount={2}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "删除 通勤清单.png" }));

    const dialog = screen.getByRole("dialog", { name: "删除素材" });

    expect(dialog).toHaveTextContent("通勤清单.png");
    expect(dialog).toHaveTextContent("已被引用 2 次");
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/materials/material_1", {
        method: "DELETE"
      });
    });
    expect(await screen.findByText("已删除")).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("does not call the API when deletion is cancelled", () => {
    render(
      <MaterialDeleteButton id="material_1" name="通勤清单.png" referenceCount={0} />
    );

    fireEvent.click(screen.getByRole("button", { name: "删除 通勤清单.png" }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "删除素材" })).not.toBeInTheDocument();
  });
});
