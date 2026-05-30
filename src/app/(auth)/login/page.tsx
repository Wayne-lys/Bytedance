"use client";

import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("creator@example.com");
  const [password, setPassword] = useState("Demo123456");
  const [error, setError] = useState("");

  function switchMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setError("");

    if (nextMode === "register") {
      setName("");
      setEmail("");
      setPassword("");
    } else {
      setEmail("creator@example.com");
      setPassword("Demo123456");
    }
  }

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "register"
          ? { name, email, password }
          : { type: "email", email, password }
      )
    });
    const payload = await response.json();

    if (!payload.ok) {
      setError(payload.error ?? (mode === "register" ? "注册失败" : "登录失败"));
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-lg border border-line bg-panel shadow-soft lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-between bg-sidebar p-7 text-white sm:p-10">
          <div>
            <p className="text-sm font-semibold text-[#d7c9b6]">Creator Access</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              创作者访问入口
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#d7c9b6]">
              进入后可以管理素材、生成短图文、查看审核质量结果，并把内容发布到热点榜单。
            </p>
          </div>
          <div className="mt-10 grid gap-3 text-sm text-[#d7c9b6] sm:grid-cols-3 lg:grid-cols-1">
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
              AI 生成
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
              安全审核
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
              智能分发
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-7">
            <p className="text-xs font-semibold text-accent">Studio Access</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-ink">
              {mode === "register" ? "注册创作者账号" : "登录"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              {mode === "register"
                ? "使用邮箱创建账号，注册成功后会自动进入工作台。"
                : "使用演示账号登录，或注册一个新的创作者账号。"}
            </p>
          </div>

          <form onSubmit={submitAuth} className="studio-panel space-y-4 p-5 sm:p-6">
            {mode === "register" ? (
              <label className="block">
                <span className="text-sm font-semibold text-ink">昵称</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="studio-input mt-2 h-11 w-full px-3 text-sm"
                />
              </label>
            ) : null}
            <label className="block">
              <span className="text-sm font-semibold text-ink">邮箱</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="studio-input mt-2 h-11 w-full px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="studio-input mt-2 h-11 w-full px-3 text-sm"
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              className="studio-button h-11 w-full bg-accent px-4 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar"
            >
              {mode === "register" ? "创建账号" : "登录"}
            </button>
            {mode === "register" ? (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="studio-button h-10 w-full border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent"
              >
                返回登录
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="studio-button h-10 w-full border border-line bg-panel px-4 text-sm font-semibold text-ink hover:border-accent"
              >
                注册账号
              </button>
            )}
          </form>

          <div className="mt-6 rounded-lg border border-line bg-panel-muted p-5">
            <p className="text-sm font-semibold text-ink">演示账号</p>
            <p className="mt-2 text-sm text-muted">邮箱：creator@example.com</p>
            <p className="mt-1 text-sm text-muted">密码：Demo123456</p>
            <p className="mt-1 text-sm text-muted">模拟手机号：13800000000</p>
          </div>
        </div>
      </section>
    </main>
  );
}
