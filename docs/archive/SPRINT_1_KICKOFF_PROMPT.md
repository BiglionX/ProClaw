# Sprint 1 启动提示词模板

## 用户切到 NvwaX 目录后，复用以下提示词启动

---

## 提示词（直接复制粘贴即可）

```
我在 D:\BigLionX\ProClaw 仓库已规划好 Sprint 1 工作：
- 规范文档：docs/MULTI_PROJECT_INTEGRATION_SPEC.md
- 完整计划：docs/plans/MULTI_PROJECT_INTEGRATION_DEV_PLAN.md

现在我已在 NvwaX 仓库（D:\BigLionX\NvwaX）准备执行 Sprint 1，目标是：
**在 NvwaX 内搭建 OIDC IdP 骨架，让 /oauth/* 和 /.well-known/* 端点可工作，
5 步流程（authorize → token → userinfo → refresh → logout）能 curl 走通。**

具体任务清单（Sprint 1，2 周，10 工作日）：
1.1 在 ProClaw 文档追加协议附录 A（1d）
1.2 数据库迁移：oidc_clients / oidc_authorization_codes / oidc_refresh_tokens（1d）
1.3 PKCE 工具函数 pkce.util.ts（1d）
1.4 JWT 签发服务 oidc-token.service.ts（RS256 + JWKS）（2d）
1.5 OIDC 端点 oidc.controller.ts（authorize/token/userinfo/refresh/logout/discovery/jwks）（3d）
1.6 Docker 本地 stub（account.proclaw.cc.conf + docker-compose 调整）（1d）
1.7 单元测试 7 个用例（PKCE/code 一次性/JWT 签名/JWKS/refresh 轮换/scope 校验）（1d）

约束：
- 不合并三个仓库
- 保持 NvwaX 现有 CORS、白标、邮件基础设施
- CORS 白名单需加 account.proclaw.cc
- 私钥通过 OIDC_PRIVATE_KEY_PATH 环境变量注入，K8s Secret 存储，不入仓库
- 冻结接口：Sprint 1 末 OIDC 端点 URL 与 schema 不再变更

请按 1.1 → 1.7 顺序执行。开始前先：
1. 确认 NvwaX 现有 JWT 库依赖（jsonwebtoken / jose / node-jose）
2. 查看现有 user-auth.controller.ts / social-auth.controller.ts 复用点
3. 确认数据库迁移文件命名风格（0xx_xxx.sql vs timestamp_xxx.sql）

完成后跑 `pnpm --filter nvwax-server test` 验证 7 个用例通过，
并提供 curl 5 步流程的执行结果。
```

---

## 💡 配套可选项（按需追加）

### 选项 A：要求探索 NvwaX 现状
```
执行任务前，先调研：
- packages/nvwax-server/src/services/oauth/ 现有结构
- packages/nvwax-server/src/controllers/user-auth.controller.ts 与 social-auth.controller.ts 现有实现
- packages/nvwax-server/prisma/schema.prisma 当前数据模型
- 现有迁移文件命名风格（参考 packages/nvwax-server/src/migrations/ 目录）

将发现写为 README 同步给我。
```

### 选项 B：要求渐进式提交
```
每个任务完成一个就 git commit，commit message 格式：
feat(oidc): [Sprint1/1.x] 任务简述

例如：
- feat(oidc): [Sprint1/1.1] 协议附录 A 文档化
- feat(oidc): [Sprint1/1.2] 数据库三表迁移
- feat(oidc): [Sprint1/1.3] PKCE 工具函数
```

### 选项 C：要求严格测试驱动
```
按 TDD 顺序：每个任务先写测试用例，再写实现。
测试文件：
- packages/nvwax-server/__tests__/services/oauth/pkce.util.test.ts
- packages/nvwax-server/__tests__/services/oauth/oidc-token.service.test.ts
- packages/nvwax-server/__tests__/controllers/oidc.controller.test.ts
- packages/nvwax-server/__tests__/integration/oidc-flow.test.ts
```

---

## 📋 提示词使用建议

1. **必填基础提示词** + **至少一个选项**（A/B/C 三选一）
2. 切换到 NvwaX 目录后，先 `git status` 确认干净的工作区
3. 退出 IDE 的 Plan 模式（点击 Exit Plan Mode 按钮）
4. 粘贴提示词，AI 会先做调研再动手

### 推荐组合
> **基础提示词 + 选项 A**（先调研现状再动手，最稳）
> 适合第一次进入新仓库，避免对 NvwaX 现状做错假设

### 快速组合
> **基础提示词 + 选项 C**（TDD 模式）
> 适合对项目熟悉、追求高质量代码的团队

### 极简组合
> **仅基础提示词**
> 适合信任 AI 自动判断节奏的情况

---

## ⚠️ 不要在提示词中包含的内容

- ❌ 详细代码示例（让 AI 自己设计）
- ❌ 文件路径大全（仅给目标，AI 自己定位）
- ❌ 重复说明"为什么做"（背景已在规范文档里）
- ❌ 任何"快点"或催促性语言

清晰、克制、信息密度高，是好提示词的核心。
