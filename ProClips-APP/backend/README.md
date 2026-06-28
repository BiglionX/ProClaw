# ProClips Backend

> ProClips 独立部署后端服务 — 为 [ProClips Mobile](../apps/proclips-mobile) 提供 AI 视频营销 Skill API。

## 0. 定位

本服务是 **ProClips 子项目的独立后端**，与 [ProClaw 主后端](../../apps) 共享：
- ✅ 共享 OpenAPI 规范（[api-spec/proclips-skill-openapi.yml](../api-spec/proclips-skill-openapi.yml)）
- ✅ 共享需求文档（[PROCLIPS-BACKEND-REQUIREMENTS.md](../PROCLIPS-BACKEND-REQUIREMENTS.md)）
- ❌ **不**共享数据库 / 鉴权 / 部署 / 端口

部署端口默认 `4000`，数据库独立 `proclips.db.sqlite`，鉴权使用独立 JWT 密钥。

---

## 1. 技术栈

| 类别 | 选型 | 理由 |
| ---- | ---- | ---- |
| 运行时 | Node.js ≥ 20 LTS | 与移动端 React Native 0.85 / Hermes 引擎对齐 |
| 语言 | TypeScript 5.6（ESM 模式） | 严格类型 + 顶层 await |
| Web 框架 | Fastify 4.x | 性能 / 生态 / 插件体系成熟 |
| 数据库 | better-sqlite3 (WAL 模式) | 零运维，单文件，适合 V1 阶段中小规模并发 |
| 校验 | Zod 3.x | 单一事实源，与 TS 类型双向推导 |
| 鉴权 | jsonwebtoken (HS256) | 轻量，对接 ProClaw 现有账号中心 |
| 文件上传 | @fastify/multipart | 100MB / 5 文件限制 |
| 静态服务 | @fastify/static | 提供 `/static/uploads/` 与 `/static/results/` |
| 限流 | @fastify/rate-limit | 按 token / IP 限流 |
| 日志 | pino + pino-pretty | 高性能结构化日志 |
| 测试 | vitest + supertest-like fetch | 集成测试 + 11 个核心 API 链路 |

---

## 2. 目录结构

```
backend/
├── src/
│   ├── app.ts              # Fastify 应用构建（插件 / 路由 / 钩子）
│   ├── index.ts            # 启动入口（DB 初始化 → Worker → listen）
│   ├── config.ts           # Zod 校验环境变量
│   ├── logger.ts           # pino 实例
│   ├── db/
│   │   ├── connection.ts   # better-sqlite3 单例 + WAL
│   │   ├── schema.sql      # 5 张 video_* 表 + jwt_issuers
│   │   └── seed.sql        # 6 模板 + 2 issuer + 1 demo merchant
│   ├── middleware/
│   │   ├── auth.ts         # requireAuth / requireMerchant
│   │   └── error.ts        # Zod / 业务错误统一格式
│   ├── routes/             # 14 个 API 端点
│   │   ├── health.ts       # GET /health, GET /dev/token
│   │   ├── templates.ts    # 模板列表 / 选模板
│   │   ├── upload.ts       # 上传 URL / 上传分片 / 确认
│   │   ├── script.ts       # 生成脚本
│   │   ├── mix.ts          # 提交混剪 / 查询状态
│   │   ├── videos.ts       # 商家视频库 / 公开开关 / 下载 / 分享
│   │   ├── voice.ts        # 录制声音样本
│   │   └── profile.ts      # 商家资料 / 统计
│   ├── services/
│   │   ├── scriptGenerator.ts  # LLM 文案生成（mock：3 个候选脚本）
│   │   ├── mixWorker.ts        # 混剪任务 Worker（mock：定时写占位 mp4）
│   │   ├── uploadService.ts    # 文件存储 / MIME 校验
│   │   └── shareService.ts     # 分享信息组装
│   ├── types/index.ts      # 共享类型定义
│   └── utils/
│       ├── id.ts           # ID / UUID 生成
│       ├── jwt.ts          # 签发 / 校验 / 开发 token
│       └── response.ts     # ok() / fail() 统一响应包装
├── test/
│   └── integration.test.ts # 11 个集成测试
├── scripts/
│   ├── smoke_test.mjs      # 启动后对运行中服务做 API 烟雾测试
│   ├── db_reset.mjs        # 清空 DB + 文件目录 + 自动重建
│   └── db_init.ts          # 仅用于 db_reset
├── data/                   # 运行时生成（DB、上传、结果），gitignore
├── Dockerfile              # 多阶段 Node 20 alpine
├── docker-compose.yml      # 含 healthcheck
├── .env.example
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md               # 本文件
```

---

## 3. 快速开始

### 3.1 本地开发

```bash
cd backend
cp .env.example .env
vim .env                     # ★ 必填 JWT_SECRET（≥16 字符），其他可先用默认值
npm install
npm run dev               # 启动 tsx watch 监听 :4000
# 另开终端
npm run smoke             # 烟雾测试
```

> ⚠️ **跳过 `vim .env` 是烟测 99% 失败的根因**：`config.ts` 启动即 zod 校验，缺 `JWT_SECRET` 会直接 `process.exit(1)`。
> 不方便手动改时可用临时值：`JWT_SECRET=dev-local-secret-at-least-16-bytes npm run dev`

### 3.2 Docker 部署

```bash
cd backend
cp .env.example .env
docker compose up -d --build
docker compose logs -f proclips-backend
docker compose exec proclips-backend npm run smoke
```

### 3.3 清理重置

```bash
npm run db:reset          # 删除 DB + uploads + results 然后重建
```

---

## 4. 环境变量

完整列表见 [.env.example](./.env.example)。关键项：

| 变量 | 默认 | 说明 |
| ---- | ---- | ---- |
| `PORT` | `4000` | HTTP 监听端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `JWT_SECRET` | — | **生产必填**，≥ 16 字符 |
| `CORS_ORIGINS` | `*` | 逗号分隔；生产建议白名单 |
| `RATE_LIMIT_PER_MINUTE` | `60` | 每 token/IP 每分钟最大请求数 |
| `DB_PATH` | `./data/db.sqlite` | SQLite 文件位置 |
| `UPLOAD_DIR` | `./data/uploads` | 原片存储根 |
| `RESULT_DIR` | `./data/results` | 成片存储根 |
| `MIX_TASK_MOCK_DURATION_SEC` | `3` | 混剪 mock 任务时长（仅 dev/test） |
| `LOG_LEVEL` | `info` | pino 日志级别 |

---

## 5. 数据库

5 张 `video_*` 业务表（`schema.sql`）：

| 表 | 作用 |
| --- | --- |
| `video_templates` | 视频模板（标题、分镜 JSON、行业、徽章、封面色） |
| `video_raw_clips` | 商家上传的原始素材，按 merchant_id 隔离 |
| `video_mix_tasks` | 混剪任务（状态：pending / processing / completed / failed） |
| `video_final_products` | 成片元数据（公开性、播放量、激励 JSON） |
| `video_merchant_profiles` | 商家资料（昵称、声音样本 URI） |
| `video_jwt_issuers` | JWT 受信任 issuer 白名单 |

**自动初始化**：`index.ts` 启动时调用 `initDb()`，会：
1. 加载 `schema.sql`（幂等 CREATE IF NOT EXISTS）
2. 加载 `seed.sql`（幂等 INSERT OR IGNORE）
3. 启用 WAL 模式

---

## 6. API 列表

完整规范：[api-spec/proclips-skill-openapi.yml](../api-spec/proclips-skill-openapi.yml)

| Method | Path | 鉴权 | 说明 |
| ------ | ---- | ---- | ---- |
| GET    | `/health` | ✗ | 健康检查 |
| GET    | `/dev/token` | ✗（仅非生产） | 颁发开发 token |
| GET    | `/api/proclips/templates` | ✓ | 模板列表（可选 `industry` 过滤） |
| POST   | `/api/proclips/select-template` | ✓ | 选择模板 |
| POST   | `/api/proclips/generate-upload-url` | ✓ | 申请分片上传 URL |
| POST   | `/api/proclips/upload-scene` | ✓ | multipart 直传分镜素材 |
| POST   | `/api/proclips/confirm-scene-upload` | ✓ | 确认上传完成 |
| POST   | `/api/proclips/generate-script` | ✓ | LLM 生成候选脚本（3 个） |
| POST   | `/api/proclips/mix/submit` | ✓ | 提交混剪任务 |
| GET    | `/api/proclips/mix/status/:taskId` | ✓ | 轮询任务状态（带 merchant_id 校验） |
| GET    | `/api/proclips/merchant-videos` | ✓ | 商家视频库 |
| POST   | `/api/proclips/set-video-public` | ✓ | 切换成片公开性 |
| GET    | `/api/proclips/video-download/:videoId` | ✓ | 重定向到成片直链 |
| GET    | `/api/proclips/share-info/:videoId` | ✓ | 分享卡片信息 |
| POST   | `/api/proclips/record-voice` | ✓ | 上传声音样本 |
| POST   | `/api/proclips/merchant-profile` | ✓ | 更新商家资料 |
| GET    | `/api/proclips/merchant-profile` | ✓ | 读取商家资料 |
| GET    | `/api/proclips/merchant-stats` | ✓ | 商家统计 |

> 注：原文 [api-spec](../api-spec/proclips-skill-openapi.yml) 中部分端点（`/generate-upload-url` / `/confirm-scene-upload`）已在 `routes/upload.ts` 中通过直传（`/upload-scene`）合并实现以简化 V1 流程，业务字段一致。

### 6.1 响应格式

所有接口统一返回 `ApiResponse<T>`：

```json
{ "ok": true,  "data": { /* 业务数据 */ } }
{ "ok": false, "error": { "code": "FORBIDDEN_CLIPS", "message": "..." } }
```

### 6.2 鉴权

```
Authorization: Bearer <jwt>
```

JWT payload 必含 `sub`（merchant_id）与 `role`（`merchant` / `creator`）。`requireMerchant` 中间件会校验 `sub` 在数据库的 `video_merchant_profiles` 中存在。

### 6.3 错误码

| code | 含义 |
| ---- | ---- |
| `INVALID_INPUT` | Zod 校验失败 |
| `UNAUTHORIZED` | 缺失 / 无效 token |
| `FORBIDDEN` | token 有效但权限不足 |
| `FORBIDDEN_CLIPS` | 素材不属于当前商家 |
| `TEMPLATE_NOT_FOUND` | 模板 ID 不存在 |
| `TASK_NOT_FOUND` | 混剪任务不存在 |
| `FILE_TOO_LARGE` | 超过 100MB |
| `MIME_NOT_ALLOWED` | 非允许的视频/音频格式 |
| `INTERNAL` | 未捕获异常 |

---

## 7. 混剪任务流水线

```
客户端                  后端                       Worker
  │  POST /mix/submit    │                            │
  │ ───────────────────► │  INSERT task(pending)      │
  │                      │ ─────────────────────────► │
  │  200 { taskId }      │  Worker 2s tick：          │
  │ ◄─────────────────── │  - 抢 pending              │
  │                      │  - progress 0.05 → 1.0     │
  │                      │  - status: processing      │
  │  GET /mix/status/:id │                            │
  │ ───────────────────► │  SELECT progress/status    │
  │ ◄─────────────────── │                            │
  │  ...轮询...          │  - 调用 ffmpeg 混剪（V2）   │
  │                      │  - INSERT video_final_products
  │                      │  - status: completed       │
  │  GET /mix/status     │  返回 result.videoUrl      │
  │ ◄─────────────────── │                            │
```

V1 mock：`writeMockMp4` 写入一个带 16 字节头部的占位 `.mp4` 文件，进度按 `(now - created_at) / MIX_TASK_MOCK_DURATION_SEC` 线性增长，便于客户端联调。

---

## 8. 安全

- JWT HS256，生产环境强制 `JWT_SECRET` ≥ 16 字符
- 所有 SQL 强制带 `merchant_id` 过滤，杜绝越权访问他人素材/任务
- `FORBIDDEN_CLIPS`：提交混剪前校验所有 fileKey 都属于当前 token 的 sub
- CORS 白名单（生产建议显式列出域名）
- Rate-limit：默认 60 req/min per token，限流键 `Authorization` > `IP`
- Multipart：单文件 100MB，最多 5 个文件
- 文件类型白名单：仅允许 mp4 / mov / webm / jpg / png / m4a / wav
- 路径解析：所有静态资源挂在 `/static/uploads/` 与 `/static/results/`，避免目录穿越

---

## 9. 测试

```bash
npm run typecheck        # tsc --noEmit，0 错误
npm test                 # vitest run，11 个集成测试
```

`test/integration.test.ts` 覆盖：

1. `/health` 返回服务信息
2. 无 token 请求受保护接口 → 401
3. 带 token 请求模板 → 200，items.length > 0
4. 行业过滤
5. 选模板 + 生成脚本
6. **完整链路**：upload → submit → status polling → completed
7. 商家视频库
8. 商家统计
9. **跨商家隔离**：用 A 的 token 查 B 的 taskId → 403
10. JWT 过期 / 篡改 → 401
11. Schema 与 seed 幂等加载

---

## 10. 部署清单

| 资源 | 推荐 |
| ---- | ---- |
| CPU  | 1 核（V1 mock） / 4 核（V2 接入 ffmpeg） |
| 内存 | 512MB（V1） / 2GB（V2） |
| 存储 | 10GB（取决于视频量，建议外挂对象存储） |
| Node | ≥ 20 LTS |
| 端口 | 4000 |
| 域名 | `api-proclips.example.com` |
| HTTPS | 强烈推荐（Let's Encrypt / Nginx 反代） |

V2 路线：
- 替换 `writeMockMp4` 为真实 ffmpeg pipeline
- SQLite → PostgreSQL（user 增长 > 1k）
- 本地文件 → S3 / 阿里云 OSS
- 集成云厂商 LLM（替代 mock scriptGenerator）
- Prometheus 指标 + Grafana 看板
