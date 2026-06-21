# ProClaw × NvwaX × skillhub 多项目集成开发计划

## Context

`docs/MULTI_PROJECT_INTEGRATION_SPEC.md` 已确立架构方向：三个项目**不合并代码**，通过 OIDC 协议 + API 网关协作。NvwaX 拆出 `nvwax-auth` 模块托管在 `account.proclaw.cc` 子域名，作为 OIDC IdP；ProClaw 桌面端 / Web 端 / skillhub 作为 Relying Party；`.proclaw.cc` 域 Cookie 共享实现 SSO。

**当前现状**：
- ProClaw `authStore.ts`（Zustand，169 行）= mock 账号 + Supabase 双轨
- ProClaw Rust 后端 `api/auth.rs`（650 行）= Argon2 + JWT 自建
- 计划目标：在 5 个 Sprint（12-15 周）内完成 IdP 搭建 + 三端接入 + 三平台插件联动

**阻塞关键路径**：Sprint 2（IdP 完整化 + DNS/SSL 上线）—— 后续所有 RP 接入都依赖 IdP 公网可访问。

---

## 总体计划

| Sprint | 周数 | 主题 | 涉及项目 | 核心交付 |
|--------|------|------|---------|---------|
| **1** | 2 周 | 协议定稿 + IdP 骨架 | NvwaX | OIDC 端点可 curl、JWKS 暴露、PKCE 工具 |
| **2** | 3 周 | IdP 完整化 + 白标登录页 + DNS | NvwaX | `account.proclaw.cc` 上线，ProClaw VI 品牌，`.proclaw.cc` Cookie |
| **3** | 3 周 | ProClaw 桌面端接入 OIDC | ProClaw | 替换 `authStore.ts` + 接入 tauri-plugin-oauth |
| **4** | 3 周 | ProClaw 云在线版 + skillhub SSO | ProClaw / skillhub | 三站 SSO + Single Logout |
| **5** | 2-3 周 | 插件联动 + API 治理 | 全部 | 三平台统一搜索 + OpenAPI schema 仓库 + 监控审计 |

---

## Sprint 1 — IdP 骨架（2 周）

**目标**：NvwaX 侧 OIDC 端点可工作，协议规范文档化。

### 任务清单

1.1. **协议文档附录**：在 `docs/MULTI_PROJECT_INTEGRATION_SPEC.md` 附录 A 补全 authorize / token / userinfo / refresh / logout 的完整请求/响应示例

1.2. **数据库迁移**：NvwaX `packages/nvwax-server/src/migrations/` 新增三张表
- `oidc_clients`（client_id、client_secret_hash、redirect_uris、allowed_scopes、created_at）
- `oidc_authorization_codes`（code、code_challenge、code_challenge_method、client_id、user_id、expires_at、used）
- `oidc_refresh_tokens`（token、client_id、user_id、scope、expires_at、revoked）

1.3. **PKCE 工具函数**：`packages/nvwax-server/src/services/oauth/pkce.util.ts`
- `generate_code_verifier()` — 43-128 字符
- `verify_code_challenge(verifier, challenge, method)` — 支持 `S256`

1.4. **JWT 签发服务**：`packages/nvwax-server/src/services/oauth/oidc-token.service.ts`
- RS256 私钥（部署时生成，K8s Secret 存储）
- 私钥生成脚本 `scripts/generate-oidc-keys.sh`（`openssl genrsa` + `openssl rsa -pubout`）
- `signIdToken(claims)` — claims 含 `iss=https://account.proclaw.cc`、`sub`、`aud`、`exp`、`iat`、`email`、`name`、`permissions`
- `getJWKS()` — 导出公钥供 `/.well-known/jwks.json`

1.5. **OIDC 端点骨架**：`packages/nvwax-server/src/controllers/oidc.controller.ts` + `routes/index.ts`
- `GET /oauth/authorize` — 临时丑陋 HTML 登录表单
- `POST /oauth/token` — code 换 token；refresh_token 换新 access_token
- `GET /oauth/userinfo` — 返回 sub / email / name / permissions
- `GET /.well-known/openid-configuration` — 元数据
- `GET /.well-known/jwks.json` — 公开密钥

1.6. **Docker 本地 stub**：`docker/nginx/account.proclaw.cc.conf`（Nginx + 自签证书 + hosts 映射）

1.7. **单元测试**：`__tests__/oidc.test.ts`
- PKCE 校验正反例
- code 一次性（重放被拒）
- token 签名验签
- JWKS 公钥与私钥匹配

### 关键文件路径

| 项目 | 路径 |
|------|------|
| NvwaX | `D:\BigLionX\NvwaX\packages\nvwax-server\src\controllers\oidc.controller.ts`（新建） |
| NvwaX | `D:\BigLionX\NvwaX\packages\nvwax-server\src\services\oauth\oidc-token.service.ts`（新建） |
| NvwaX | `D:\BigLionX\NvwaX\packages\nvwax-server\src\services\oauth\pkce.util.ts`（新建） |
| NvwaX | `D:\BigLionX\NvwaX\packages\nvwax-server\src\routes\index.ts`（修改） |
| NvwaX | `D:\BigLionX\NvwaX\docker\nginx\account.proclaw.cc.conf`（新建） |
| ProClaw | `D:\BigLionX\ProClaw\docs\MULTI_PROJECT_INTEGRATION_SPEC.md`（追加附录） |

### 验证标准（DoD）

- [ ] `curl https://account.proclaw.cc/.well-known/openid-configuration` 返回 200 + 完整 OIDC 元数据
- [ ] 5 步流程（authorize → token → userinfo → refresh → logout）通过 Playwright 脚本
- [ ] code 只能使用一次，重放测试被拒
- [ ] JWKS 端点能验证 token 签名

---

## Sprint 2 — IdP 完整化 + 白标 + DNS（3 周）

**目标**：`account.proclaw.cc` 拥有 ProClaw 品牌完整登录/注册/找回密码 UI，公网可访问，Cookie 域 `.proclaw.cc`。

### 任务清单

2.1. **新建 `packages/account-portal/`**（Next.js 14 App Router）
- pnpm workspace 注册
- `app/login/page.tsx` — ProClaw VI（**零 NvwaX 品牌**）
- `app/register/page.tsx` — 邮箱 + 密码强度 + 验证邮件
- `app/forgot/page.tsx` — 邮件 token + 重置表单
- `app/callback/page.tsx` — 通用 RP 回调占位

2.2. **后端接通前端**：`oidc.controller.ts`
- `/oauth/authorize` 接住前端 form POST → 验证密码（复用 `user.service.ts` 现有 Argon2）→ 签发 code → 302 redirect_uri

2.3. **RP 客户端注册**：`services/oauth/oidc-client.service.ts`
- `POST /api/v1/oidc/clients`（管理员接口）
- CLI 工具 `pnpm add-rp --name proclaw-desktop --redirect http://127.0.0.1:*/callback`

2.4. **跨域 SSO Cookie**：
- `Set-Cookie: pc_session=...; Domain=.proclaw.cc; HttpOnly; Secure; SameSite=Lax; Path=/`
- `pc_session` 内容为加密的 session id，服务端用 session id 查 token

2.5. **邮件白标**：`services/notification.service.ts`
- 发件人 `ProClaw 团队 <noreply@account.proclaw.cc>`
- 模板中 grep 不到 NvwaX

2.6. **DNS + SSL**（**关键路径**）
- Cloudflare 注册 `account.proclaw.cc` A 记录 → 负载均衡 IP
- Let's Encrypt 证书申请（`certbot --nginx`）
- DNS 记录：`v=spf1 include:account.proclaw.cc -all` + DKIM

2.7. **E2E 测试**：`tests/e2e/oidc-flow.spec.ts`
- 注册 → 邮件 → 激活 → 登录 → 跳转回 RP
- 跨子域 Cookie 验证

### 关键文件路径

| 项目 | 路径 |
|------|------|
| NvwaX | `D:\BigLionX\NvwaX\packages\account-portal\`（新建包） |
| NvwaX | `D:\BigLionX\NvwaX\packages\nvwax-server\src\controllers\oidc.controller.ts`（扩） |
| NvwaX | `D:\BigLionX\NvwaX\packages\nvwax-server\src\services\oauth\oidc-client.service.ts`（新建） |
| NvwaX | `D:\BigLionX\NvwaX\packages\nvwax-server\src\services\notification.service.ts`（改） |
| NvwaX | `D:\BigLionX\NvwaX\docker\nginx\account.proclaw.cc.conf`（建） |

### 验证标准（DoD）

- [ ] 浏览器访问 `https://account.proclaw.cc/login` — ProClaw Logo，**无 NvwaX 字样**
- [ ] 登录后开发者工具查看 `pc_session` Cookie Domain 为 `.proclaw.cc`
- [ ] 完整链路 < 30s
- [ ] 邮件 grep "NvwaX" 为空
- [ ] DNS 全局生效（`dig account.proclaw.cc`）

---

## Sprint 3 — ProClaw 桌面端接入 OIDC（3 周）⭐ 核心

**目标**：用 tauri-plugin-oauth + Loopback Redirect 替换现有 mock + Supabase 双轨登录。

### 任务清单

3.1. **ADR 决策**（0.5 d）：`docs/adr/003-tauri-oauth-implementation.md`
- 选 `tauri-plugin-oauth`（Rust 启 loopback server）+ 前端 `oidc-client-ts` 接收 code
- vs 纯 JS `openid-client`（前端启 server）
- 结论：选 Rust 侧，因前端 WebView 启 server 在 Windows 上有兼容问题

3.2. **依赖集成**（0.5 d）
- `src-tauri/Cargo.toml` 加 `tauri-plugin-oauth = "2"`
- `src-tauri/capabilities/default.json` 加 `"oauth:default"` + `"shell:allow-open"`

3.3. **`oauth_client.rs` 新建**（3 d）：`src-tauri/src/services/oauth_client.rs`
- `pub async fn start_oidc_login(window: Window) -> Result<OidcTokens, String>`
- 生成 PKCE pair（code_verifier + S256 challenge）
- `tauri-plugin-oauth` 启 `127.0.0.1:0` 临时 server
- 打开系统浏览器（默认浏览器）跳转 `/oauth/authorize?...&code_challenge=...&code_challenge_method=S256`
- 收到回调后 POST `/oauth/token` 换 token

3.4. **`verify_id_token` 工具**（2 d）：`src-tauri/src/auth/permissions.rs` 新增函数
- 拉 NvwaX JWKS（缓存 1h）
- RS256 验签
- 校验 `iss=https://account.proclaw.cc`、`aud=proclaw_desktop`、`exp` 未过期

3.5. **前端 OIDC 客户端**（2 d）：`src/lib/oidc-client.ts`（新建）
- 调用 Tauri 命令 `start_oidc_login`
- 接收 tokens，**仅写 Zustand store（内存）**，不写 localStorage
- 自动 refresh：access_token 到期前 5min 静默刷新

3.6. **UI 改造**（1 d）：
- `src/pages/LoginPage.tsx` — 移除邮箱/密码输入框、移除 `MOCK_PASSWORD` 提示 → 改"使用 ProClaw 账号登录"单按钮
- `src/components/Auth/LoginDialog.tsx` — 同上

3.7. **改造 `authStore.ts`**（2 d）
- 移除 `MOCK_ACCOUNTS`、`supabase.auth.*`
- 新增 `oidcLogin()` / `oidcLogout()` / `oidcRefresh()`
- 保留 `user` / `session` 字段签名不变（**下游组件零改动**）
- access_token 用 `secrecy::SecretString`（Rust 侧）等价机制

3.8. **`api/auth.rs` 缩减**（1 d）
- 当前 650 行 → 缩减为 ~150 行
- 仅保留 `pair_device`（移动端 QR 扫码登录用）
- 删除 `login()` / `hash_password()` / `verify_password()` / JWT 自签

3.9. **dev 模式兜底**（0.5 d）
- 环境变量 `VITE_ENABLE_DEV_LOGIN=true` 时显示"开发模式登录"按钮（仅 dev 构建）
- 生产构建隐藏

3.10. **回归测试**（1.5 d）
- `nvwax_commands.rs` 30+ 命令**不受影响**（API Key 走 AES-256-GCM，与 access_token 是两套）
- e2e `auth-flow.spec.ts`

### 关键文件路径

| 操作 | 路径 |
|------|------|
| 新建 | `D:\BigLionX\ProClaw\src-tauri\src\services\oauth_client.rs` |
| 新建 | `D:\BigLionX\ProClaw\src\lib\oidc-client.ts` |
| 新建 | `D:\BigLionX\ProClaw\docs\adr\003-tauri-oauth-implementation.md` |
| 修改 | `D:\BigLionX\ProClaw\src-tauri\Cargo.toml` |
| 修改 | `D:\BigLionX\ProClaw\src-tauri\capabilities\default.json` |
| 修改 | `D:\BigLionX\ProClaw\src\pages\LoginPage.tsx` |
| 修改 | `D:\BigLionX\ProClaw\src\components\Auth\LoginDialog.tsx` |
| 修改 | `D:\BigLionX\ProClaw\src\lib\authStore.ts` |
| 缩减 | `D:\BigLionX\ProClaw\src-tauri\src\api\auth.rs`（650→~150 行） |
| 保留 | `D:\BigLionX\ProClaw\src-tauri\src\auth\permissions.rs`（新增 verify_id_token） |

### 验证标准（DoD）

- [ ] 启动 ProClaw 桌面端 → 看到"使用 ProClaw 账号登录"按钮
- [ ] 点击 → 系统浏览器打开 `account.proclaw.cc` 登录页
- [ ] 登录成功后自动切回桌面端，无需手动复制 code
- [ ] 进程内存 dump 可见 access_token，**localStorage / SQLite 查不到**
- [ ] 退出后再次启动仍能保持登录（7 天 session）
- [ ] 关闭网络 → 已登录会话仍可使用核心进销存（OIDC 鉴权与业务数据解耦）
- [ ] `api/auth.rs` 已从 650 行缩减为 ~150 行
- [ ] 30+ NvwaX 命令功能未受影响

---

## Sprint 4 — ProClaw Web + skillhub SSO（3 周）

**目标**：ProClaw 云在线版（`app.proclaw.cc`）和 skillhub（`skillhub.proclaw.cc`）用标准 Authorization Code + PKCE 接入，跨子域 SSO + Single Logout。

### 任务清单

4.1. **注册两个新 RP**（0.5 d）
- NvwaX 控制台注册 `proclaw_web`（redirect: `https://app.proclaw.cc/auth/callback`）
- NvwaX 控制台注册 `skillhub_web`（redirect: `https://skillhub.proclaw.cc/auth/callback`）

4.2. **ProClaw 云版 OIDC 客户端**（2 d）：`cloud-store/src/lib/oidc-client.ts`
- 标准 Authorization Code + PKCE（前端做 state/code_verifier）

4.3. **ProClaw 云版 middleware**（1.5 d）：`cloud-store/src/middleware.ts`
- 未登录 → 302 `https://account.proclaw.cc/oauth/authorize?...&redirect_uri=...`

4.4. **ProClaw 云版 callback 路由**（1.5 d）：`app/auth/callback/route.ts`
- 接收 code → 换 token → 设 `pc_session` Cookie（Domain=`.proclaw.cc`）
- 保留现有 QR 扫码登录逻辑（设备配对，与 PKCE 不冲突）

4.5. **skillhub 改造**（2 d）
- `apps/web/middleware.ts`（95 行 NextAuth）替换为 OIDC 中间件
- `lib/oidc-client.ts`（新建）— `openid-client` 封装
- `app/auth/callback/page.tsx`（新建）— 换 token → 写 NextAuth JWT 作为内部 session

4.6. **skillhub 中间件**（1.5 d）：`apps/web/middleware.ts`
- 用 `jose` 校验 id_token
- public path（`/skills`、`/namespaces`）放行
- protected path（`/dashboard`、`/api/skills/publish`）未登录 302

4.7. **SSO 验证**（1 d）：`e2e/sso-cross-subdomain.spec.ts`
- 隐身窗口登录 `account.proclaw.cc` → 访问 `app.proclaw.cc` → 跳过登录
- 切到 `skillhub.proclaw.cc/dashboard` → 跳过登录

4.8. **Single Logout**（1 d）：`oidc.controller.ts`
- `account.proclaw.cc/logout` 通知所有 RP（OIDC Back-Channel Logout）
- RP 收到后清理本地 session

4.9. **文档更新**（0.5 d）：`MULTI_PROJECT_INTEGRATION_SPEC.md` 加 SSO 部署清单

### 关键文件路径

| 操作 | 路径 |
|------|------|
| 修改 | `D:\BigLionX\ProClaw\cloud-store\src\middleware.ts` |
| 修改 | `D:\BigLionX\ProClaw\cloud-store\src\lib\auth.ts`（或 authStore） |
| 新建 | `D:\BigLionX\ProClaw\cloud-store\src\lib\oidc-client.ts` |
| 新建 | `D:\BigLionX\ProClaw\cloud-store\app\auth\callback\route.ts`（如不存在） |
| 修改 | `D:\BigLionX\skillhub\apps\web\middleware.ts` |
| 新建 | `D:\BigLionX\skillhub\apps\web\lib\oidc-client.ts` |
| 新建 | `D:\BigLionX\skillhub\apps\web\app\auth\callback\page.tsx` |
| 改 | `D:\BigLionX\NvwaX\packages\nvwax-server\src\controllers\oidc.controller.ts`（加 SL） |

### 验证标准（DoD）

- [ ] 隐身窗口访问 `app.proclaw.cc` → 跳 `account.proclaw.cc` → 登录 → 回 `app.proclaw.cc` 已登录
- [ ] 同一浏览器切到 `skillhub.proclaw.cc/dashboard` → **不再提示登录**
- [ ] `account.proclaw.cc` 登出 → 三站刷新后都跳回登录页
- [ ] 三站登录页**完全 ProClaw 品牌**
- [ ] skillhub 现有 NextAuth-protected path 正常工作

---

## Sprint 5 — 三平台插件联动 + 治理（2-3 周）

**目标**：插件系统 v10.0 三平台联动落地，OpenAPI schema 仓库雏形，监控审计。

### 任务清单

5.1. **三平台统一搜索**（2 d）：`nvwax-server/src/controllers/search.controller.ts`
- `GET /api/v1/unified-search?q=...&sources=agents,skills,flows`
- 内部聚合 NvwaX Agent + skillhub Skill + FlowHub Plugin

5.2. **ProClaw 市场页扩展**（2 d）：`MarketplaceDialog.tsx`（768 行）
- 已有 Agents / AiTeams Tab，加 Plugins Tab
- 复用同一搜索接口

5.3. **OpenAPI schema 仓库**（3 d）：`packages/openapi-spec/`（新建包）
- `openapi.yaml` 描述所有 NvwaX + skillhub 端点
- CI 校验 + 自动生成 TypeScript 类型（`openapi-typescript`）

5.4. **PoC: 从 OpenAPI 生成 Rust 客户端**（3 d）
- 用 `progenitor` 自动生成 NvwaX client
- 对比手写 1226 行 `nvwax_client.rs`
- **结果不强制采用**，留作技术储备

5.5. **监控**（1 d）
- `account.proclaw.cc/metrics` Prometheus 端点
- 指标：`oidc_token_request_total{status,client_id}`、`oidc_login_duration_seconds`

5.6. **审计日志**（1 d）
- 数据库迁移：`oidc_audit_log` 表
- 记录：登录/登出/token 签发/失败，含 user_id、client_id、IP、UA

5.7. **故障演练**（1 d）
- 模拟 NvwaX 宕机 5 分钟 → ProClaw 核心进销存仍可用
- 验证 access_token 内存缓存 72h 优雅降级

### 验证标准（DoD）

- [ ] ProClaw 市场页能同时浏览 Agent / Skill / PluginFlow
- [ ] OpenAPI schema 仓库 PR 改字段 → CI 自动生成 diff
- [ ] Prometheus 抓取 `/metrics` 返回 OIDC 指标
- [ ] 模拟 NvwaX 宕机 5 分钟 → ProClaw 核心进销存仍可下单出库
- [ ] 全链路 e2e（ProClaw 登录 → 浏览市场 → 创建 Agent → 计费扣减 → skillhub 同步）通过

---

## 关键路径与人员配置

### 关键路径

```
Sprint 1 (IdP 骨架)
    ↓
Sprint 2 (IdP 完整化 + DNS)  ← 阻塞点，延期 1 周整体顺延
    ↓
Sprint 3 (ProClaw 桌面端)    ← 本项目"主菜"
    ↓
Sprint 4 (ProClaw Web + skillhub SSO)
    ↓
Sprint 5 (三平台联动 + 治理)
```

### 人员配置（3-4 人小团队）

| 角色 | 数量 | 职责 |
|------|------|------|
| 后端架构师 / IdP 负责人 | 1 | Sprint 1-2：IdP 后端 + 数据库迁移 + JWKS；Sprint 5：OpenAPI schema |
| 前端 / 全栈 A | 1 | Sprint 2：`account-portal` 白标；Sprint 4：skillhub 接入 |
| 桌面端工程师 | 1 | Sprint 3：Tauri 端 OIDC 集成；Sprint 4：cloud-store 接入；Sprint 5：插件联动 |
| 测试 / 文档 | 0.5 | 跨 Sprint：E2E 编写、文档同步 |

### 可并行

- Sprint 1 末 ↔ Sprint 2 初：登录页 UI 设计稿 与 OIDC 端点开发完全并行
- Sprint 2 末 ↔ Sprint 3 初：桌面端 `tauri-plugin-oauth` PoC 与 IdP 接口冻结并行
- Sprint 4 末 ↔ Sprint 5 初：OpenAPI 仓库建模 与 Sprint 4 收尾并行

### 必须串行

- Sprint 2 DNS/SSL 稳定 → Sprint 3 启动
- Sprint 3 桌面端代码合并 → Sprint 4 移动端扫码登录基线更新
- Sprint 4 三方 SSO 稳定 → Sprint 5 跨项目 API 治理

---

## 协调机制

1. **共享频道**：跨三仓库 Slack/飞书频道，OIDC 协议变更先 PR
2. **每周三同步会**：30 分钟，3 项目 Lead 同步进度
3. **接口冻结节点**：
   - Sprint 1 末：冻结 OIDC 端点 URL + 请求/响应 schema
   - Sprint 3 末：冻结桌面端 `access_token` store 形状
   - Sprint 4 末：冻结 `pc_session` Cookie 名称与 domain
4. **回滚方案**：
   - 每 Sprint 末打 tag：`proclaw-v1.x.0-oidc-stepN`
   - IdP 故障时：ProClaw 保留"开发模式登录"（mock boss）兜底

---

## 全局风险与缓解

| 风险 | 缓解 |
|------|------|
| tauri-plugin-oauth 跨平台兼容（Win OK，Mac/Linux 待验） | Sprint 3 第 1 周三平台并行 PoC；准备"手动粘贴 code"降级 |
| NvwaX IdP 单点失败 = 全生态无法登录 | 至少 2 实例 + 负载均衡；前端缓存 access_token 7 天支持无网登录 |
| skillhub 老用户数据迁移 | 首次登录强制"找回密码"重置到 NvwaX；保留 2 个月过渡期 |
| 子域 Cookie 在 Safari ITP / Chrome 第三方 Cookie 禁用下被拒 | id_token 模式（不依赖 Cookie）作为 fallback；SSO 作为增强而非必需 |
| 跨仓库依赖耦合 | 用 ADR 固化协议变更；三仓库各自 owner 审阅 |

---

## 端到端验证（项目完成后）

**完整链路 e2e 验证流程**：

1. 用户首次在 ProClaw 桌面端点击"使用 ProClaw 账号登录"
2. 系统浏览器打开 `https://account.proclaw.cc/login`（ProClaw 品牌，零 NvwaX 字样）
3. 注册新账号 → 收到 ProClaw 邮件（发件人 noreply@account.proclaw.cc）
4. 登录 → 自动切回 ProClaw 桌面端，无需手动操作
5. 打开浏览器访问 `https://app.proclaw.cc` → 已登录
6. 切到 `https://skillhub.proclaw.cc/dashboard` → 已登录
7. 切到 `https://nvwax.proclaw.cc/admin`（开发者账号）→ 已登录
8. 在 `account.proclaw.cc` 点登出 → 四站刷新后全部回到登录页
9. 关停 NvwaX 服务 5 分钟 → ProClaw 桌面端仍可使用核心进销存（内存中 access_token 仍有效）

**成功标准**：以上 9 步全部通过，且三站登录页 UI 审查 100% ProClaw 品牌。

---

## 下一步

1. **本周内**：联合三个 Lead 开 Sprint 1 启动会，确认 ADR-002（OIDC 选型）决策
2. **Sprint 1 启动**：明确 DNS 负责人，约定 PR 同步频道
3. **Sprint 1 末**：冻结 OIDC 协议规范，启动 Sprint 2 设计稿
