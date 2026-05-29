import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MaterialUploadPanel } from "@/components/material-upload-panel";

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock
  })
}));

describe("material upload panel", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              material: {
                id: "material_new",
                name: "扫码进群素材.png",
                compliance: "warning",
                riskReason: "文件名包含可能导流或高风险词：扫码"
              }
            }
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      )
    );
    vi.stubGlobal(
      "FileReader",
      class {
        result: string | ArrayBuffer | null = null;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        readAsDataURL() {
          this.result = "data:image/png;base64,preview-image";
          this.onload?.();
        }
      }
    );
  });

  it("opens the upload form and creates a material through the API", async () => {
    render(<MaterialUploadPanel />);

    expect(screen.queryByLabelText("素材名称")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "上传素材" }));
    fireEvent.change(screen.getByLabelText("素材名称"), {
      target: { value: "扫码进群素材.png" }
    });
    fireEvent.change(screen.getByLabelText("文件大小"), {
      target: { value: "234567" }
    });
    fireEvent.click(screen.getByRole("button", { name: "确认上传" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/materials",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" }
        })
      );
    });

    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      name: "扫码进群素材.png",
      type: "image/png",
      size: 234567
    });
    expect(await screen.findByText("上传成功，素材已加入列表")).toBeInTheDocument();
    expect(screen.getByText("合规状态：预警")).toBeInTheDocument();
    expect(screen.getByText("文件名包含可能导流或高风险词：扫码")).toBeInTheDocument();
    expect(screen.queryByLabelText("素材名称")).not.toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("sends the selected image preview url and closes the form after upload", async () => {
    render(<MaterialUploadPanel />);

    fireEvent.click(screen.getByRole("button", { name: "上传素材" }));
    fireEvent.change(screen.getByLabelText("本地文件"), {
      target: {
        files: [
          new File(["preview"], "真实图片.png", {
            type: "image/png"
          })
        ]
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "确认上传" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      name: "真实图片.png",
      type: "image/png",
      size: 7,
      url: "data:image/png;base64,preview-image"
    });
    expect(await screen.findByText("上传成功，素材已加入列表")).toBeInTheDocument();
    expect(screen.queryByLabelText("素材名称")).not.toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
