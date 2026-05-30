import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PromptPicker } from "@/components/prompt-picker";

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

describe("prompt picker", () => {
  it("lets creators select the prompt template used for generation", () => {
    const onSelect = vi.fn();

    render(
      <PromptPicker
        prompts={prompts}
        selectedPromptId="prompt_1"
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /选择 清单体模板/ }));

    expect(onSelect).toHaveBeenCalledWith("prompt_2");
    expect(screen.getByRole("button", { name: /选择 头条信息流/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
