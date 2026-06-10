# 最终上传清单

## 必交材料

| 材料 | 当前准备状态 | 文件 / 链接 |
| --- | --- | --- |
| 在线体验地址 | 已部署 | https://bytedance-theta.vercel.app |
| GitHub 仓库 | 已推送 master | https://github.com/Wayne-lys/Bytedance |
| 作业提交文档 | 已预填 | `docs/submission-document.md` |
| 技术方案与架构设计 | 已准备 | `docs/feishu-technical-solution.md`、`docs/architecture.md` |
| 评估与优化报告 | 已准备 | `docs/feishu-evaluation-summary.md`、`docs/evaluation-report.md` |
| 审核规则与质量体系 | 已准备 | `docs/feishu-safety-quality-system.md`、`docs/safety-and-quality.md` |
| 代码压缩包 | 本地生成 | `deliverables/toutiao-ai-creator-platform-source.zip` |
| README 启动说明 | 已准备 | `README.md` |

## 建议补充材料

| 材料 | 说明 |
| --- | --- |
| 演示视频 | 建议 3-5 分钟，脚本见 `docs/demo-video-script.md`；如平台不强制，可不上传 |
| 页面截图 | 建议截：首页、登录页、创作台、素材库、审核页、内容管理、榜单页、详情页 |
| QR 码 | 只有提交入口要求扫码体验时再生成，内容指向线上地址 |

## 提交文档可直接填写的信息

- 项目名称：AI 创作者辅助生产与分发平台
- 作者：李彦松（提交前可按实际姓名修改）
- 在线访问地址：https://bytedance-theta.vercel.app
- GitHub 仓库：https://github.com/Wayne-lys/Bytedance
- 管理员账号：`admin@example.com` / `Demo123456`
- 创作者账号：`creator@example.com` / `Demo123456`
- 模拟手机号：`13800000000`
- 技术栈：Next.js、React、TypeScript、Tailwind CSS、Prisma、PostgreSQL/SQLite、OpenAI-compatible Ark provider、Vitest、Playwright

## 不要上传 / 不要截图

- 不要上传 `.env`、`.env.local`、Vercel 环境变量截图。
- 不要上传 Ark API key、EP 密钥文档截图、Neon `DATABASE_URL`。
- 不要把 `node_modules`、`.next`、本地数据库、运行日志作为代码附件上传。
- 如果之前截图露出过 key 或数据库连接串，提交前建议旋转 Neon 数据库密码，并更换 Ark key。

## 提交前快速验证

```bash
npm run test
npm run build
```

当前最近一次本地验证：

- `npm run test`：137 个测试通过。
- `npm run build`：通过，只有既有 `<img>` 优化警告。

## 线上验收路径

1. 打开 https://bytedance-theta.vercel.app
2. 使用管理员账号登录。
3. 进入创作台，选择 Prompt，填写选题和受众。
4. 点击 AI 生成，查看生成来源和生成结果。
5. 点击发布内容，确认先审核再发布。
6. 进入内容详情页，测试阅读、点赞、评论。
7. 打开热点榜单，确认热点按阅读次数排序、推荐榜有解释。
8. 在内容详情页测试“同步到抖音图文”模拟分发。
