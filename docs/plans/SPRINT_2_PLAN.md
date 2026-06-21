# Sprint 2 启动计划 — IdP 完整化 + 白标登录页 + DNS

## Context

**Sprint 1 已完成（2026-07-04）**：NvwaX 仓库内 OIDC IdP 骨架已落地，6 端点可工作，单元测试通过。**接口已冻结**，Sprint 2 必须严格按契约实现，禁止破坏。

### Sprint 1 冻结契约（不可变更）

#### 6 个端点 URL

| 端点 | 方法 | 用途 |
|------|------|------|
| `/oauth/authorize` | GET/POST | 用户登录授权入口 |
| `/oauth/token` | POST | code 换 token；refresh_token 换新 access_token |
| `/oauth/userinfo` | GET | 用 access_token 查用户信息 |
| `/oauth/logout` | POST | 撤销 refresh_token |
| `/.well-known/openid-configuration` | GET | OIDC 元数据 |
| `/.well-known/jwks.json` | GET | RS256 公钥集 |

#### 6 个错误码

| 错误码 | 触发场景 |
|--------|---------|
| `invalid_request` | 缺少必填参数 / 参数格式错误 |
| `invalid_client` | client_id 或 client_secret 错误 |
| `invalid_grant` | code 过期/已使用 / refresh_token 无效 / code_verifier 校验失败 |
| `invalid_scope` | 请求的 scope 不在 client 允许范围 |
| `unsupported_grant_type` | grant_type 不支持（仅 `authorization_code` 和 `refresh_token`） |
| `server_error` | 服务端内部错误（含 RS256 私钥丢失、JWKS 生成失败等） |

#### JWT Claims 形状

**id_token（8 字段）**：
```json
{
  "iss": "https://account.proclaw.cc",
  "sub": "user_001",
  "aud": "proclaw_desktop",
  "exp": 1751712000,
  "iat": 1751708400,
  "email": "user@example.com",
  "name": "用户显示名",
  "permissions": ["order:create", "order:read"]
}
```

**access_token（6 字段）**：
```json
{
  "iss": "https://account.proclaw.cc",
  "sub": "user_001",
  "aud": "proclaw_desktop",
  "exp": 1751712000,
  "iat": 1751708400,
  "scope": "openid profile email"
}
```

#### 关键技术决策（Sprint 1 沉淀的踩坑经验）

| 问题 | 解决方案 |
|------|---------|
| ESM 环境下 `jest.mock()` 失效 | 改用 `jest.unstable_mockModule()` + 动态 `await import()` |
| ESM 不支持 `require()` | 所有 `pkce.util.ts` / `oidc.service.ts` / `oidc-token.service.ts` 改用 `import { xxx } from 'node:crypto'` |
| `.js → .ts` 模块解析 | 自定义 `jest.resolver.cjs` + `moduleNameMapper` 处理 ESM 后缀 |
| `NODE_ENV=test` 时服务拒启动 | `oidc-token.service.ts` 在 dev 模式自动生成密钥，`test` 加入 dev 分支 |
| `.env.test` 中 issuer 用 http | 改为 `https://account.proclaw.cc` 与 `iss` claim 一致 |

### Sprint 1 末状态

- ✅ NvwaX 侧 OIDC 端点 6 个可工作
- ✅ RS256 私钥 dev 模式自动生成（生产用 K8s Secret）
- ✅ 单元测试通过
- ✅ 接口契约冻结
- ⏳ DNS/SSL 未上线（仍在 `localhost:3000`）
- ⏳ 登录页是临时丑陋的 HTML 表单（不是 ProClaw 品牌）
- ⏳ 无注册/找回密码流程
- ⏳ 邮件通知未接入

---

## Sprint 2 目标

**让 `account.proclaw.cc` 在公网上线，拥有 ProClaw 品牌的完整登录/注册/找回密码 UI，所有交互在 `.proclaw.cc` 域内完成，跨子域 Cookie 实现 SSO 准备。**

**3 周（15 工作日）**

---

## 任务清单（按依赖顺序）

### 2.1 DNS + SSL 上线（1 d）⚠️ 关键路径

**目标**：`account.proclaw.cc` 公网可访问，HTTPS 证书就绪。

- 在 Cloudflare DNS 添加 A 记录：`account.proclaw.cc` → 负载均衡 IP
- 申请 Let's Encrypt 证书（`certbot certonly --nginx -d account.proclaw.cc`）
- 配置 SSL 证书自动续期（`certbot renew --dry-run` 验证）
- 设置 DNS SPF 记录：`v=spf1 include:account.proclaw.cc -all`
- 配置 DKIM（邮件白标必需）
- 验证：`dig account.proclaw.cc` 解析正确 + `curl -I https://account.proclaw.cc/.well-known/openid-configuration` 返回 200

### 2.2 邮件基础设施接入（1 d）

**目标**：注册、找回密码、登录通知等邮件可发送，发件人是 ProClaw 品牌。

- 接入 SendGrid 或 AWS SES（按 NvwaX 现有邮件基础设施）
- 配置 `noreply@account.proclaw.cc` 发件人
- 创建 `BrandedMailer` 抽象类（避免 NvwaX 现有邮件代码侵入）：
  - `sendWelcomeEmail(email, name)` — 注册欢迎
  - `sendVerificationEmail(email, token)` — 邮箱验证
  - `sendPasswordResetEmail(email, token)` — 密码重置
  - `sendLoginNotificationEmail(email, ip, ua)` — 异地登录提醒
- 邮件模板白标：grep "NvwaX" 为空，发件人显示 "ProClaw 团队"
- DNS MX + SPF + DKIM + DMARC 全部就绪

### 2.3 `account-portal` 子包搭建（1 d）

**目标**：在 NvwaX monorepo 内新建白标登录页 Next.js 应用。

- 新建 `packages/account-portal/`
- pnpm workspace 注册（修改 `pnpm-workspace.yaml`）
- Next.js 14 App Router 脚手架
- 复用 ProClaw 公共资产（通过 git submodule 或直接复制）：
  - `proclaw-logo.png`
  - Tailwind 配置 / 颜色变量
  - ProClaw VI 字体
- 基础布局：`app/layout.tsx` — 全屏居中卡片，ProClaw Logo + 表单

### 2.4 登录页 UI（2 d）

**目标**：`account.proclaw.cc/login` 是 ProClaw 品牌，零 NvwaX 字样。

**关键文件**：
- `packages/account-portal/app/login/page.tsx` — 邮箱/密码登录
- `packages/account-portal/app/login/loading.tsx` — 加载状态
- `packages/account-portal/components/AuthForm.tsx` — 通用表单组件
- `packages/account-portal/lib/api-client.ts` — 调用 NvwaX 后端

**实现要点**：
- 表单：邮箱 + 密码 + "记住我" + "登录" 按钮
- "使用 ProClaw 账号" 副标题
- 底部链接："注册新账号" | "忘记密码"
- 错误处理：通用错误信息，避免泄露账号存在性
- Rate limiting（前端禁用按钮 + 后端限流）
- a11y：键盘导航、ARIA 标签
- 响应式：移动端友好（虽然主要服务桌面端 OAuth 回调）

**白标验收**：
```bash
# 邮件 grep 测试
curl -s https://account.proclaw.cc/login | grep -i "nvwax\|nvwx"
# 期望：零结果

# 视觉验收（设计稿对比）
# 期望：ProClaw Logo、ProClaw 主色 (#0F62FE 蓝)、ProClaw VI 字体
```

### 2.5 注册页 UI（2 d）

**目标**：`account.proclaw.cc/register` 完整注册流程。

**关键文件**：
- `packages/account-portal/app/register/page.tsx` — 注册表单
- `packages/account-portal/app/register/verify/page.tsx` — 邮箱验证
- `packages/account-portal/app/register/success/page.tsx` — 注册成功

**实现要点**：
- 邮箱 + 密码 + 确认密码
- 密码强度：zxcvbn 库评分 ≥ 3
- 邮箱实时验证（debounce 500ms）
- 提交后：发送验证邮件 → 跳转 "请查收邮件" 页
- 验证邮件点击链接 → 验证 token → 激活账号 → 自动登录

### 2.6 找回密码页 UI（2 d）

**目标**：`account.proclaw.cc/forgot` + `/reset` 找回密码流程。

**关键文件**：
- `packages/account-portal/app/forgot/page.tsx` — 输入邮箱
- `packages/account-portal/app/reset/page.tsx` — 重置密码
- `packages/account-portal/app/reset/success/page.tsx` — 重置成功

**实现要点**：
- 输入邮箱 → 发送重置邮件（无论邮箱是否存在都显示成功，防枚举）
- 邮件链接：`https://account.proclaw.cc/reset?token=xxx`
- 重置页：密码强度校验（同注册）
- 成功后强制登出所有设备（撤销所有 refresh_token）

### 2.7 后端接通前端（2 d）

**目标**：`/oauth/authorize` 接收前端表单 POST，验证用户，签发 code，302 redirect。

**修改文件**：
- `D:\BigLionX\NvwaX\packages\nvwax-server\src\controllers\oidc.controller.ts`
  - `GET /oauth/authorize` — 保留临时丑陋版（fallback），新增 query 参数 `view=branded` 触发白标
  - `POST /oauth/authorize/login` — 新增：接收 email + password + client_id + state + redirect_uri，验证后 302
  - 验证流程：复用 NvwaX 现有 `user.service.ts` 的 Argon2 校验（**不重复实现**）

- `D:\BigLionX\NvwaX\packages\nvwax-server\src\services\oauth\oidc-client.service.ts`（新建）
  - `registerRP(name, redirectUris[], allowedScopes[])` — 管理员注册 RP
  - `listRPs()` — 列表
  - `revokeRP(clientId)` — 撤销

- `D:\BigLionX\NvwaX\packages\nvwax-server\src\controllers\oidc-admin.controller.ts`（新建）
  - `POST /api/v1/admin/oidc/clients` — 注册 RP
  - `GET /api/v1/admin/oidc/clients` — 列表
  - `DELETE /api/v1/admin/oidc/clients/:id` — 撤销

### 2.8 跨域 SSO Cookie（1 d）

**目标**：`Set-Cookie: pc_session=...; Domain=.proclaw.cc; HttpOnly; Secure; SameSite=Lax`。

**修改文件**：
- `D:\BigLionX\NvwaX\packages\nvwax-server\src\controllers\oidc.controller.ts`
  - `/oauth/authorize/login` 成功后：
    ```typescript
    res.cookie('pc_session', encryptedSessionId, {
      domain: '.proclaw.cc',
      httpOnly: true,
      secure: true, // 生产强制
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    });
    ```
  - `pc_session` 是加密的 session id，服务端用 session id 查 token

- 浏览器开发者工具可见 `Domain=.proclaw.cc`

### 2.9 RP 客户端 CLI 工具（1 d）

**目标**：管理员用 CLI 注册 ProClaw/skillhub 的 RP。

**新建文件**：
- `D:\BigLionX\NvwaX\packages\nvwax-server\src\cli\add-rp.ts`
  - 接收 `--name`、`--redirect`、`--scopes`
  - 调用 `POST /api/v1/admin/oidc/clients`
  - 输出 client_id + client_secret（一次性展示，关闭后无法再次查看完整密钥，与 NvwaX 现有 API Key 一致）

**预注册 Sprint 3-4 需要的 RP**：

| RP name | redirect_uris | scopes |
|---------|--------------|--------|
| `proclaw_desktop` | `http://127.0.0.1:*/callback` | `openid profile email` |
| `proclaw_web` | `https://app.proclaw.cc/auth/callback` | `openid profile email` |
| `skillhub_web` | `https://skillhub.proclaw.cc/auth/callback` | `openid profile email` |
| `nvwax_admin` | `https://nvwax.proclaw.cc/admin/callback` | `openid profile email admin` |

### 2.10 E2E 测试（2 d）

**目标**：Playwright 跑通完整链路。

**新建文件**：
- `D:\BigLionX\NvwaX\packages\nvwax-server\tests\e2e/oidc-flow.spec.ts`
  - 注册 → 收邮件 → 激活 → 登录 → 跳转回 RP
  - 跨子域 Cookie 验证（`pc_session` Domain=`.proclaw.cc`）
  - 找回密码流程
  - 登出流程（`pc_session` 被清除）

- `D:\BigLionX\NvwaX\packages\nvwax-server\tests/e2e/email-grep.spec.ts`
  - 注册邮件内容 grep "NvwaX" / "nvwx" 为空
  - 发件人是 `noreply@account.proclaw.cc` 或 "ProClaw 团队"

---

## 关键文件清单

### 新建

| 路径 | 用途 |
|------|------|
| `D:\BigLionX\NvwaX\packages\account-portal\package.json` | Next.js 14 包 |
| `D:\BigLionX\NvwaX\packages\account-portal\app\layout.tsx` | 全局布局 |
| `D:\BigLionX\NvwaX\packages\account-portal\app\login\page.tsx` | 登录页 |
| `D:\BigLionX\NvwaX\packages\account-portal\app\register\page.tsx` | 注册页 |
| `D:\BigLionX\NvwaX\packages\account-portal\app\forgot\page.tsx` | 找回密码 |
| `D:\BigLionX\NvwaX\packages\account-portal\app\reset\page.tsx` | 重置密码 |
| `D:\BigLionX\NvwaX\packages\account-portal\components\AuthForm.tsx` | 通用表单 |
| `D:\BigLionX\NvwaX\packages\account-portal\lib\api-client.ts` | 后端调用 |
| `D:\BigLionX\NvwaX\packages\nvwax-server\src\services\BrandedMailer.ts` | 白标邮件 |
| `D:\BigLionX\NvwaX\packages\nvwax-server\src\services\oauth\oidc-client.service.ts` | RP 客户端管理 |
| `D:\BigLionX\NvwaX\packages\nvwax-server\src\controllers\oidc-admin.controller.ts` | RP 管理 API |
| `D:\BigLionX\NvwaX\packages\nvwax-server\src\cli\add-rp.ts` | 注册 CLI |
| `D:\BigLionX\NvwaX\packages\nvwax-server\tests\e2e\oidc-flow.spec.ts` | E2E 测试 |
| `D:\BigLionX\NvwaX\packages\nvwax-server\tests\e2e\email-grep.spec.ts` | 邮件白标测试 |

### 修改

| 路径 | 改动 |
|------|------|
| `D:\BigLionX\NvwaX\pnpm-workspace.yaml` | 注册 account-portal 包 |
| `D:\BigLionX\NvwaX\packages\nvwax-server\src\controllers\oidc.controller.ts` | 接通前端表单 |
| `D:\BigLionX\NvwaX\packages\nvwax-server\src\app.ts` | 路由挂载 + CORS |
| `D:\BigLionX\NvwaX\docker-compose.yml` | account-portal 服务 |
| `D:\BigLionX\NvwaX\nginx\account.proclaw.cc.conf` | HTTPS 配置 |

---

## 验证方法

### 单元测试
```bash
cd D:\BigLionX\NvwaX
pnpm --filter nvwax-server test
# 期望：Sprint 1 已有 7 个用例 + Sprint 2 新增 5+ 用例
```

### E2E 测试
```bash
cd D:\BigLionX\NvwaX
pnpm --filter nvwax-server test:e2e
# 期望：oidc-flow.spec.ts + email-grep.spec.ts 全部通过
```

### DNS + 公网验证
```bash
# DNS 解析
nslookup account.proclaw.cc
# 期望：解析到正确 IP

# HTTPS 证书
curl -vI https://account.proclaw.cc/.well-known/openid-configuration 2>&1 | grep -i "SSL\|subject"
# 期望：Let's Encrypt 证书，subject CN=account.proclaw.cc

# 跨子域 Cookie
# 1. 浏览器访问 https://account.proclaw.cc/login
# 2. 登录成功
# 3. 开发者工具 → Application → Cookies → 查看 pc_session
# 期望：Domain = .proclaw.cc
```

### 白标验证
```bash
# 登录页 HTML
curl -s https://account.proclaw.cc/login | grep -i "nvwax\|nvwx"
# 期望：零结果

# 邮件内容（用真实邮箱注册触发）
# 检查邮件正文 + 发件人 + 主题，grep "NvwaX" / "nvwx" 为空
```

### 跨子域 SSO 准备验证
```bash
# 在 account.proclaw.cc 登录后
curl -I https://app.proclaw.cc/
# 期望：302 重定向到 https://account.proclaw.cc/oauth/authorize（说明 RP 端点工作）
# 注：Sprint 4 才真正实现 app.proclaw.cc 的 RP
# Sprint 2 只验证 IdP 端能识别 pc_session Cookie
```

---

## 完成标准（DoD）

- [ ] `dig account.proclaw.cc` 解析到正确 IP
- [ ] `https://account.proclaw.cc/.well-known/openid-configuration` 返回 200 + 完整 OIDC 元数据
- [ ] 浏览器访问 `https://account.proclaw.cc/login` — ProClaw Logo + 品牌色，**零 NvwaX 字样**
- [ ] 注册 → 收邮件 → 激活 → 登录 → 跳转回 RP（RP 可用 mock） 整链路 < 30s
- [ ] 登录后 `pc_session` Cookie Domain = `.proclaw.cc`
- [ ] 找回密码流程完整工作
- [ ] 邮件发件人 `ProClaw 团队 <noreply@account.proclaw.cc>`，正文 grep "NvwaX" 为空
- [ ] 4 个 RP 客户端已通过 CLI 注册（proclaw_desktop / proclaw_web / skillhub_web / nvwax_admin）
- [ ] E2E 测试 `oidc-flow.spec.ts` + `email-grep.spec.ts` 全部通过
- [ ] DNS SPF + DKIM + DMARC 全部就绪

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| Let's Encrypt 证书申请失败 | 用 acme.sh 脚本 + Cloudflare DNS 验证 + 提前 1 周申请 |
| 邮件进垃圾箱 | SPF + DKIM + DMARC 三件套就绪 + 预热 IP |
| `pc_session` 跨子域 Cookie 在 Safari ITP 下被拒 | **不依赖 Cookie 实现 SSO**，access_token 直接由 RP 缓存；SSO 作为增强 |
| `nvwax-portal` 与 NvwaX 现有登录耦合 | `BrandedMailer` 抽象 + 独立路由，**不修改** NvwaX 现有登录流程 |
| DNS 配置错误导致白屏 | 添加 health check：`curl https://account.proclaw.cc/.well-known/openid-configuration` 必须 200 |

---

## 跨 Sprint 协调点

### Sprint 1 沉淀（已确认）
- Sprint 1 接口契约冻结，Sprint 2 不允许变更
- 如需变更，须开 ADR-004 协议变更流程

### Sprint 2 末冻结
Sprint 2 末需冻结：
- ✅ `pc_session` Cookie 名称、Domain、属性（HttpOnly/Secure/SameSite）
- ✅ 4 个 RP 客户端的 `client_id`（ProClaw/skillhub Sprint 3-4 用）
- ✅ `noreply@account.proclaw.cc` 邮件白标规范

### Sprint 3 启动条件
- [ ] Sprint 2 DNS/SSL 上线 ✅
- [ ] `pc_session` Cookie 规范冻结 ✅
- [ ] `proclaw_desktop` RP 客户端的 `client_id` + `client_secret` 已知 ✅
- [ ] 公网可访问的 `account.proclaw.cc/oauth/authorize` + `/token` 端点 ✅

---

## 下一步

1. **本周内**（Day 1）：DNS 申请 + 邮件服务开通（不等开发）
2. **Day 2-3**：`account-portal` 脚手架 + 登录页 UI
3. **Day 4-5**：注册页 + 找回密码页 UI
4. **Day 6-7**：后端接通前端表单
5. **Day 8-9**：跨域 SSO Cookie + RP 客户端 CLI
6. **Day 10-12**：E2E 测试 + 修复
7. **Day 13-15**：白标审计 + 邮件测试 + 文档收尾

**Sprint 2 末解锁 Sprint 3**：ProClaw 桌面端可以开始接入 tauri-plugin-oauth。
