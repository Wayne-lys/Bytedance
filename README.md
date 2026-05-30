# AI 创作者辅助生产与分发平台

面向“头条 AI 前端训练营”的全栈 MVP，覆盖短图文创作者从登录、素材管理、AI 生成、草稿保存、内容审核、发布、榜单分发到效果评估的完整闭环。

## 功能覆盖

| PDF 要求 | 当前实现 |
| --- | --- |
| 手机号或邮箱注册登录 | 邮箱密码登录/注册 API，模拟手机验证码 API，登录页演示账号 |
| Prompt 管理 | Prompt 模板服务、API、创作台模板展示 |
| 多媒体素材管理 | 素材库、素材合规校验、素材 API |
| AI 生成图文内容 | OpenAI/火山方舟兼容 provider + mock fallback，创作台一键生成 |
| 自动保存和断网同步 | localStorage 缓存、30 秒自动保存、在线恢复同步 |
| 内容安全审核 | 本地规则审核、风险等级、改写 API |
| 内容质量评分 | 原创性、结构、信息密度、清晰度、互动潜力、平台适配 |
| 一键发布和二次编辑 | 发布 API、内容管理、详情页、重新审核更新 |
| 热点/爆文/推荐榜单 | 智能排序公式、cursor 分页、滚动加载 |
| 内容详情页 | 发布者、发布时间、封面、正文、标签、阅读数、质量摘要 |
| 性能优化 | Playwright LCP 检测，当前 `/rankings` 792ms、详情页 1704ms |

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

- 邮箱：`creator@example.com`
- 密码：`Demo123456`
- 模拟手机号：`13800000000`

## 环境变量

复制 `.env.example` 到 `.env`。

```env
DATABASE_URL="file:./dev.db"
AI_BASE_URL=""
AI_API_KEY=""
AI_MODEL=""
SESSION_SECRET="replace-with-a-long-random-secret"
APP_URL="http://localhost:3000"
```

AI 配置为空时自动使用 mock provider。若接入火山方舟或 OpenAI 兼容接口，填写 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`。

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
