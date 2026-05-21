const authModes = [
  {
    title: "邮箱密码",
    description: "适合正式账号体系，密码会以哈希形式保存。"
  },
  {
    title: "手机验证码",
    description: "训练营演示模式下验证码会直接返回，模拟短信登录。"
  }
];

export default function LoginPage() {
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
          <div className="grid gap-3 sm:grid-cols-2">
            {authModes.map((mode) => (
              <div key={mode.title} className="rounded-lg border border-line p-4">
                <h2 className="text-lg font-semibold text-ink">{mode.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{mode.description}</p>
              </div>
            ))}
          </div>

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
