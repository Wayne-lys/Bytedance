import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PromptLibraryPanel } from "@/components/prompt-library-panel";

const prompts = [
  {
    id: "prompt_1",
    name: "头条信息流",
    scenario: "头条",
    content: "生成信息密度高的图文内容。",
    variables: "topic,audience,platform"
  },
  {
    id: "prompt_2",
    name: "清单体模板",
    scenario: "清单",
    content: "围绕 {{topic}} 生成 5 个要点。",
    variables: "topic"
  }
];

describe("prompt library panel", () => {
  it("creates a prompt template from the creation desk", async () => {
    const onCreated = vi.fn();
    const onSelect = vi.fn();
    const onUpdated = vi.fn();
    const onDeleted = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              prompt: {
                id: "prompt_2",
                name: "爆文标题",
                scenario: "标题",
                content: "围绕 {{topic}} 生成 10 个标题。",
                variables: "topic"
              }
            }
          }),
          { status: 200 }
        )
      )
    );

    render(
      <PromptLibraryPanel
        prompts={prompts}
        selectedPromptId="prompt_1"
        onSelect={onSelect}
        onCreated={onCreated}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "新增 Prompt" }));
    fireEvent.change(screen.getByLabelText("模板名称"), {
      target: { value: "爆文标题" }
    });
    fireEvent.change(screen.getByLabelText("适用场景"), {
      target: { value: "标题" }
    });
    fireEvent.change(screen.getByLabelText("变量"), {
      target: { value: "topic" }
    });
    fireEvent.change(screen.getByLabelText("Prompt 内容"), {
      target: { value: "围绕 {{topic}} 生成 10 个标题。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存 Prompt" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/prompts",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "爆文标题",
            scenario: "标题",
            variables: "topic",
            content: "围绕 {{topic}} 生成 10 个标题。"
          })
        })
      );
    });
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: "prompt_2", name: "爆文标题" })
    );
  });

  it("edits and deletes prompt templates from the creation desk", async () => {
    const onCreated = vi.fn();
    const onSelect = vi.fn();
    const onUpdated = vi.fn();
    const onDeleted = vi.fn();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/prompts/prompt_1" && init?.method === "PATCH") {
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              prompt: {
                id: "prompt_1",
                name: "头条标题模板",
                scenario: "标题",
                content: "围绕 {{topic}} 生成 10 个标题。",
                variables: "topic"
              }
            }
          }),
          { status: 200 }
        );
      }

      if (url === "/api/prompts/prompt_1" && init?.method === "DELETE") {
        return new Response(
          JSON.stringify({
            ok: true,
            data: { prompt: { id: "prompt_1" } }
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ ok: false, error: "unexpected request" }), {
        status: 500
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <PromptLibraryPanel
        prompts={prompts}
        selectedPromptId="prompt_1"
        onSelect={onSelect}
        onCreated={onCreated}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "编辑 头条信息流" }));
    fireEvent.change(screen.getByLabelText("模板名称"), {
      target: { value: "头条标题模板" }
    });
    fireEvent.change(screen.getByLabelText("适用场景"), {
      target: { value: "标题" }
    });
    fireEvent.change(screen.getByLabelText("Prompt 内容"), {
      target: { value: "围绕 {{topic}} 生成 10 个标题。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/prompts/prompt_1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            name: "头条标题模板",
            scenario: "标题",
            variables: "topic,audience,platform",
            content: "围绕 {{topic}} 生成 10 个标题。"
          })
        })
      );
    });
    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ id: "prompt_1", name: "头条标题模板" })
    );

    fireEvent.click(screen.getByRole("button", { name: "删除 头条信息流" }));
    await screen.findByRole("dialog", { name: "删除 Prompt" });
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/prompts/prompt_1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
    expect(onDeleted).toHaveBeenCalledWith("prompt_1");
  });

  it("filters prompt templates by keyword", () => {
    render(
      <PromptLibraryPanel
        prompts={prompts}
        selectedPromptId="prompt_1"
        onSelect={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("查找 Prompt"), {
      target: { value: "清单" }
    });

    expect(screen.getByRole("button", { name: "选择 清单体模板" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "选择 头条信息流" })).not.toBeInTheDocument();
    expect(screen.getByText("显示 1 / 2 个")).toBeVisible();
  });
});
