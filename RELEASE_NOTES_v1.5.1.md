# ProClaw v1.5.1 — NvWaX 模板市场反向发布详情页

> **发布日期**: 2026-XX-XX
> **代号**: DetailMosaic
> **前序版本**: v1.5.0
> **配套**: NvWaX Web marketplace（独立仓库 D:\BigLionX\NvwaX）

v1.5.0 把 Sprint 2.16 核心收尾（撤销按钮 + 真 SSE 流式 + 反向发布按钮）一气呵成，但 **NvWaX Web 端的 marketplace 详情页依然缺失**——发布按钮已就位，用户点完却无处查看。
v1.5.1 跨仓库把这个缺口补上：4 个详情页 + 1 个 Web Component 详情视图 + 后端字段补全 + ProClaw 深链。

---

## 🎯 一句话总结

**模板市场反向发布现在有完整详情页** — ProClaw 用户发布团队后，NvWaX Web 用户可在 `/[locale]/marketplace` 浏览 → 进入详情 → 安装。

---

## 🆕 v1.5.1 四大新增

### 1️⃣ NvWaX Web marketplace 详情页（4 个页面）

**问题**：v1.5.0 反向发布按钮已上线，但 NvWaX 端 marketplace 只暴露了后端 API（`/api/v1/marketplace/*`），前端**没有详情页 UI**，列表也仅是嵌入 Web Component 的占位页。

**新增页面**（D:\BigLionX\NvwaX\packages\nvwax-web\app\[locale]\marketplace\）：
| 路径 | 用途 |
|------|------|
| `page.tsx` | marketplace 列表首页（嵌入 `<nvwax-agent-marketplace>` Web Component + tab 切换） |
| `agents/[id]/page.tsx` | Agent 详情（description / tags / rating / author / install 按钮） |
| `aiteams/[id]/page.tsx` | AiTeam 详情（members 列表 / install 团队 / skills 摘要） |
| `plugins/[id]/page.tsx` | Industry Plugin 详情 |

**i18n**：在 `messages/en.json` + `messages/zh.json` 加 `marketplace.*` 命名空间。

### 2️⃣ NvWaX marketplace Web Component 详情视图

**新增** `<nvwax-agent-marketplace-detail agent-id="...">` Web Component（v1.5.1 @ `@nvwax/agent-marketplace@1.1.0`）：
- 拉 `GET /api/v1/marketplace/agents/:id`
- 渲染详情视图（description / tags / author / rating / install 按钮）
- 列表卡片点击触发新 `agent-detail` 事件（让宿主应用跳转 `/marketplace/agents/[id]`）

### 3️⃣ 后端详情端点字段补全

修改 `marketplace.controller.ts`：

| 端点 | 新增字段 |
|------|----------|
| `GET /api/v1/marketplace/agents/:id` | `author` / `usageCount` / `relatedAgents` |
| `GET /api/v1/marketplace/aiteams/:id` | `author` / `agents` / `memberCount` / `skillCount` / `relatedTeams` |
| `GET /api/v1/marketplace/plugins/:id` | `author` / `usageCount` |
| `GET /api/v1/marketplace/agents/:id/reviews`（**新增**） | 评论分页（agent_reviews 表不存在时返回空数组） |

**容错**：用 try/catch 包裹每个补充查询，单个失败不影响主返回。

### 4️⃣ ProClaw 发布成功 toast 深链

ProClaw Companies 页发布成功后，toast 加深链（`https://nvwax.proclaw.cc/zh-CN/marketplace/aiteams/<id>`），并通过 `setTimeout + window.confirm` 弹原生确认让用户选择是否立即打开详情页。

---

## 📊 累计（v1.3.2 → v1.5.1）

| 维度 | v1.3.2 | v1.4.1 | v1.5.0 | **v1.5.1** |
|------|--------|--------|--------|------------|
| Tauri 命令（虚拟公司） | 8 | 11 | 14 | **14** |
| 端到端流式 SSE | ❌ | ⚠️ 单事件 | ✅ 真流 | ✅ 真流 |
| Agent 内容推送 | ❌ | ❌ | ✅ | ✅ |
| 启停状态可撤销 | ❌ | ❌ | ✅ | ✅ |
| 模板市场反向发布 | ❌ | ✅ | ✅ | ✅ |
| **后端详情端点字段丰富度** | — | 基础 | 基础 | **+ author / relatedAgents / usageCount** |
| **NvWaX marketplace 详情页** | ❌ | ❌ | ❌ | **✅（4 页 + 1 Web Component 详情视图）** |
| **Reviews 端点** | ❌ | ❌ | ❌ | **✅（预留表不存在时返回空）** |
| 测试（Rust + TS + Jest） | 67 | 75 | 83 | **86**（+ 3 个 marketplace 后端测试文件） |

---

## 🧪 验证步骤

### 自动化测试

```bash
# NvWaX 后端
cd D:\BigLionX\NvwaX\packages\nvwax-server
npx jest __tests__/marketplace/
# → 3 文件全绿

# NvWaX Web TypeScript
cd D:\BigLionX\NvwaX\packages\nvwax-web
npx tsc --noEmit
# → exit 0

# Marketplace Web Component
cd D:\BigLionX\NvwaX\packages\nvwax-agent-marketplace
npx tsc --noEmit -p tsconfig.json
# → exit 0

# ProClaw TypeScript
cd D:\BigLionX\ProClaw
npx tsc --noEmit -p tsconfig.json
# → exit 0
```

### 跨端集成验证（手动）

1. 启动 NvWaX Web（`pnpm --filter nvwax-web dev`）
2. 访问 http://localhost:3000/zh-CN/marketplace
3. 看到列表 tab + 提示需 API key
4. 访问 http://localhost:3000/zh-CN/marketplace/agents/<existing-agent-id>
5. 看到详情页 + Install 按钮

### ProClaw 集成验证

1. 启动 ProClaw 桌面端
2. Companies 页点击「📤 发布到 NvWaX 市场」
3. 发布成功后 toast 显示「📋 查看详情」按钮
4. 点击跳转 NvWaX marketplace 详情页

---

## 📦 升级指南

### 从 v1.5.0 升级

```bash
# ProClaw
cd ProClaw
git pull origin main
npm install
npm run tauri build

# NvWaX
cd NvwaX
pnpm install
pnpm --filter @nvwax/agent-marketplace build   # 新版本 1.1.0
pnpm --filter nvwax-web build
pnpm --filter nvwax-server dev
```

无破坏性 API 改动。

---

## 🐛 剩余的非目标

- 端到端 e2e Playwright 套件（完整覆盖 wizard / Companies / 撤销 / marketplace 流程）— 计划 v1.5.2
- 多设备冲突 UI 撤销按钮（CRDT 风格字段级合并）— 计划 v1.5.2
- agent_reviews 评论表 schema（当前端点返回空，等数据迁移）— 计划 v1.6.0

---

## 🙏 致谢

v1.5.1 由 ProClaw + NvWaX 团队联合交付：
- NvWaX 端：4 个详情页 + 1 个 Web Component 详情视图 + 后端字段扩展
- ProClaw 端：发布成功 toast 深链