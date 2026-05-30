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
  }
];

describe("prompt library panel", () => {
  it("creates a prompt template from the creation desk", async () => {
    const onCreated = vi.fn();
    const onSelect = vi.fn();

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
});
