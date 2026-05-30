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

  it("supports simulated phone code login and registration", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ok: true,
              data: { phone: "13900000000", code: "246810" }
            }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ok: true,
              data: {
                user: {
                  id: "phone_user_1",
                  phone: "13900000000",
                  name: "手机用户 0000"
                }
              }
            }),
            { status: 200 }
          )
        )
    );

    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "手机号验证码" }));
    fireEvent.change(screen.getByLabelText("手机号"), {
      target: { value: "13900000000" }
    });
    fireEvent.click(screen.getByRole("button", { name: "获取验证码" }));

    expect(await screen.findByText(/演示验证码：246810/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("验证码"), {
      target: { value: "246810" }
    });
    fireEvent.click(screen.getByRole("button", { name: "验证码登录 / 注册" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            type: "phone",
            phone: "13900000000",
            code: "246810"
          })
        })
      );
    });
  });
});
