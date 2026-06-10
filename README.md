# AI 创作者辅助生产与分发平台

面向“头条 AI 前端训练营”的全栈 MVP，覆盖短图文创作者从登录、素材管理、AI 生成、草稿保存、内容审核、发布到榜单分发的完整闭环。

## 功能覆盖

| PDF 要求 | 当前实现 |
| --- | --- |
| 手机号或邮箱注册登录 | 邮箱验证码注册、邮箱密码登录、手机号验证码登录/自动注册、安全退出；可接火山短信和 SMTP 邮件 |
| Prompt 管理 | Prompt 模板服务、API、创作台模板选择与新增 |
| 多媒体素材管理 | 素材库、素材合规校验、素材 API |
| AI 生成图文内容 | OpenAI/火山方舟兼容 provider + mock fallback，创作台一键生成 |
| 自动保存和断网同步 | localStorage 缓存、30 秒自动保存、在线恢复同步 |
| 内容安全审核 | 本地规则审核、风险等级、改写 API、内容下线/撤回/回滚 |
| 内容质量评分 | 原创性、结构、信息密度、清晰度、互动潜力、平台适配 |
| 一键发布和二次编辑 | 发布 API、内容管理、详情页、重新审核更新 |
| 热点/新发布/推荐榜单 | 热点按真实阅读数排序，新发布按发布时间排序，推荐综合质量、热度、新鲜度、反馈和风险 |
| 内容详情页 | 发布者、发布时间、封面、正文、标签、阅读数、点赞评论、质量摘要 |
| 性能优化 | Playwright LCP 检测，目标 `/rankings` 和详情页均不超过 2.5s |

## 快速开始

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

打开 `http://localhost:3000`。

演示账号：

- 普通创作者：`creator@example.com` / `Demo123456`
- 管理员：`admin@example.com` / `Demo123456`
- 模拟手机号：`13800000000`
- 本地未配置火山短信/邮件时，登录页点击“获取验证码”会显示调试验证码；配置后会真实发送，不再返回验证码给前端。

## 环境变量

复制 `.env.example` 到 `.env`。

```env
DATABASE_URL="file:./dev.db"
AI_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"
AI_API_KEY="<your-api-key>"
AI_MODEL="<your-endpoint-id-or-model-id>"
AI_USER="<your-challenge-email>"
SESSION_SECRET="replace-with-a-long-random-secret"
VERIFICATION_CODE_SECRET="replace-with-a-different-long-random-secret"
REVIEW_TOKEN_SECRET="replace-with-a-review-token-secret"
APP_URL="http://localhost:3000"
```

AI 配置为空时自动使用 mock provider。若接入火山方舟官方资源池，可把挑战下发的 EP/模型标识填入 `AI_MODEL`，把 key 填入 `AI_API_KEY`，把参赛邮箱填入 `AI_USER`。也兼容 `ARK_API_KEY`、`ARK_MODEL`、`ARK_ENDPOINT_ID`、`ARK_BASE_URL`、`ARK_USER` 变量；真实 EP 和 API key 只允许写入本机 `.env` 或部署平台环境变量，不能提交到代码仓库或文档。

验证码发送：

- 火山短信：配置 `VOLC_ACCESSKEY`、`VOLC_SECRETKEY`、`VOLC_SMS_ACCOUNT`、`VOLC_SMS_SIGN`、`VOLC_SMS_TEMPLATE_ID` 后，手机号登录使用火山 `SendSmsVerifyCode` / `CheckSmsVerifyCode`。
- 火山邮件/SMTP：配置 `VOLC_EMAIL_SMTP_HOST`、`VOLC_EMAIL_SMTP_USER`、`VOLC_EMAIL_SMTP_PASS`、`VOLC_EMAIL_FROM` 后，邮箱注册验证码通过 SMTP 发送。
- 未配置时使用本地 mock，非生产环境会返回调试验证码，生产环境不会返回验证码。

## 常用脚本

```bash
npm run dev
npm run build
npm run start
npm run test
npm run test:e2e
npm run db:generate
npm run db:push
npm run db:seed
```

Playwright 使用 `http://127.0.0.1:3100`，避免和本地开发端口冲突。

## 存储说明

本地 MVP 使用 SQLite 和预置 demo 素材。线上部署建议迁移到 PostgreSQL，并接入对象存储；如果对象存储暂不可用，系统仍可使用 `public/demo-materials` 里的预置素材完成演示。

## 文档

- [Architecture](docs/architecture.md)
- [Safety and Quality](docs/safety-and-quality.md)
- [Evaluation Report](docs/evaluation-report.md)
- [Deployment](docs/deployment.md)
- [Assignment Submission Document](docs/submission-document.md)
- [Delivery Checklist](docs/delivery-checklist.md)
- [Submission Upload Checklist](docs/submission-upload-checklist.md)
- [Demo Video Script](docs/demo-video-script.md)
- [Feishu Technical Solution Draft](docs/feishu-technical-solution.md)
- [Feishu Evaluation Summary Draft](docs/feishu-evaluation-summary.md)
- [Feishu Safety Quality System Draft](docs/feishu-safety-quality-system.md)
