# ProClaw 多项目集成架构技术规范

**版本**: v1.0  
**创建日期**: 2026-07-04  
**状态**: 🟡 草案（架构决策已定，逐步落地中）  
**关联文档**:
- [PROCLAW-NVWAX-API-INTEGRATION-REQUIREMENT](prd/architecture/PROCLAW-NVWAX-API-INTEGRATION-REQUIREMENT.md)
- [ProClaw 插件系统 PRD v10.0](prd/plugins-supply-chain/需求文档ProClaw%20插件系统%20PRD——行业工作流插件（PRD%20v10.0）.md)
- [TECHNICAL_OVERVIEW](TECHNICAL_OVERVIEW.md)

---

## 1. 范围与适用项目

本规范约束以下三个项目的集成边界与协作方式：

| 项目 | 仓库路径 | 当前分支 | 核心职责 | 部署模式 |
|------|---------|---------|---------|---------|
| **ProClaw** | `D:\BigLionX\ProClaw` | `develop` | 桌面端 / 移动端 / 云在线版 — 进销存 + AI Team 运行时 | Tauri 桌面包 + Expo 移动包 + Web 部署 |
| **NvwaX** | `D:\BigLionX\NvwaX` | `main` | Agent 市场、AI Team 编排、云备份、计费中继、统一认证引擎 | Docker 容器化，云端 7×24 |
| **skillhub** | `D:\BigLionX\skillhub` | `master` | 技能/提示词/知识片段仓库，向量检索 | Vercel Serverless |

> **核心原则**: 三个项目保持独立仓库、独立部署、独立发布节奏。通过标准化 API 协议协作，**不合并代码**。

---

## 2. 架构决策

### 2.1 决策结论

| 方案 | 描述 | 结论 |
|------|------|------|
| A | 合并核心代码到 ProClaw 单仓库 | ❌ **不采用** |
| B | 独立微服务 + API 流式协作 | ✅ **采用（当前方向，持续深化）** |

### 2.2 决策依据

**方案 A 被否决的核心理由**：

1. **部署拓扑本质不同** — 桌面二进制 vs Docker 容器 vs Vercel Serverless，代码合并无法减少部署复杂度
2. **运行时隔离要求** — NvwaX 持有用户数据库和 API Key，与桌面端本地 SQLite 必须网络隔离
3. **平台独立性** — skillhub / NvwaX 设计为面向多租户的独立平台，未来可服务 ProClaw 以外的第三方客户端
4. **发布节奏解耦** — 三个项目有不同的迭代周期和 hotfix 优先级，强制同步会降低整体交付速度

**方案 B 的可行性验证**：

当前 ProClaw 中已落地的 NvwaX 集成层证明松耦合架构足以支撑深度协作：

| 集成层 | 文件 | 规模 | 状态 |
|--------|------|------|------|
| HTTP 客户端 | `src-tauri/src/services/nvwax_client.rs` | 1226 行 | ✅ 生产 |
| Tauri 命令桥接 | `src-tauri/src/services/nvwax_commands.rs` | 729 行，30+ 命令 | ✅ 生产 |
| 计费拦截 | `src-tauri/src/services/nvwax_billing.rs` | — | ✅ 生产 |
| 云备份加密同步 | `src-tauri/src/services/cloud_backup_service.rs` | — | ✅ 生产 |
| 前端市场组件 | `src/components/NvwaX/MarketplaceDialog.tsx` | 768 行 | ✅ 生产 |
| 离线回退 | `src/lib/localTeamSkillMap.ts` | — | ✅ 生产 |

---

## 3. 域名与部署拓扑

### 3.1 域名规划

```
proclaw.cc                        ← 主品牌官网 / 营销页
├── app.proclaw.cc                ← 云在线版 (Web 端)
├── account.proclaw.cc            ← 🔑 统一账号中心 (OIDC IdP，新增)
├── skillhub.proclaw.cc           ← 技能仓库 (现有)
└── nvwax.proclaw.cc             ← NvwaX 平台 (现有，Agent 市场/管理后台)
```

**关键设计**：
- 所有用户可感知的服务均在 `proclaw.cc` 域名下，**NvwaX 对终端用户不可见**
- `account.proclaw.cc` 是新增的统一认证入口，由 NvwaX auth 模块支撑
- `nvwax.proclaw.cc` 仅对开发者/管理员可见

### 3.2 部署拓扑

```
┌──────────────────────────────────────────────────────┐
│                    ProClaw 生态                        │
│                                                      │
│  用户触点 (用户可见)           引擎层 (用户不可见)      │
│  ─────────────────────       ────────────────────     │
│                                                      │
│  ┌──────────────────┐       ┌──────────────────┐     │
│  │ ProClaw 桌面 App  │       │ Tauri Rust 后端   │     │
│  │ (Windows/macOS)  │──────→│ + 本地 SQLite    │     │
│  └──────────────────┘       └────────┬─────────┘     │
│                                      │ HTTP API      │
│  ┌──────────────────┐                │               │
│  │ ProClaw 手机 App  │                │               │
│  │ (iOS/Android)    │────────────────┘               │
│  └──────────────────┘                                │
│                                                      │
│  ┌──────────────────┐       ┌──────────────────┐     │
│  │ app.proclaw.cc   │       │ Axum HTTP Server │     │
│  │ (云在线版)        │──────→│ (端口 8888)      │     │
│  └──────────────────┘       └────────┬─────────┘     │
│                                      │               │
│  ┌──────────────────┐                │               │
│  │ account.proclaw   │                │               │
│  │ .cc (统一登录)     │                │               │
│  └────────┬─────────┘                │               │
│           │ OIDC                      │               │
│           ▼                           ▼               │
│  ┌──────────────────────────────────────────────┐     │
│  │           NvwaX 服务 (Docker 容器)             │     │
│  │                                              │     │
│  │  ┌────────────┐ ┌──────────┐ ┌───────────┐  │     │
│  │  │ auth 模块   │ │ Agent    │ │ 云备份     │  │     │
│  │  │ OIDC IdP   │ │ 市场     │ │ 中继服务   │  │     │
│  │  │ 用户 DB    │ │ SDK      │ │ 计费引擎   │  │     │
│  │  └────────────┘ └──────────┘ └───────────┘  │     │
│  │                                              │     │
│  │  数据库: PostgreSQL (用户 + 市场 + 消耗记录)   │     │
│  └──────────────────────────────────────────────┘     │
│                                                      │
│  ┌──────────────────────────────────────────────┐     │
│  │  skillhub (Vercel Serverless)                 │     │
│  │  ┌──────────┐ ┌────────┐ ┌───────────┐      │     │
│  │  │ Web App  │ │ CLI    │ │ API v2    │      │     │
│  │  │ 技能浏览  │ │ 工具链  │ │ 向量检索   │      │     │
│  │  └──────────┘ └────────┘ └───────────┘      │     │
│  │                                              │     │
│  │  数据库: Neon PostgreSQL (Prisma)            │     │
│  └──────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

---

## 4. 统一认证规范 (OIDC)

### 4.1 角色定义

| 角色 | 承担者 | 说明 |
|------|--------|------|
| **Identity Provider (IdP)** | NvwaX auth 模块，挂载于 `account.proclaw.cc` | 持有用户数据库，签发 ID Token |
| **Relying Party (RP)** | ProClaw 桌面端 / 移动端 / 云在线版、skillhub | 不存密码，通过 OIDC 验证身份 |

### 4.2 协议选型

采用 **OAuth 2.0 Authorization Code Grant + PKCE**，理由：

- Authorization Code 流程安全性高于 Implicit Grant
- PKCE 防止授权码拦截攻击（桌面端/移动端无 client_secret 的安全替代）
- OpenID Connect (OIDC) 层提供标准化的 `id_token`（JWT），包含用户身份信息

### 4.3 认证端点

| 端点 | URL | 说明 |
|------|-----|------|
| Authorization Endpoint | `https://account.proclaw.cc/authorize` | 用户登录页面 |
| Token Endpoint | `https://account.proclaw.cc/token` | 用 code 换取 token |
| UserInfo Endpoint | `https://account.proclaw.cc/userinfo` | 获取用户信息 |
| Logout Endpoint | `https://account.proclaw.cc/logout` | 统一登出 |

### 4.4 桌面端 OAuth 流程 (Loopback Redirect)

桌面应用无 `https://` 回调能力，采用本地临时 HTTP 服务器方案：

```
ProClaw 桌面端                     account.proclaw.cc
     │                                      │
     │ ① 启动本地 HTTP Server              │
     │    (127.0.0.1:随机端口)              │
     │                                      │
     │ ② 打开系统浏览器                     │
     │    GET /authorize?                   │
     │    response_type=code                │
     │    client_id=proclaw_desktop         │
     │    redirect_uri=http://127.0.0.1:   │
     │                  {port}/callback     │
     │    code_challenge={S256_hash}        │
     │    scope=openid profile email        │
     │─────────────────────────────────────→│
     │                                      │
     │ ③ 用户在浏览器中输入账号密码          │
     │←─────────────────────────────────────│
     │                                      │
     │ ④ 登录成功后 302 重定向              │
     │    http://127.0.0.1:{port}/callback   │
     │    ?code={authorization_code}        │
     │←─────────────────────────────────────│
     │                                      │
     │ ⑤ 收到 code，关闭本地 Server          │
     │                                      │
     │ ⑥ POST /token                        │
     │    code={authorization_code}         │
     │    code_verifier={原始 PKCE 值}       │
     │─────────────────────────────────────→│
     │                                      │
     │ ⑦ 返回 access_token + id_token       │
     │    id_token payload:                 │
     │    { sub, name, email, picture }     │
     │←─────────────────────────────────────│
     │                                      │
     │ ⑧ 存储 token，创建本地会话            │
```

**技术实现**：
- Tauri 插件 [tauri-plugin-oauth](https://github.com/tauri-apps/tauri-plugin-oauth) 已封装 Loopback Redirect 流程
- 移动端可复用同一机制（`127.0.0.1` 回环地址在 iOS/Android 上同样可用）

### 4.5 Web 端 OAuth 流程 (Standard Redirect)

skillhub 和 ProClaw 云在线版使用标准 Web 重定向：

```
skillhub.proclaw.cc              account.proclaw.cc
     │                                      │
     │ ① 检测未登录 → 302 重定向            │
     │    /authorize?...                     │
     │    redirect_uri=https://skillhub.    │
     │                  proclaw.cc/callback  │
     │─────────────────────────────────────→│
     │                                      │
     │ ② 用户登录（或已有 session 自动跳过）  │
     │                                      │
     │ ③ 302 重定向回                        │
     │    https://skillhub.proclaw.cc/      │
     │    callback?code=...                  │
     │←─────────────────────────────────────│
     │                                      │
     │ ④ 服务端 POST /token 换取 token       │
     │ ⑤ 设置 session cookie，domain=       │
     │    .proclaw.cc 实现子域名 SSO         │
```

### 4.6 Session 共享

| 配置项 | 值 | 说明 |
|--------|-----|------|
| Cookie Domain | `.proclaw.cc` | 子域名间共享登录态 |
| Token 存储 | HttpOnly Secure Cookie | 防 XSS |
| Session 有效期 | 7 天（可刷新） | 平衡安全与体验 |
| Refresh Token 轮换 | 每次使用后轮换 | 防重放攻击 |

### 4.7 白标要求

`account.proclaw.cc` 的登录/注册页面必须：
- **不出现** NvwaX 品牌标识
- 使用 ProClaw VI（Logo、配色、文案）
- URL 全程保持 `account.proclaw.cc`，不跳转到 `nvwax.proclaw.cc`
- 邮件通知以 "ProClaw 团队" 名义发送

---

## 5. API 集成规范

### 5.1 通信协议

```
ProClaw (Rust/JS) ──→ HTTPS ──→ NvwaX API (nvwax.proclaw.cc/api/v1)
                              ──→ skillhub API (skillhub.proclaw.cc/api/v2)
```

### 5.2 ProClaw → NvwaX 调用规范

**认证方式**：API Key（`Authorization: Bearer nvwx_...`）

**当前已实现的 NvwaX 命令（`nvwax_commands.rs`）**：

| 分组 | 命令 | 说明 |
|------|------|------|
| **Marketplace** | `nvwax_search_agents` | 搜索 Agent 市场 |
| | `nvwax_get_categories` | 获取分类列表 |
| | `nvwax_get_agent_detail` | Agent 详情 |
| **Agent CRUD** | `nvwax_create_agent` | 创建 Agent |
| | `nvwax_get_agents` | Agent 列表 |
| | `nvwax_get_my_agent_detail` | 自己的 Agent 详情 |
| | `nvwax_update_agent` | 更新 Agent |
| | `nvwax_delete_agent` | 删除 Agent |
| | `nvwax_publish_agent` / `nvwax_unpublish_agent` | 发布/取消发布 |
| **AiTeam CRUD** | `nvwax_create_aiteam` / `nvwax_get_aiteams` | AiTeam 增查 |
| | `nvwax_get_aiteam_detail` / `nvwax_update_aiteam` | AiTeam 详改 |
| | `nvwax_delete_aiteam` / `nvwax_publish_aiteam` / `nvwax_unpublish_aiteam` | AiTeam 删/发布 |
| **Search** | `nvwax_search_skills` | 搜索 SkillHub 技能 |
| | `nvwax_unified_search` | 统一搜索（Agent+Skills） |
| **Export** | `nvwax_export_agent` / `nvwax_export_aiteam` | 导出 |
| | `nvwax_batch_export` / `nvwax_get_export_history` | 批量导出 |
| **Billing** | `nvwax_get_usage_stats` | 消耗统计 |
| | `nvwax_get_token_balance` | Token 余额 |
| | `nvwax_record_consumption` | 记录消耗 |
| | `nvwax_sync_usage` | 对账同步 |
| **Config** | `save_nvwax_api_key` / `clear_nvwax_api_key` | API Key 管理 |
| | `test_nvwax_connection` | 连接测试 |

**必须遵守的调用规范**：

1. **计费前置检查** — 每条 Tauri 命令在执行 API 调用前必须通过 `NvwaXBilling::require_balance` 校验
2. **消耗记录** — API 调用成功后必须通过 `NvwaXBilling::record_consumption` 记录 Token 消耗
3. **统一响应格式** — 所有命令返回 `NvwaXCmdResponse<T>` 包装
4. **API Key 加密存储** — 使用 AES-256-GCM 加密后存入 SQLite `system_config` 表
5. **关闭模式** — API Key 未配置时，`NvwaXClient` 进入 `closed` 状态，所有操作返回空/错误，不阻塞核心功能

### 5.3 ProClaw → skillhub 调用规范

通过 NvwaX 作为中继（`nvwax_search_skills`、`nvwax_unified_search`），ProClaw 不直接调用 skillhub API。理由：
- 统一 NvwaX 作为 ProClaw 的唯一外部 API 网关
- 计费/认证逻辑集中在 NvwaX 层，避免 ProClaw 维护多套凭证

### 5.4 API 版本策略

| 策略 | 说明 |
|------|------|
| URL 版本化 | `/api/v1/...` → `/api/v2/...` |
| 向后兼容 | N-1 版本共存至少一个发布周期 |
| 废弃通知 | 旧版本端点返回 `Deprecation` Header，提前 30 天通知 |

---

## 6. 离线优先设计模式

### 6.1 核心原则

ProClaw 作为桌面应用，必须保证**核心进销存功能在无网络时完全可用**。

```
          本地操作 (100% 可用)
          │
用户 ─────┤
          │                              云端增强 (按需)
          └──→ SQLite 本地存储            │
          └──→ 本地 AI Team 运行时         ├──→ NvwaX Agent 市场
          └──→ 本地文件系统               ├──→ 云备份同步
                                          └──→ Token 消耗上报
```

### 6.2 已实现的离线回退机制

| 场景 | 主路径 | 回退路径 |
|------|--------|---------|
| Agent/Team 数据 | NvwaX API 下载 | `localTeamSkillMap.ts` 本地预置映射 |
| AI Team 群聊 | NvwaX 云端编排 | 本地 LLM 直接调用 |
| 数据同步 | Supabase 实时同步 | 本地 SQLite 事务队列 |
| API Key 未配置 | 正常调用 | `NvwaXClient.closed = true`，返回空列表 |

### 6.3 开发规则

- **所有外部 API 调用必须有 try-catch + 回退分支**
- **回退行为不抛硬错误**，而是返回降级数据或静默跳过
- **网络恢复后自动重试积压操作**（通过 `SyncEngine` 队列）

---

## 7. 跨项目协作规范

### 7.1 变更影响范围矩阵

| 变更类型 | 需协调的项目 | 流程 |
|---------|-------------|------|
| NvwaX API 新增端点 | ProClaw（新增命令） | NvwaX 先发布 → ProClaw 跟进集成 |
| NvwaX API 字段变更 | ProClaw（更新 `nvwax_client.rs`） | NvwaX 先发布 + 旧字段保留一个版本 |
| skillhub API v2 变更 | NvwaX（中转更新） | skillhub → NvwaX → ProClaw 串行发布 |
| OIDC 认证流程变更 | ProClaw + skillhub | IdP 先行，RP 同步更新 |
| 计费规则变更 | ProClaw（`nvwax_billing.rs`） | NvwaX Admin 配置 → ProClaw 拉取规则 |
| 新 RP 接入 | IdP 仅需注册 `client_id` + `redirect_uri` | 无需变更 IdP 代码 |

### 7.2 分支与发布策略

| 项目 | 分支策略 | 发布模型 |
|------|---------|---------|
| ProClaw | Git Flow (`main` / `develop` / `feature/*`) | 桌面端：版本号发布包；Web 端：持续部署 |
| NvwaX | 主干开发 (`main` + 短分支) | Docker 滚动发布 |
| skillhub | 主干开发 (`master` + 短分支) | Vercel Git 集成自动部署 |

### 7.3 集成测试策略

```
┌─────────────────────────────────────────┐
│          E2E 集成测试套件                 │
│                                         │
│  Docker Compose 一键启动全栈：            │
│  ┌─────────────────────────────────┐    │
│  │ 1. NvwaX auth       (容器)      │    │
│  │ 2. NvwaX API Server  (容器)     │    │
│  │ 3. PostgreSQL        (容器)     │    │
│  │ 4. ProClaw Axum      (本地)     │    │
│  │ 5. skillhub dev      (本地)     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Playwright / Curl 执行跨服务测试：       │
│  - 完整的 OAuth 登录 → API 调用链路       │
│  - NvwaX API → ProClaw 命令桥接链路     │
│  - 离线回退 → 网络恢复链路               │
│  - 计费消耗 → 对账一致性链路             │
└─────────────────────────────────────────┘
```

---

## 8. 安全边界

```
┌────────────────────────────────────────────┐
│                安全边界                     │
│                                            │
│  ProClaw 桌面端 (用户本地)                  │
│  ├── SQLite (不存密码哈希)                  │
│  ├── API Key (AES-256-GCM 加密)            │
│  └── access_token (内存存储，不持久化)       │
│                                            │
│  ═══════════ HTTPS + API Key ═══════════  │
│                                            │
│  NvwaX (云端)                              │
│  ├── PostgreSQL (用户密码 bcrypt 哈希)       │
│  ├── API Key (服务端 Hash 存储)             │
│  └── 不存储 ProClaw 业务数据                │
│                                            │
│  ═══════════ OIDC / HTTPS ═════════════   │
│                                            │
│  skillhub (Vercel)                         │
│  ├── 不存储密码                             │
│  ├── 不直接持有 API Key                     │
│  └── 仅通过 NvwaX 中继调用 ProClaw 相关接口  │
└────────────────────────────────────────────┘
```

**关键安全规则**：

1. ProClaw **永远不存储**用户明文密码或密码哈希
2. NvwaX **永远不存储** ProClaw 商户业务数据
3. API Key 泄露响应：ProClaw 提供一键轮换 + 立即失效旧 Key
4. 跨域 Cookie 设置 `SameSite=Lax` + `Secure` + `HttpOnly`

---

## 11. 虚拟公司闭环（Sprint 2.13–2.17，已交付 ✅ / v1.4.1）

> 状态：**v1.3.2 已发布**。三个 Sprint 累计交付：8 个 Tauri 命令 / 10 个 TS 类型 / 1 套 JSON Schema / 2 套纯函数合并引擎 / 4 个 React 路由 / 67 个测试 / 220+ 行开发者文档。

### 11.1 范围

| 维度 | 内容 |
|------|------|
| **数据契约** | `VirtualCompanyPackage` JSON Schema v1.0.0（schemaVersion 1.0.0 起步） |
| **数据流方向** | 双向：NvWaX → ProClaw（导入）+ ProClaw → NvWaX（local_state 回写） |
| **冲突解决** | 字段级 Last-Write-Wins（每个字段独立比较时间戳） |
| **多设备同步** | App 启动 5 秒后后台静默触发 + 用户手动"立即同步"按钮 |
| **离线兼容** | ProClaw 始终是 source of truth；NvWaX 仅作同步目标 |

### 11.2 跨包 API 端点

#### NvWaX → ProClaw（导出 / 下载）

| Method | Path | 用途 |
|--------|------|------|
| POST | `/api/aiteam-creation/sessions/:id/integrate-proclaw` | 生成 `.nvwax-vc.json`（写临时文件，返回 downloadUrl） |
| GET  | `/api/aiteam-creation/packages/:packageId/download` | 下载导出包（128-bit UUID 不可枚举） |
| GET  | `/api/aiteam-creation/sessions/:id/local-state` | 拉取单个 session 的 `local_state`（多设备同步） |
| GET  | `/api/aiteam-creation/sessions` | 列表响应增加 `local_state` + `localStateLastSyncedAt` |

#### ProClaw → NvWaX（回写）

| Method | Path | 用途 |
|--------|------|------|
| PUT | `/api/aiteam-creation/sessions/:id/local-state` | 接收 ProClaw 推送的 Agent 启停/别名/负责人角色回写 |

### 11.3 ProClaw Tauri 命令（虚拟公司专用）

| 命令 | 引入 | 用途 |
|------|------|------|
| `nvwax_search_vc_templates` | 2.13 | 浏览 NvWaX 虚拟公司模板 |
| `nvwax_import_virtual_company_from_url` | 2.13 | 拉取 `.nvwax-vc.json` 并导入本地 SQLite |
| `bootstrap_virtual_company_tables` | 2.13 | 首次加载时建表（幂等） |
| `open_virtual_company_page` | 2.14 | 触发前端跳转到 `/vc/{wizard,import,companies}` |
| `nvwax_push_virtual_company_state` | 2.14 | 把本地状态变更回写到 NvWaX |
| `nvwax_stream_session` | 2.14 | 通过 SSE 流与 NvWaX 虚拟公司会话交互 |
| `nvwax_fetch_local_state` | 2.15 | 拉取单个 session 的最新 `local_state`（多设备同步） |
| `nvwax_list_sessions_with_state` | 2.15 | 列出用户最近的虚拟公司会话（含 `local_state`） |

### 11.4 字段级 Last-Write-Wins 合并

```
mergeAgentState(local, remote):
  enabled = lww(local.enabled, local.lastModified, remote.enabled, remote.lastRunAt)
  alias = lww(local.alias, local.lastModified, remote.alias, remote.lastRunAt)
  ownerRole = lww(local.ownerRole, local.lastModified, remote.ownerRole, remote.lastRunAt)
  winner = enabled 字段的胜出方（用户最关心的启停）

lww(localVal, localTs, remoteVal, remoteTs):
  if both ts == 0: return remoteVal; winner=remote   # 首次同步 → 云端权威
  if remoteTs > localTs: return remoteVal; winner=remote
  if localTs > remoteTs: return localVal; winner=local
  if equal: return remoteVal; winner=remote   # tie → 云端优先
```

**全量对账**（`reconcileSync`）：

```
输入：cloudSessions: VirtualCompanySessionWithState[]
     localCompanies: LocalVirtualCompanySnapshot[]
输出：{ merged: MergedVirtualCompany[]
       cloudOnly: VirtualCompanySessionWithState[]   # 需导入
       localOnly: LocalVirtualCompanySnapshot[]      # 孤儿，保留
       meta: { syncedAt, counts } }
```

匹配键：云端 `localState.importedPackageId` ↔ 本地 `virtual_companies.package_id`

### 11.5 数据契约位置

- ProClaw 端：`docs/integration/virtual-company-package.schema.json`
- NvWaX 端：`packages/nvwax-server/src/schemas/virtual-company-package.schema.json`（镜像）
- 任何字段增删必须**双端同步 PR**，由 ProClaw + NvWaX 双方 reviewer 共同批准
- 主版本升级（1.x → 2.x）走 ADR 流程，不允许 minor 升级引入破坏性变更

### 11.6 测试覆盖

| 维度 | 文件 | 用例数 |
|------|------|--------|
| Schema 校验 | `src/lib/nvwaxClient.virtualCompany.test.ts` | 8 |
| Plugin Frontend | `src/lib/pluginFrontend.test.ts` | 8 |
| 意图识别 | `src/lib/assistantAgent.test.ts`（虚拟公司相关） | 9 |
| 合并引擎 | `src/lib/virtualCompanySync.test.ts` | 14 |
| Rust 持久化 | `src-tauri/src/services/nvwax_commands.rs::tests` | 4 |
| NvWaX 组装 | `nvwax-server/src/services/proclaw.service.test.ts` | 4 |
| **合计** | | **47** |

### 11.7 已交付 Sprint 时间线

| Sprint | 主题 | 关键里程碑 |
|--------|------|-----------|
| **2.13** | 最小闭环 | Schema v1.0.0 + 3 个 Tauri 命令 + 4 个 React 路由 + 修复 plugin frontend 加载 bug |
| **2.14** | 4 项增强 | CEO Skill + 开发者文档 + 回写 API + 本地 SSE 流式对话 |
| **2.15** | 多设备同步 | `mergeAgentState` + `reconcileSync` 纯函数合并 + 启动后台同步 + Companies 页报告卡片 |
| **2.16** | 持久化 + 模板市场 | 启用/停用状态写 SQLite + 真实 SSE（轮询版） + 模板市场反向发布 + ALTER TABLE 旧库升级 |
| **2.17** | 真实 SSE 收尾 | ProClaw 解析 `event:` 路由 6 种事件；NvWaX 端 `sse-progress.service` 新增 `broadcastAgentMessage()` + `broadcastComplete()` + 7 个 SSE 单元测试；端到端打通 wizard 流式显示 |

### 11.8 后续计划（非本轮范围）

- **虚拟公司模板市场反向发布详情页**（在 NvWaX 端）— 计划 v1.5.0
- **多设备冲突 UI 撤销按钮**（CRDT 风格字段级合并）— 计划 v1.5.0
- **虚拟公司端到端 e2e Playwright 套件** — 计划 v1.5.0
- **多设备冲突 UI 提示**（撤销按钮 + CRDT 风格字段级合并）— 计划 v1.5.0

---

## 9. 路线图要点

| 阶段 | 内容 | 涉及项目 |
|------|------|---------|
| **当前 (v1.0)** | NvwaX API 集成已完成，线下回退机制完备 | ProClaw |
| **短期** | OIDC 统一认证引擎搭建，`account.proclaw.cc` 上线 | NvwaX |
| **短期** | ProClaw 桌面端接入 OIDC（替换现有登录） | ProClaw |
| **中期** | skillhub 接入 OIDC，实现 SSO | skillhub |
| **中期** | 插件系统 v10.0 三平台联动（Nuwax + SkillHub + FlowHub） | 全部 |
| **长期** | API Schema 仓库 + 自动生成客户端代码 | 全部 |

---

## 10. 术语表

| 术语 | 全称 | 说明 |
|------|------|------|
| **IdP** | Identity Provider | 身份提供者，签发 ID Token |
| **RP** | Relying Party | 依赖方，信任 IdP 签发的身份 |
| **OIDC** | OpenID Connect | 基于 OAuth 2.0 的身份认证协议 |
| **PKCE** | Proof Key for Code Exchange | 防止授权码拦截的安全扩展 |
| **Loopback Redirect** | 回环重定向 | 桌面/移动端通过 `127.0.0.1` 临时端口接收回调 |
| **SSO** | Single Sign-On | 一次登录，所有关联站点通行 |
| **SL** | Single Logout | 一处登出，所有站点同步登出 |
