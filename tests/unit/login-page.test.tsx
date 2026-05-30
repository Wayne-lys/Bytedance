import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/(auth)/login/page";

describe("login page", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              user: {
                id: "user_1",
                email: "new@example.com",
                name: "新创作者"
              }
            }
          }),
          { status: 200 }
        )
      )
    );
  });

  it("lets a new creator register from the access page", async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "注册账号" }));
    fireEvent.change(screen.getByLabelText("昵称"), {
      target: { value: "新创作者" }
    });
    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "new@example.com" }
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "NewPass123" }
    });
    fireEvent.click(screen.getByRole("button", { name: "创建账号" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "新创作者",
            email: "new@example.com",
            password: "NewPass123"
          })
        })
      );
    });
  });
});
