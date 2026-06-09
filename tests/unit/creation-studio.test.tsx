import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreationStudio } from "@/app/(workspace)/create/creation-studio";

const prompts = [
  {
    id: "prompt_1",
    name: "短图文模板",
    scenario: "短图文",
    content: "围绕 {{topic}} 生成短图文。",
    variables: "topic"
  }
];

const materials = [
  {
    id: "material_1",
    name: "城市咖啡店封面",
    url: "/demo-materials/cafe-cover.svg",
    compliance: "safe",
    referenceCount: 0,
    riskReason: null
  },
  {
    id: "material_2",
    name: "通勤补能清单",
    url: "/demo-materials/commute-kit.svg",
    compliance: "safe",
    referenceCount: 1,
    riskReason: null
  },
  {
    id: "material_3",
    name: "白领午休场景",
    url: "/demo-materials/nap-break.svg",
    compliance: "safe",
    referenceCount: 2,
    riskReason: null
  }
];

const Studio = CreationStudio as React.ComponentType<Record<string, unknown>>;

describe("creation studio", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("does not expose a separate review button", () => {
    render(<Studio prompts={prompts} canReviewContent={true} />);

    expect(
      screen.queryByRole("button", { name: "审核内容" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "发布内容" })
    ).toBeInTheDocument();
  });

  it("loads a published post for editing and updates it through PATCH", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              reviewToken: "review-token",
              moderation: {
                riskLevel: "safe",
                reason: "未命中风险规则。",
                suggestedAction: "allow",
                riskTypes: ["none"],
                providers: ["local-rules", "openai-compatible"]
              },
              auditProviders: {
                local: { provider: "local-rules", status: "completed" },
                ai: { provider: "openai-compatible", status: "completed" }
              },
              quality: {
                originality: 60,
                structure: 60,
                informationDensity: 60,
                clarity: 60,
                interactionPotential: 60,
                platformFit: 60,
                total: 60
              }
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: { post: { id: "post_1" } }
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Studio
        prompts={prompts}
        canReviewContent={true}
        editingPostId="post_1"
        initialDraft={{
          title: "已发布标题",
          body: "已发布正文",
          tags: "咖啡,城市",
          platform: "头条"
        }}
      />
    );

    expect(screen.getByDisplayValue("已发布标题")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("标题"), {
      target: { value: "更新后的标题" }
    });
    fireEvent.click(screen.getByRole("button", { name: /发布内容|更新内容/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/posts/post_1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("review-token")
        })
      );
    });
  });

  it("clears the composer after a successful new publish", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              reviewToken: "review-token",
              moderation: {
                riskLevel: "safe",
                reason: "未命中风险规则。",
                suggestedAction: "allow",
                riskTypes: ["none"]
              },
              quality: {
                originality: 60,
                structure: 60,
                informationDensity: 60,
                clarity: 60,
                interactionPotential: 60,
                platformFit: 60,
                total: 60
              }
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: { post: { id: "post_1" } }
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Studio
        prompts={prompts}
        canReviewContent={true}
        initialDraft={{
          id: "draft_1",
          topic: "通勤补能",
          audience: "城市白领",
          title: "待发布标题",
          body: "待发布正文",
          tags: "通勤,效率",
          platform: "头条"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "发布内容" }));

    await screen.findByText("发布成功");
    expect(screen.getByLabelText("选题")).toHaveValue("");
    expect(screen.getByLabelText("目标受众")).toHaveValue("");
    expect(screen.getByLabelText("标题")).toHaveValue("");
    expect(screen.getByLabelText("正文")).toHaveValue("");
    expect(screen.getByLabelText("标签")).toHaveValue("");
  });

  it("uses selected materials as AI context and publish cover", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              generated: {
                title: "结合素材的标题",
                body: "结合素材的正文",
                tags: ["素材", "通勤"]
              }
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              reviewToken: "review-token",
              moderation: {
                riskLevel: "safe",
                reason: "未命中风险规则。",
                suggestedAction: "allow",
                riskTypes: ["none"]
              },
              quality: {
                originality: 60,
                structure: 60,
                informationDensity: 60,
                clarity: 60,
                interactionPotential: 60,
                platformFit: 60,
                total: 60
              }
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: { post: { id: "post_1" } }
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Studio
        prompts={prompts}
        materials={materials}
        canReviewContent={true}
        initialDraft={{
          topic: "通勤补能",
          audience: "城市白领",
          title: "原始标题",
          body: "原始正文",
          tags: "测试",
          platform: "头条"
        }}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "选择素材 城市咖啡店封面" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "选择素材 通勤补能清单" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "选择素材 白领午休场景" }));
    expect(screen.getByAltText("城市咖啡店封面 预览")).toBeInTheDocument();
    expect(screen.getByAltText("通勤补能清单 预览")).toBeInTheDocument();
    expect(screen.getByAltText("白领午休场景 预览")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "AI 生成" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/generate",
        expect.objectContaining({
          body: expect.stringContaining(
            '"materials":["城市咖啡店封面","通勤补能清单","白领午休场景"]'
          )
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "发布内容" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/posts",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"coverUrl":"/demo-materials/cafe-cover.svg"')
        })
      );
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/posts",
      expect.objectContaining({
        body: expect.stringContaining(
          '"materialIds":["material_1","material_2","material_3"]'
        )
      })
    );
  });

  it("shows a creative brief assembled from the rough idea, prompt, and selected materials", () => {
    render(
      <Studio
        prompts={prompts}
        materials={materials}
        canReviewContent={true}
        initialDraft={{
          topic: "通勤补能",
          audience: "城市白领",
          platform: "头条",
          style: "真实、具体、信息密度高"
        }}
      />
    );

    const brief = screen.getByTestId("creative-brief");

    expect(brief).toHaveTextContent("通勤补能");
    expect(brief).toHaveTextContent("城市白领");
    expect(brief).toHaveTextContent("短图文模板");

    fireEvent.click(screen.getByRole("checkbox", { name: "选择素材 城市咖啡店封面" }));

    expect(brief).toHaveTextContent("城市咖啡店封面");
  });

  it("surfaces cover and publish advice returned by AI generation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            generated: {
              title: "结合素材的标题",
              body: "结合素材的正文",
              tags: ["素材", "通勤"],
              coverSuggestion: "优先使用通勤补能清单作为封面。",
              publishAdvice: "建议午休前发布，并保留合规表达。"
            }
          }
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Studio
        prompts={prompts}
        materials={materials}
        canReviewContent={true}
        initialDraft={{
          topic: "通勤补能",
          audience: "城市白领",
          platform: "头条",
          style: "真实、具体、信息密度高"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "AI 生成" }));

    expect(await screen.findByText("封面建议")).toBeInTheDocument();
    expect(screen.getByText("优先使用通勤补能清单作为封面。")).toBeInTheDocument();
    expect(screen.getByText("发布建议")).toBeInTheDocument();
    expect(screen.getByText("建议午休前发布，并保留合规表达。")).toBeInTheDocument();
  });

  it("lays out material options in a two-column scrollable grid", () => {
    render(
      <Studio
        prompts={prompts}
        materials={materials}
        canReviewContent={true}
      />
    );

    const materialGrid = screen.getByTestId("material-option-grid");

    expect(materialGrid).toHaveClass("grid-cols-2");
    expect(materialGrid).toHaveClass("overflow-y-auto");
    expect(materialGrid.className).toContain("max-h-");
  });

  it("clears the current draft on demand and persists the empty draft", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: { draft: { id: "draft_1" } }
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Studio
        prompts={prompts}
        canReviewContent={true}
        initialDraft={{
          id: "draft_1",
          topic: "通勤补能",
          audience: "城市白领",
          title: "要清空的标题",
          body: "要清空的正文",
          tags: "测试",
          platform: "头条"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "一键清空" }));

    await waitFor(() => {
      expect(screen.getByLabelText("标题")).toHaveValue("");
    });
    expect(screen.getByLabelText("正文")).toHaveValue("");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/drafts",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"id":"draft_1"')
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/drafts",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"title":""')
      })
    );
  });

  it("keeps an unpublished local draft when leaving and returning", async () => {
    const { unmount } = render(
      <Studio prompts={prompts} canReviewContent={true} />
    );

    fireEvent.change(screen.getByLabelText("标题"), {
      target: { value: "未发布标题" }
    });
    fireEvent.change(screen.getByLabelText("正文"), {
      target: { value: "未发布正文" }
    });

    await waitFor(() => {
      expect(window.localStorage.getItem("creator-draft")).toContain("未发布标题");
    });

    unmount();
    render(<Studio prompts={prompts} canReviewContent={true} />);

    expect(screen.getByLabelText("标题")).toHaveValue("未发布标题");
    expect(screen.getByLabelText("正文")).toHaveValue("未发布正文");
  });

  it("fills the shell content height without leaving a bottom gap", () => {
    const { container } = render(
      <Studio prompts={prompts} canReviewContent={true} />
    );

    expect(container.firstElementChild).toHaveClass("xl:h-full");
    expect(container.firstElementChild).toHaveClass("xl:min-h-0");
  });

  it("offers one-click compliant rewrite after blocked review", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              moderation: {
                riskLevel: "high",
                reason: "命中涉赌规则。",
                suggestedAction: "block",
                riskTypes: ["涉赌"]
              },
              quality: {
                originality: 60,
                structure: 60,
                informationDensity: 60,
                clarity: 60,
                interactionPotential: 60,
                platformFit: 60,
                total: 60
              }
            }
          }),
          { status: 409 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: { content: "查看官方渠道后可以理性规划。" }
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Studio
        prompts={prompts}
        canReviewContent={true}
        initialDraft={{
          title: "风险内容",
          body: "扫码进群后可以下注稳赚。",
          tags: "测试",
          platform: "头条"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "发布内容" }));
    fireEvent.click(await screen.findByRole("button", { name: "一键合规改写" }));

    await waitFor(() => {
      expect(screen.getByLabelText("正文")).toHaveValue("查看官方渠道后可以理性规划。");
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/moderation/rewrite",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("shows local rules and Ark AI as audit providers after review", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            moderation: {
              riskLevel: "high",
              reason: "命中涉毒规则，Ark AI 同步判定高风险。",
              suggestedAction: "block",
              riskTypes: ["涉毒"],
              providers: ["local-rules", "openai-compatible"]
            },
            auditProviders: {
              local: { provider: "local-rules", status: "completed" },
              ai: { provider: "openai-compatible", status: "completed" }
            },
            quality: {
              originality: 60,
              structure: 60,
              informationDensity: 60,
              clarity: 60,
              interactionPotential: 60,
              platformFit: 60,
              total: 60
            }
          }
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Studio
        prompts={prompts}
        canReviewContent={true}
        initialDraft={{
          title: "我要吸毒",
          body: "我要吸毒",
          tags: "测试",
          platform: "头条"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "发布内容" }));

    expect(await screen.findByText("审核来源：本地规则 / Ark AI")).toBeInTheDocument();
    expect(screen.getByText("Ark AI：已完成")).toBeInTheDocument();
  });

  it("keeps the current draft visible while AI generation is pending", async () => {
    const pendingGeneration = new Promise<Response>(() => undefined);
    const fetchMock = vi.fn().mockReturnValue(pendingGeneration);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Studio
        prompts={prompts}
        canReviewContent={true}
        initialDraft={{
          topic: "通勤补能",
          audience: "城市白领",
          title: "原始标题",
          body: "原始正文",
          tags: "测试",
          platform: "头条"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "AI 生成" }));

    const generateButton = screen.getByRole("button", { name: "AI 生成" });
    const saveButton = screen.getByRole("button", { name: "立即保存" });
    const publishButton = screen.getByRole("button", { name: /发布内容|更新内容/ });

    expect(screen.getByLabelText("标题")).toHaveValue("原始标题");
    expect(screen.getByLabelText("正文")).toHaveValue("原始正文");
    expect(screen.getByText("AI 生成中...")).toBeInTheDocument();
    expect(generateButton).toBeDisabled();
    expect(saveButton).toBeDisabled();
    expect(publishButton).toBeDisabled();
    expect(generateButton).toHaveAttribute("aria-busy", "true");
    expect(generateButton.querySelector(".animate-spin")).not.toBeNull();
  });

  it("locks composer fields while an action is pending", async () => {
    const pendingGeneration = new Promise<Response>(() => undefined);
    const fetchMock = vi.fn().mockReturnValue(pendingGeneration);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Studio
        prompts={prompts}
        canReviewContent={true}
        initialDraft={{
          topic: "通勤补能",
          audience: "城市白领",
          title: "原始标题",
          body: "原始正文",
          tags: "测试",
          platform: "头条",
          style: "真实可信"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "AI 生成" }));

    expect(screen.getByLabelText("选题")).toBeDisabled();
    expect(screen.getByLabelText("目标受众")).toBeDisabled();
    expect(screen.getByLabelText("发布平台")).toBeDisabled();
    expect(screen.getByLabelText("内容风格")).toBeDisabled();
    expect(screen.getByLabelText("标题")).toBeDisabled();
    expect(screen.getByLabelText("正文")).toBeDisabled();
    expect(screen.getByLabelText("标签")).toBeDisabled();
    expect(screen.getByRole("button", { name: "新增 Prompt" })).toBeDisabled();
    expect(screen.getByLabelText("查找 Prompt")).toBeDisabled();
    expect(screen.getByRole("button", { name: /选择/ })).toBeDisabled();
  });

  it("locks action buttons and shows a spinner while automatic review is pending", async () => {
    const pendingReview = new Promise<Response>(() => undefined);
    const fetchMock = vi.fn().mockReturnValue(pendingReview);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Studio
        prompts={prompts}
        canReviewContent={true}
        initialDraft={{
          title: "待审核内容",
          body: "这是一条等待审核的内容。",
          tags: "测试",
          platform: "头条"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "发布内容" }));

    const generateButton = screen.getByRole("button", { name: "AI 生成" });
    const saveButton = screen.getByRole("button", { name: "立即保存" });
    const publishButton = screen.getByRole("button", { name: /发布内容|更新内容/ });

    expect(generateButton).toBeDisabled();
    expect(saveButton).toBeDisabled();
    expect(publishButton).toBeDisabled();
    expect(publishButton).toHaveAttribute("aria-busy", "true");
    expect(publishButton.querySelector(".animate-spin")).not.toBeNull();
  });

  it("keeps content and skips publish when automatic review fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            moderation: {
              riskLevel: "high",
              reason: "命中涉毒规则。",
              suggestedAction: "block",
              riskTypes: ["涉毒"],
              providers: ["local-rules", "openai-compatible"]
            },
            quality: {
              originality: 60,
              structure: 60,
              informationDensity: 60,
              clarity: 60,
              interactionPotential: 60,
              platformFit: 60,
              total: 60
            }
          }
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Studio
        prompts={prompts}
        canReviewContent={true}
        initialDraft={{
          title: "未通过标题",
          body: "我要吸毒",
          tags: "测试",
          platform: "头条"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /发布内容|更新内容/ }));

    expect(await screen.findByText("审核未通过：命中涉毒规则。")).toBeInTheDocument();
    expect(screen.getByLabelText("标题")).toHaveValue("未通过标题");
    expect(screen.getByLabelText("正文")).toHaveValue("我要吸毒");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/moderation/review",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("explains why review failed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            moderation: {
              riskLevel: "high",
              reason: "命中涉毒规则。",
              suggestedAction: "block",
              riskTypes: ["涉毒"],
              providers: ["local-rules", "openai-compatible"]
            },
            auditProviders: {
              local: { provider: "local-rules", status: "completed" },
              ai: { provider: "openai-compatible", status: "completed" }
            },
            quality: {
              originality: 60,
              structure: 60,
              informationDensity: 60,
              clarity: 60,
              interactionPotential: 60,
              platformFit: 60,
              total: 60
            }
          }
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Studio
        prompts={prompts}
        canReviewContent={true}
        initialDraft={{
          title: "我要吸毒",
          body: "我要吸毒",
          tags: "测试",
          platform: "头条"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "发布内容" }));

    expect(await screen.findByText("审核未通过：命中涉毒规则。")).toBeInTheDocument();
  });
});
