# 飞书文档草稿：技术方案与架构设计

## 1. 项目概述

本项目是面向短图文创作者的 AI 辅助生产与分发平台，覆盖登录注册、素材管理、Prompt 管理、AI 生成、草稿保存、内容审核、质量评分、发布管理、内容消费和榜单分发。系统目标不是单点调用大模型，而是构建“创作 - 审核 - 发布 - 反馈 - 排序”的完整闭环。

## 2. 技术选型

- 前端框架：Next.js App Router + React 18 + TypeScript。
- 样式体系：Tailwind CSS，统一使用工作台式侧栏、卡片、状态徽章和内容面板。
- 后端能力：Next.js Route Handlers 承载 API。
- 数据存储：Prisma + SQLite 本地开发；线上建议切换 PostgreSQL。
- AI 接入：OpenAI SDK 兼容模式，支持火山方舟 Ark/OpenAI-compatible API；未配置时使用 deterministic mock fallback。
- 测试体系：Vitest 覆盖 API、服务和组件；Playwright 覆盖端到端流程与 LCP 性能。

## 3. 系统分层

- `src/app`：页面和 API route。
- `src/components`：通用 UI，例如 AppShell、素材选择、Prompt 管理、审核面板、榜单列表、反馈面板。
- `src/features`：领域服务，包括 auth、AI、materials、prompts、drafts、moderation、quality、posts、ranking、evaluation。
- `src/lib`：数据库、鉴权、HTTP 响应工具。
- `prisma`：数据模型和种子数据。
- `tests`：单元测试、API 测试、E2E 测试和性能测试。

## 4. 核心数据模型

- `User`：用户、角色、登录身份。
- `PhoneCode`：手机号/邮箱验证码。
- `Material`：素材名称、类型、地址、合规状态、风险说明、引用次数。
- `PromptTemplate`：Prompt 模板、变量、启用状态。
- `Draft`：草稿、云端保存状态、冲突恢复状态。
- `Post`：发布内容主体。
- `PostMaterial`：发布内容与素材的多图关联。
- `ModerationResult`：审核风险、命中规则、处理建议、审核来源。
- `QualityScore`：原创性、结构、信息密度、清晰度、互动潜力、平台适配和总分。
- `RankingMetric`：阅读、点赞、收藏、热度、新鲜度、反馈分、风险惩罚。
- `PostComment`：读者评论，参与反馈排序。
- `AuditRule`：安全审核规则库。
- `EvaluationCase`：审核准确率评估用例。

## 5. 核心流程

1. 用户登录后进入首页工作台。
2. 在素材库上传或选择素材，系统进行基础合规校验。
3. 在创作台选择 Prompt、素材、选题、目标受众、平台和风格。
4. 点击 AI 生成，系统调用 Ark/OpenAI-compatible provider；失败时使用本地兜底生成。
5. 编辑器每 30 秒自动保存草稿，断网时写入本地缓存，恢复网络后同步。
6. 发布前自动执行内容审核和质量评分。
7. 中高风险内容被拦截，用户可一键合规改写。
8. 审核通过后发布，内容进入详情页和榜单。
9. 读者打开详情页产生真实阅读数，点赞和评论更新反馈分。
10. 热点榜按真实阅读数排序，新发布按发布时间排序，推荐榜按综合公式排序。

## 6. AI 与审核设计

AI 生成与 AI 审核采用可替换 provider。真实配置存在时调用 Ark/OpenAI-compatible API；缺失或失败时系统保持可演示状态。审核采用本地规则和 AI 复核双轨机制：

- 本地规则覆盖涉黄、涉赌、涉毒、敏感信息、导流和低俗内容。
- AI 复核返回风险等级、风险类型、原因和建议动作。
- 系统取更高风险等级作为最终审核结果。
- 发布 API 校验 review token，确保内容必须先审核且审核后未被篡改。

## 7. 分发与排序设计

推荐公式：

```text
score = quality * 0.45 + heat * 0.30 + freshness * 0.15 + feedback * 0.10 - riskPenalty
```

- `quality`：内容质量分。
- `heat`：阅读、点赞、收藏等热度信号。
- `freshness`：发布时间时效。
- `feedback`：点赞、评论和阅读形成的真实反馈分。
- `riskPenalty`：审核风险扣分。

热点榜优先按真实阅读次数排序；新发布按发布时间倒序；推荐榜展示各因子的贡献，便于解释排序原因。

## 8. 性能设计

- 榜单首屏服务端渲染首批数据。
- 滚动加载使用 cursor pagination，避免一次性加载所有内容。
- 详情页图片使用稳定尺寸，减少布局偏移。
- Playwright 性能测试强制 `/rankings` 和内容详情页 LCP 不超过 2.5 秒。

## 9. 部署设计

本地使用 SQLite 便于演示。线上建议：

- Vercel 部署 Next.js。
- PostgreSQL 承载 Prisma 数据。
- 对象存储保存上传图片。
- Ark/API key、短信/邮件配置写入部署平台环境变量。
- 部署包含 `PostComment` 表的版本后执行 Prisma 数据库同步。

## 10. 后续扩展

- 当前已接入抖音图文沙盒分发适配层，后续在具备开放平台资质后替换为真实抖音/头条 Open API live adapter。
- 增加发布任务队列和失败重试。
- 接入 Redis 做验证码、草稿同步和榜单缓存。
- 增加 AI 调用、审核命中、发布失败的监控日志。
