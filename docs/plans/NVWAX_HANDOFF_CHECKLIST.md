# NvwaX 交付检查清单 + ProClaw 并行预研指南

## Context

用户问两个问题：
1. **ProClaw 需不需要等 NvwaX 部署好？**
2. **给 NvwaX 什么提示词来证明"OK"？**

### 核心答案

| 问题 | 答案 |
|------|------|
| ProClaw 要等 NvwaX 全部完成吗？ | **不需要**。Sprint 2 期间 ProClaw 可以做 Sprint 3 的预研与脚手架（零阻塞） |
| NvwaX 证明"OK"的最低标准是什么？ | `account.proclaw.cc` 公网可访问 + 4 个 RP 客户端已注册 + 白标登录页可工作 |

---

## 一、ProClaw 需不需要等 NvwaX？

### 不需要等的部分（ProClaw 可并行做）

Sprint 2 期间（约 3 周），ProClaw 仓库内可推进的工作（不依赖 NvwaX 公网部署）：

| 工作 | 工期 | 文件位置 |
|------|------|---------|
| **Sprint 3 预研**：tauri-plugin-oauth PoC | 0.5 d | `D:\BigLionX\ProClaw\src-tauri` |
| **Sprint 3 预研**：决定 `openid-client` vs `tauri-plugin-oauth` | 0.5 d | ADR-003 |
| **Sprint 3 脚手架**：Cargo.toml 加 `tauri-plugin-oauth = "2"` 依赖 | 0.5 d | `D:\BigLionX\ProClaw\src-tauri\Cargo.toml` |
| **Sprint 3 脚手架**：capabilities 加 `oauth:default` | 0.5 d | `D:\BigLionX\ProClaw\src-tauri\capabilities\default.json` |
| **Sprint 3 文档**：ADR-003 `tauri-oauth-implementation.md` | 0.5 d | `D:\BigLionX\ProClaw\docs\adr\` |
| **Sprint 4 预研**：cloud-store 现有登录机制 | 1 d | `D:\BigLionX\ProClaw\cloud-store\` |
| **Sprint 4 预研**：skillhub NextAuth 现状 | 0.5 d | 跨仓库 |
| **E2E 测试桩**：ProClaw 端跨域 OAuth 测试桩 | 1 d | `D:\BigLionX\ProClaw\e2e\` |

**累计可并行工作**：5-7 天

### 必须等的部分（NvwaX 部署完成才能做）

| 工作 | 阻塞条件 |
|------|---------|
| Sprint 3.3 实现 `oauth_client.rs` | 需要 `account.proclaw.cc/oauth/authorize` 公网可访问 |
| Sprint 3.4 实现 `verify_id_token` | 需要拉取 NvwaX JWKS 公钥 |
| Sprint 3.5 前端 `oidc-client.ts` | 需要 `proclaw_desktop` RP 客户端的 `client_id` |
| Sprint 3.7 `authStore.ts` 改造 | 需要 IdP 端点地址确定 |

**Sprint 3 启动条件**（全部来自 NvwaX 交付）：
- [x] Sprint 1：6 个 OIDC 端点工作
- [ ] Sprint 2：`account.proclaw.cc` 公网 + 4 个 RP 客户端注册
- [ ] Sprint 2：`pc_session` Cookie 规范冻结
- [ ] Sprint 2：白标登录页可工作（用于 OAuth 跳转落地页）

---

## 二、NvwaX 证明"OK"的提示词模板

请把以下内容直接发给 NvwaX 团队：

```
请在 NvwaX 仓库完成 Sprint 2 任务后，提供以下证明材料。

## ✅ 必须完成项（缺失任意一项 = 未完成）

### A. 公网可访问性
1. `dig account.proclaw.cc` 解析到正确 IP（提供输出截图）
2. `curl -I https://account.proclaw.cc/.well-known/openid-configuration` 返回 200
3. Let's Encrypt 证书生效，浏览器无安全警告（提供截图）

### B. 白标登录页
4. 浏览器访问 `https://account.proclaw.cc/login` 显示 ProClaw Logo
5. `curl -s https://account.proclaw.cc/login | grep -i "nvwax\|nvwx"` 返回空
6. 注册 → 收邮件 → 激活 → 登录 整链路 < 30s（提供录屏或日志）
7. 邮件发件人是 `noreply@account.proclaw.cc` 或 "ProClaw 团队"
8. 邮件正文 grep "NvwaX" / "nvwx" 返回空

### C. Cookie 与 SSO 准备
9. 登录后浏览器开发者工具可见 `pc_session` Cookie，Domain=`.proclaw.cc`
10. `pc_session` 属性：HttpOnly + Secure + SameSite=Lax

### D. 4 个 RP 客户端已注册
11. 提交以下表格（client_id 已生成）：

| client_id | redirect_uris | scopes | client_secret 状态 |
|-----------|--------------|--------|-------------------|
| proclaw_desktop | http://127.0.0.1:*/callback | openid profile email | 已生成（**请安全传给 ProClaw 团队**） |
| proclaw_web | https://app.proclaw.cc/auth/callback | openid profile email | 已生成 |
| skillhub_web | https://skillhub.proclaw.cc/auth/callback | openid profile email | 已生成 |
| nvwax_admin | https://nvwax.proclaw.cc/admin/callback | openid profile email admin | 已生成 |

12. RP 注册 CLI 命令输出示例：`pnpm add-rp --name proclaw_desktop --redirect "http://127.0.0.1:*/callback"`

### E. 协议契约（Sprint 1 冻结，**禁止破坏**）
13. 6 个端点 URL 与 Sprint 1 一致
14. 6 个错误码响应格式与 Sprint 1 一致
15. id_token 8 字段、access_token 6 字段形状不变
16. iss claim = `https://account.proclaw.cc`

### F. 测试通过
17. `pnpm --filter nvwax-server test` 全部绿
18. `pnpm --filter nvwax-server test:e2e` 全部绿
19. 新增 E2E：`oidc-flow.spec.ts` + `email-grep.spec.ts`

## 📦 交付物清单

请在 Sprint 2 末提交以下文件：

- [ ] `docs/MULTI_PROJECT_INTEGRATION_SPEC.md` 附录 A 协议示例（**如果有更新**）
- [ ] `docs/SPRINT_2_RELEASE_NOTES.md` — Sprint 2 发布说明
- [ ] `docs/adr/004-account-proclaw-cc-domain.md` — 域名/部署决策记录
- [ ] `packages/account-portal/` 完整代码
- [ ] `packages/nvwax-server/src/services/BrandedMailer.ts`
- [ ] `packages/nvwax-server/src/services/oauth/oidc-client.service.ts`
- [ ] `packages/nvwax-server/src/controllers/oidc-admin.controller.ts`
- [ ] `nginx/account.proclaw.cc.conf` HTTPS 配置
- [ ] `docker-compose.yml` account-portal service
- [ ] 4 个 RP 客户端的 `client_id` + `client_secret`（**安全传输**）

## 🔐 安全传输凭证

client_secret 请通过以下方式之一传递（**不要**在 Git 提交）：
- 1Password / Bitwarden 共享保险库
- 加密邮件（PGP）
- 内部 Slack 私密频道 + 自动阅后即焚
- 飞书 / 钉钉加密消息

## ⚠️ 暂未完成项

如以下项目延期，请明确标注，便于 ProClaw 团队调整 Sprint 3 计划：

- [ ] DNS 申请（Cloudflare / 阿里云 DNS）
- [ ] 邮件服务（SendGrid / SES）开通
- [ ] SSL 证书（Let's Encrypt）申请
- [ ] 4 个 RP 客户端全部注册
- [ ] E2E 测试 100% 通过
```

---

## 三、ProClaw 端并行工作清单（Sprint 2 期间可做）

Sprint 2 期间 ProClaw 团队可推进的 **0 阻塞** 预研工作：

### Day 1-2：Sprint 3 脚手架与 ADR

**新建**：`D:\BigLionX\ProClaw\docs\adr\003-tauri-oauth-implementation.md`
- 选型对比：`tauri-plugin-oauth` (Rust 启 server) vs `openid-client` (纯 JS)
- 决定：用 `tauri-plugin-oauth`（Rust 启 loopback server），前端用 `oidc-client-ts` 接收 code
- 理由：Windows 兼容性，安全性（PKCE 私钥不离开 Rust 进程）

**修改**：`D:\BigLionX\ProClaw\src-tauri\Cargo.toml`
- 新增 `tauri-plugin-oauth = "2"` 依赖
- 验证 `cargo build` 通过

**修改**：`D:\BigLionX\ProClaw\src-tauri\capabilities\default.json`
- 新增 `"oauth:default"` 权限
- 新增 `"shell:allow-open"` 权限（系统浏览器打开）

### Day 3-4：Sprint 4 预研

- 调研 `cloud-store/` 现有登录机制
- 调研 `skillhub/apps/web/middleware.ts` NextAuth 配置
- 输出预研笔记：`docs/adr/005-cloud-store-oidc-migration.md`

### Day 5-7：测试桩 + 文档

- 编写 ProClaw 端 OAuth 流程测试桩
- 更新 `docs/MULTI_PROJECT_INTEGRATION_SPEC.md` 附录 A（如有调整）
- 整理 Sprint 3 任务列表

### 关键决策（Day 7 末）

如果 NvwaX 在 Day 7 末仍未完成 Sprint 2，ProClaw 团队决策：

| 选项 | 适用条件 |
|------|---------|
| 继续 Sprint 3 预研，做 `authStore.ts` mock 改造 | NvwaX 延期 < 1 周 |
| 暂停 ProClaw Sprint 3 启动，启动 Sprint 5 预研 | NvwaX 延期 > 1 周 |
| ProClaw 桌面端先实现"开发模式"降级（VITE_ENABLE_DEV_LOGIN=true） | NvwaX 延期 > 2 周 |

---

## 四、握手协议

### NvwaX → ProClaw 交接材料包

| 材料 | 形式 | 用途 |
|------|------|------|
| 4 个 RP `client_id` | 安全通道 | Sprint 3 配置 `tauri.conf.json` |
| 4 个 RP `client_secret` | 安全通道 | Sprint 3 后端调用 |
| `account.proclaw.cc` 公网截图 | 截图 | 验证 DNS/SSL |
| E2E 测试报告 | 文档 | 确认 IdP 工作 |
| `pc_session` Cookie 规范 | 文档 | Sprint 4 跨子域 SSO 实施 |
| 邮件白标规范 | 文档 + 邮件样本 | 验证 ProClaw 品牌 |

### ProClaw 收到材料包后

1. **立即验证**：用 4 个 client_id 跑一次完整 OAuth 流程
2. **24 小时内反馈**：哪些 RP 配置正确 / 哪些需要调整
3. **Sprint 3 启动**：满足启动条件后立即开始执行

---

## 五、时间线对照

```
Week 1-2 (NvwaX Sprint 1)         ── 接口冻结 ── [Sprint 1 完成]
Week 1-3 (NvwaX Sprint 2)  ║
                             ║  ProClaw 预研: ADR-003 + Cargo + Sprint 4 调研
Week 3 末                    ║  NvwaX 交付
                             ▼
Week 4-6 (ProClaw Sprint 3) ── tauri-plugin-oauth 集成
Week 7-9 (ProClaw Sprint 4) ── cloud-store + skillhub
Week 10-12 (ProClaw Sprint 5) ── 插件联动 + 治理
```

---

## 六、Sprint 2 末交付检查清单（ProClaw 团队核对）

当 NvwaX 团队报告"Sprint 2 完成"时，ProClaw 团队按本清单核对：

- [ ] `dig account.proclaw.cc` 解析正确
- [ ] `https://account.proclaw.cc/.well-known/openid-configuration` 返回 200
- [ ] 浏览器访问 `https://account.proclaw.cc/login` 显示 ProClaw Logo
- [ ] 登录页 HTML grep "NvwaX" 为空
- [ ] 注册 → 收邮件 → 激活 → 登录 链路完整
- [ ] `pc_session` Cookie Domain=`.proclaw.cc`
- [ ] 4 个 RP 客户端 client_id 全部收到
- [ ] client_secret 通过安全通道收到（**未通过 Git 提交**）
- [ ] E2E 测试 100% 通过
- [ ] NvwaX 团队提供 ADR-004（如有协议变更）

**全部勾选 ✅ = Sprint 3 启动**

---

## 七、模板文件

`D:\BigLionX\ProClaw\docs\plans\NVWAX_HANDOFF_CHECKLIST.md`（本文件）

适用场景：
- 给 NvwaX 团队的交付证明提示词（第二节）
- ProClaw 团队的核对清单（第六节）
- 跨团队握手协议（第四节）
