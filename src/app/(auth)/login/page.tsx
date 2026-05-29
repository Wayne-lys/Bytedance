"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("creator@example.com");
  const [password, setPassword] = useState("Demo123456");
  const [error, setError] = useState("");

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "email", email, password })
    });
    const payload = await response.json();

    if (!payload.ok) {
      setError(payload.error ?? "登录失败");
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-10">
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">
            Creator Access
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink">
            登录 AI 创作者工作台
          </h1>
          <p className="mt-5 text-base leading-7 text-muted">
            进入后可以管理素材、生成短图文、查看审核质量结果，并把内容发布到热点榜单。
          </p>
        </div>

        <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
          <form onSubmit={login} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink">邮箱</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-line bg-[#fbfaf6] px-3 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-line bg-[#fbfaf6] px-3 text-sm outline-none focus:border-accent"
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              className="h-11 w-full rounded-md bg-accent px-4 text-sm font-medium text-white transition hover:bg-[#176854]"
            >
              登录
            </button>
          </form>

          <div className="mt-6 rounded-lg bg-[#f7f5ef] p-5">
            <p className="text-sm font-medium text-ink">演示账号</p>
            <p className="mt-2 text-sm text-muted">邮箱：creator@example.com</p>
            <p className="mt-1 text-sm text-muted">密码：Demo123456</p>
            <p className="mt-1 text-sm text-muted">模拟手机号：13800000000</p>
          </div>
        </div>
      </section>
    </main>
  );
}
