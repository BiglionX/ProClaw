[![Latest Release](https://img.shields.io/github/v/release/BiglionX/ProClaw?include_prereleases)](https://github.com/BiglionX/ProClaw/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/BiglionX/ProClaw/total)](https://github.com/BiglionX/ProClaw/releases)
[![CI Status](https://img.shields.io/github/actions/workflow/status/BiglionX/ProClaw/ci.yml?branch=main&label=CI)](https://github.com/BiglionX/ProClaw/actions/workflows/ci.yml)
[![Hermes Fast Feedback](https://img.shields.io/badge/Hermes-Fast%20Feedback-blueviolet)](docs/plans/hermes_ci_setup.md)
# 🦞 ProClaw

> 开源AI驱动的商户经营操作系统 | Open-Source AI-Powered Business OS

[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/BiglionX/ProClaw/releases)
[![Tauri](https://img.shields.io/badge/Tauri-2.11-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Stars](https://img.shields.io/github/stars/BiglionX/ProClaw?style=social)](https://github.com/BiglionX/ProClaw)

> **🎉 v1.5.1 已发布！跨仓库交付：NvWaX Web marketplace 详情页 + 后端字段补全（author / usageCount / relatedAgents）+ ProClaw 发布成功 toast 深链。详见 [RELEASE_NOTES_v1.5.1.md](RELEASE_NOTES_v1.5.1.md)。**

## 🎯 项目定位

ProClaw 是一个**开源的AI驱动商户经营操作系统**，采用桌面应用架构（Tauri + React），为中小商户提供智能化的业务管理解决方案。支持双模式运行（ProClaw Plus / ProClaw Light），并配备移动端 App、云托管商城、AI 经营团队、行业插件等完整生态。

**核心特点**：
- 🤖 **AI 经营团队** - 25+ 专业 Agent 协同工作，自然语言交互
- 🏢 **双模式架构** - ProClaw Plus / ProClaw Light（含 CEO Agent 主控官）
- 🏭 **行业插件** - 餐饮（POS/桌台/KDS）、美业（预约/服务/员工/营销）、宠物（档案/寄养/美容�?
- 💾 **本地优先** - 数据本地存储（SQLCipher 加密），完全自主可控
- ☁️ **云托管可�?* - 支持 Supabase 云端同步、Token 计费、债务保护
- 🔌 **全栈生�?* - 桌面�?+ 移动�?App + 云托管商�?+ 营销站点
- 🔑 **Token管理** - API密钥管理、用量统计、成本控制、月度账
- 🌐 **NvWaX 虚拟公司闭环**（v1.3.2 新增） - 与 [NvWaX](https://nvwax.proclaw.cc) 云端协同：在 NvWaX 用对话式 AI 设计虚拟公司 → 一键导出 `.nvwax-vc.json` → 在 ProClaw 桌面端本地运行整个 AI 团队。详见 [集成 NvWaX 虚拟公司](#-集成-nvwax-虚拟公司-sprint-213215)�?

## �?核心功能

### 1. AI 经营智能�?
- **AI 经营团队**：内�?7 个专�?Agent（库存管理、销售预测、数据分析、采购管理、财务管理、客户服务、AI 智能找图�?
- **Agent 生�?(25+ Bundles)**：CRM、文档生成、HR、任务管理、内容生成、转化优化、SEO、社交媒体运营（CN/US/SEA）等
- **CEO Agent 主控官系�?(PRD v6.2/v6.3)**�?
  - 项目上下文协�?(PCP)：愿�?目标/约束/里程�?决策管理
  - 任务分派与跟踪：自动分配任务给子 Agent，实时追踪状�?
  - 决策确认机制：审�?驳回/编辑决策日志，个性化偏好学习
  - 快捷命令�?task list�?context show�?report
- 自然语言查询�?帮我看看上周哪些商品卖得最�?
- 财务 Agent：账户管理、预算控制、发票管理、交易记录、报表生�?
- Dify 工作流引擎集�/ LangChain 多提供商支持
- Token 用量监控和成本控�?

### 2. 进销存管�?
- **产品库管�?*：简单模�?+ SPU-SKU 电商模式，分类与品牌管理
- **供应商管�?*：供应商 CRUD、自动编码生�?
- **采购订单管理**：采购单创建/审核/收货全流�?
- **销售订单管�?*：销售单创建/出库，客户管�?
- **实时库存跟踪**：库存变动记录，安全库存预警
- **智能补货建议**：基于销售数据和库存水平的自动补货推�?
- **多维度报表分�?*：销售趋势、利润分析、库存周�?

### 3. 用户与权限系�?
- 注册/登录/权限控制（支持演示模式）
- 多租户支�?
- 角色权限管理（店�?仓管/财务/采购/销�?客服�?
- **员工邀请与角色分配 (PRD v4.3)**
- **外部伙伴邀请与自动关联 (PRD v4.2)**
- **用户中心 (PRD v5.1)**：个人资料、订阅管理、操作日�?

### 4. 安装向导 (CEO Agent 对话式配�?
- CEO Agent 对话引导安装流程
- 安装路径选择（含磁盘空间检测）
- 公司名称注册
- AI 模型配置（ProCloud / 本地模型�?
- 安装完成自动进入工作�?

### 5. 设备配对与通信
- **桌面-移动端设备配�?*：二维码扫码配对
- **语音/视频通话**：基�?WebRTC 的实时通话
- **消息系统**：联系人管理、实时消息、通话记录

### 6. 云托管商�?(CloudStore)
- AI 生成的独立电商站点（Next.js 16 + React 19�?
- 商城主题自定义（颜色/布局/字体/Logo/Banner�?
- 商品同步管理（从本地产品库同步）
- 订单管理、优惠券管理、商品评价管�?
- 购物车、结算、支付集�?
- 多套餐订阅（免费/基础/专业�?
- 独立子域�?+ 自定义域�?

### 7. Agent 生态（ProClaw Light 版）
- **Agent 管理**：创�?编辑/删除/导入/导出 Agent
- **Agent 市场**：浏�?安装/发布 Agent 到市�?
- **Agent 沙箱**：安全隔离运行环�?
- **Agent 安全**：权限控制和安全策略
- **Agent �?*：ZIP 打包分发机制

### 8. 行业插件系统（Phase 4�?
- **🍽�?餐饮行业**：POS 收银、桌台管理、厨房显示系�?(KDS)、菜单管�?
- **💇 美业行业**：预约管理、服务项目、员工管理、营销活动
- **🐾 宠物行业**：宠物档案、寄养管理、美容服�?
- **☁️ Cloud �?*：Token 计费、债务保护、月度账单、云端备�?
- **👥 会员管理**：跨行业通用会员体系

### 9. 运营与营销生�?
- **运营中心**：统一运营看板、数据监�?
- **营销网站 (PRD v7.0/v7.1)**：品牌落地页、用户引导�?0+ 管理后台页面
- **AI 知识�?*：三库合一（媒体库 + 问答�?+ 资料库），FAQ 自动采集
- **网站运营 AI Team**：SEO 优化、内容生成、社媒运营（中国/美国/东南亚）

### 10. Light 极简�?(ProClaw-Light)
- 专注核心进销存功能，轻量级商户管�?
- 简化的导航和页面布局
- 安装向导引导式配�?
- 适合单一门店、个体商户快速上�?

## 🌐 集成 NvWaX 虚拟公司 (Sprint 2.13–2.15)

> **状态**: v1.5.1 已发布 ✅（Sprint 2.18 收尾 3 项：撤销 + 真 SSE + 反向发布；v1.5.1 补 marketplace 详情页）
> **关联 PRDs**: [`PROCLAW-NVWAX-API-INTEGRATION-REQUIREMENT`](docs/prd/architecture/PROCLAW-NVWAX-API-INTEGRATION-REQUIREMENT.md) · [`MULTI_PROJECT_INTEGRATION_SPEC`](docs/MULTI_PROJECT_INTEGRATION_SPEC.md)
> **开发者文档**: [`docs/integration/NVWAX_INTEGRATION.md`](docs/integration/NVWAX_INTEGRATION.md) · [`docs/integration/virtual-company-package.schema.json`](docs/integration/virtual-company-package.schema.json)

自 v1.3.2 起，ProClaw 与 [NvWaX](https://nvwax.proclaw.cc) 形成完整的"虚拟公司"双向闭环。

### 11.1 闭环全景

```
┌─────────────────────────┐                  ┌──────────────────────────┐
│  NvWaX Cloud (Web)        │   HTTP / JWT    │  ProClaw Desktop (Tauri)  │
│  · 对话式创建虚拟公司      │ ◄─────────────► │  · virtual-company 插件   │
│  · AI 自动匹配 Agent       │                  │  · 本地 SQLite 持久化     │
│  · 一键导出 .nvwax-vc.json │                  │  · Hermes Skill 触发     │
│  · 多设备 local_state 同步  │                  │  · 多设备 LWW 合并        │
└─────────────────────────┘                  └──────────────────────────┘
```

### 11.2 用户体验

- **CEO Agent 智能触发**：在 CEO Agent 对话中输入"帮我开一家咖啡店的虚拟公司" → 自动加载 `sk_preset_open_virtual_company_wizard` Skill → 跳转到 `虚拟公司 → 创建向导`
- **本地 SSE 对话**：`/vc/wizard` 页面直接与 NvWaX SSE 流交互，5-10 分钟完成需求沟通
- **一键导入**：NvWaX 完成设计后，前端 `aiteam-creator-modal` 自动下载 `.nvwax-vc.json` + 显示完整下载链接；用户在 ProClaw 粘贴即可导入
- **本地状态回写**：在 ProClaw 启用/停用某个 Agent → 点击"☁️ 同步状态到 NvWaX" → NvWaX 记录 `aiteam_creation_sessions.local_state`
- **多设备同步**：MacBook 上启用的 Agent，自动同步到 Windows 桌面端；last-write-wins 字段级合并避免误覆盖

### 11.3 三 Sprint 里程碑

| Sprint | 主题 | 关键交付 | 状态 |
|--------|------|----------|------|
| **2.13** | 最小闭环 | `VirtualCompanyPackage` JSON Schema v1.0.0 · `nvwax_search_vc_templates` · `nvwax_import_virtual_company_from_url` · 4 个内置 React 路由（`/vc/{templates,wizard,import,companies}`） | ✅ |
| **2.14** | 4 项增强 | `sk_preset_open_virtual_company_wizard` · `open_virtual_company_page` Tauri 命令 · `PUT /sessions/:id/local-state` 回写 API · `nvwax_stream_session` SSE 代理 · `NVWAX_INTEGRATION.md` 220 行开发者指南 | ✅ |
| **2.15** | 多设备同步 | `mergeAgentState` + `reconcileSync` 纯函数合并引擎（字段级 LWW）· `nvwax_fetch_local_state` + `nvwax_list_sessions_with_state` · App 启动 5 秒后台同步 · Companies 页"🔄 立即同步"按钮 + 报告卡片 | ✅ |
| **v1.4.0 / 2.16** | **持久化 + 真实 SSE + 模板市场** | `virtual_company_agents` 表加 4 列（enabled / alias / owner_role / local_modified_at）· `nvwax_set_agent_local_state` 字段级独立 UPDATE · `nvwax_stream_session_v2` 用 `reqwest::bytes_stream()` 真 SSE · `nvwax_publish_to_marketplace` 一键发布到 NvWaX 市场 · Companies 页 "📤 发布到 NvWaX 市场" 按钮 | ✅ |
| **v1.4.1 / 2.17** | **真实 SSE 收尾** | ProClaw `nvwax_stream_session_v2` 升级：按 `event:` 字段路由 6 种事件类型（progress / agent_message / step / status / complete / error），端到端打通 wizard 流式显示 NvWaX CEO Agent 回复；NvWaX 端 `sse-progress.service` 新增 `broadcastAgentMessage()` + `broadcastComplete()` | ✅ |

### 11.4 数据交换契约

所有跨端数据交换遵循单一 Schema：

- **文件位置**：[`ProClaw/docs/integration/virtual-company-package.schema.json`](docs/integration/virtual-company-package.schema.json) · 镜像：[`NvwaX/packages/nvwax-server/src/schemas/virtual-company-package.schema.json`](https://github.com/BiglionX/NvwaX)
- **当前版本**：`1.0.0`（主版本不一致即拒绝导入，跨版本升级走 ADR）
- **必填字段**：`schemaVersion` / `packageId` / `exportedAt` / `source.platform === "nvwax"` / `team.id` / `team.name` / `agents[]`
- **可选字段**：`checksum`（SHA-256）· `skills[]` · `metadata`

### 11.5 完整 Tauri 命令清单（Sprint 2.13 + 2.14 + 2.15 + **v1.4.0 Sprint 2.16 + v1.4.1 Sprint 2.17**）

| 命令 | 用途 | 引入版本 |
|------|------|----------|
| `nvwax_search_vc_templates` | 浏览 NvWaX 虚拟公司模板 | 2.13 |
| `nvwax_import_virtual_company_from_url` | 拉取 `.nvwax-vc.json` 并导入本地 SQLite | 2.13 |
| `bootstrap_virtual_company_tables` | 首次加载时建表（幂等） | 2.13 |
| `open_virtual_company_page` | 触发前端跳转到 `/vc/{wizard,import,companies}` | 2.14 |
| `nvwax_push_virtual_company_state` | 把本地状态变更回写到 NvWaX | 2.14 |
| `nvwax_stream_session` | 通过 SSE 流与 NvWaX 虚拟公司会话交互（500ms 轮询版，保留兼容） | 2.14 |
| `nvwax_stream_session_v2` | **真实 SSE 流式**（reqwest bytes_stream + app_handle.emit，替代 500ms 轮询） | **v1.4.0 / Sprint 2.16** |
| `nvwax_set_agent_local_state` | **把单个 Agent 的启停/别名/角色持久化到 SQLite**（刷新不丢） | **v1.4.0 / Sprint 2.16** |
| `nvwax_fetch_local_state` | 拉取单个 session 的最新 `local_state`（多设备同步） | 2.15 |
| `nvwax_list_sessions_with_state` | 列出用户最近的虚拟公司会话（含 `local_state`） | 2.15 |
| `nvwax_publish_to_marketplace` | **把虚拟公司发布到 NvWaX 市场**（team_skills is_public=true） | **v1.4.0 / Sprint 2.16** |

### 11.6 测试覆盖

- ProClaw 端：53+ 个 Vitest（`virtualCompanySync.test.ts` 14 个 + `nvwaxClient.virtualCompany.test.ts` 8 个 + `pluginFrontend.test.ts` 8 个 + `assistantAgent.test.ts` 25 个虚拟公司相关）
- NvWaX 端：4 个 Jest（`proclaw.service.test.ts`）
- Rust 端：4 个 `#[cfg(test)]`（`bootstrap_then_persist_writes_rows_to_in_memory_db` 等）
- 端到端覆盖：所有"路径/命令/类型/测试名"在代码与文档中 1:1 对齐

### 11.7 后续路线图（计划中，非本轮范围）

- 真实 SSE 流式（`Tauri invoke_streaming` 替代 500ms 轮询）
- 启用/停用状态真正持久化到 `virtual_company_agents.enabled/alias/owner_role` 列
- 虚拟公司模板市场反向发布（ProClaw → NvWaX marketplace）
- 多设备冲突 UI 提示（撤销按钮 + CRDT 风格字段级合并）

## 🚀 快速开�?

### 前置要求

- Node.js 18+
- Rust 1.77+（Tauri 2.x 要求�?
- Git
- Windows：WebView2（Win10+ 已内置）

### 桌面端安�?

```bash
# 克隆仓库
git clone https://github.com/BiglionX/ProClaw.git
cd ProClaw

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的 Supabase 凭证或启用演示模�?
```

### 数据库配�?

**选项 A：演示模式（无需配置�?*
```env
VITE_DEMO_MODE=true
```

**选项 B：Supabase 数据库（推荐�?*

详细指南�?
- 📖 [新数据库配置指南](docs/guides/NEW_DATABASE_SETUP.md)
- �?[快速配置清单](docs/guides/DATABASE_QUICKSTART.md)

简要步骤：
1. �?[Supabase](https://supabase.com) 创建项目
2. 获取 Project URL �?anon key
3. 更新 `.env.local`
4. 执行 `database/complete_schema.sql`
5. 启用 Email 认证

### 开发模�?

```
# 桌面端开发（默认 ProClaw Plus 版）
npm run tauri dev

# Simplified config (light mode)
$env:VITE_BUILD_MODE='light'; npm run tauri dev

# ProClaw Light 版开�?/
$env:VITE_BUILD_MODE='virtual_company'; npm run tauri dev
```

桌面端内�?HTTP API 服务（端�?8888），为移动端 App 提供后端接口�?

### 构建生产版本

```
# ProClaw Plus �?
npm run tauri build

# Simplified config (light mode)
$env:VITE_BUILD_MODE='light'; npm run tauri build

# ProClaw Light �?
$env:VITE_BUILD_MODE='virtual_company'; npm run tauri build
```

### 子项目开�?

```
# 移动�?App（Expo�?
cd mobile
npm install
npx expo start

# 云托管商城（Next.js�?
cd cloud-store
npm install
npm run dev

# 营销站点
cd marketing-site
npm install
npm run dev
```

安装包位置：`src-tauri/target/release/bundle/nsis/`

## 🚀 部署模式

### 🖥�?本地优先（默�?- 免费�?

**适合人群**：注重数据主权、有技术能力、追求完全控制的用戶

```
# 1. 下载桌面应用安装�?
# 2. 安装到本�?
# 3. 数据存储在本�?SQLite（SQLCipher加密�?
# 4. 自行配置 Supabase 或其他后端（可选）
# 5. 离线可用，完全自�?
```

**优势**�?
- �?完全免费，开源代�?
- �?数据100%本地存储，隐私安�?
- �?离线可用，不依赖网络
- �?完全掌控，无供应商锁�?
- �?可自行定制和扩展

**注意**：需要自行维护和数据备份

### ☁️ 云托管（可�?- 付费订阅�?

**适合人群**：追求便捷、需要团队协作、不想自行维护的用户

```
# 1. 注册云托管账�?
# 2. 选择套餐（基础�?专业�?企业版）
# 3. 自动数据同步和备�?
# 4. 多设备无缝协�?
# 5. 零维护成�?
```

**优势**�?
- �?自动数据同步和备�?
- �?多设备实时协�?
- �?无需自行维护基础设施
- �?专业技术支持和SLA保障
- �?定期更新和新功能

**定价**�?
- 基础版：¥99/�?
- 专业版：¥299/�?
- 企业版：联系销售定�?

## 🛠�?技术栈

| 层级 | 技�?|
|------|------|
| **桌面框架** | Tauri 2.11 (Rust) |
| **前端** | React 18 + TypeScript + Vite 5 |
| **UI** | MUI 5 + Tailwind CSS 3 |
| **状态管�?* | Zustand + TanStack Query |
| **数据�?* | SQLite + SQLCipher (本地) + Supabase (云端) |
| **HTTP 服务** | Axum 0.7 + WebSocket |
| **AI 框架** | LangChain + Dify + Ollama |
| **加密** | AES-256-GCM + Argon2 + HMAC-SHA256 + Ed25519 |
| **图表** | Recharts + simple-statistics |
| **移动�?* | Expo 52 + React Native 0.76 (iOS/Android/Web) |
| **云商�?* | Next.js 16 + React 19 + Tailwind CSS 4 |
| **营销�?* | Vite 5 + React 18 + MUI 5 |
| **测试** | Vitest + Playwright + Rust #[test] |

## 🏗�?架构设计

```
┌─────────────────────────────────────────────────────────�?
�?                 ProClaw 全栈生�?                        �?
├─────────────────────────────────────────────────────────�?
�? Desktop App (Tauri 2.11)                               �?
�? ┌─────────────────────────────────────────────────�?  �?
�? �? React 18 + TypeScript + MUI + Tailwind          �?  �?
�? �? ┌──────────�?┌──────────�?┌────────────────�?  �?  �?
�? �? �?AI经营团队�?�?CEO Agent �?�?进销存管�?     �?  �?  �?
�? �? �?25+ Agent �?�?主控�?  �?�?产品/采购/销�? �?  �?  �?
�? �? └──────────�?└──────────�?└────────────────�?  �?  �?
�? �? ┌──────────�?┌──────────�?┌────────────────�?  �?  �?
�? �? �?行业插件  �?�?运营中心 �?�?用户中心        �?  �?  �?
�? �? �?餐饮/美业 �?�?数据看板 �?�?个人/订阅/日志  �?  �?  �?
�? �? �?宠物/Cloud�?└──────────�?└────────────────�?  �?  �?
�? �? └──────────�?┌──────────�?┌────────────────�?  �?  �?
�? �?              �?设备配对  �?�?AI 知识�?      �?  �?  �?
�? �?              �?通话/消息 �?�?媒体/问答/资料  �?  �?  �?
�? �?              └──────────�?└────────────────�?  �?  �?
�? └─────────────────────────────────────────────────�?  �?
�?                                                        �?
�? Tauri Core (Rust)                                      �?
�? ┌─────────────────────────────────────────────────�?  �?
�? �? SQLite + SQLCipher �?文件系统 �?系统托盘/通知   �?  �?
�? �? Axum HTTP Server  �?WebSocket �?API 路由       �?  �?
�? �? Agent 沙箱/安全    �?同步引擎 �?云端备份        �?  �?
�? �? 插件管理�?        �?审批引擎 �?邀请码管理      �?  �?
�? └─────────────────────────────────────────────────�?  �?
�?                                                        �?
�?        �?WebSocket / HTTPS                             �?
�?                                                        �?
�? Supabase Backend (可�?                                �?
�? ┌─────────────────────────────────────────────────�?  �?
�? �? PostgreSQL + Realtime �?Auth + RLS             �?  �?
�? �? Edge Functions         �?云端备份               �?  �?
�? └─────────────────────────────────────────────────�?  �?
├─────────────────────────────────────────────────────────�?
�? Mobile App (Expo)       �? CloudStore (Next.js 16)     �?
�? iOS/Android/Web         �? AI 生成电商独立�?          �?
├─────────────────────────────────────────────────────────�?
�? Marketing Site (Vite + React)                          �?
�? 营销落地�?/ 用户引导 / 10+ 管理后台页面               �?
└─────────────────────────────────────────────────────────�?
```

## 📊 项目规模

| 维度 | 数据 |
|------|------|
| **前端页面** | 55+ 个路由页面（含行业插件） |
| **前端组件** | 70+ 个UI 组件（4 个组件目录） |
| **前端服务模块** | 65 个lib 模块 |
| **Rust 后端** | 31+ 个命令模块，22 个API 端点（含 8 个虚拟公司专用命令） |
| **Agent Bundles** | 25 个行业Agent 包 |
| **行业插件** | 8 个插件（餐饮/美业/宠物/Cloud/零售/库存/虚拟公司/外贸柜台） |
| **数据库迁移** | 12+ 个迁移脚本 |
| **单元测试** | 17 个测试模块，~250+ 测试用例（含 30+ 虚拟公司集成相关） |
| **E2E 测试** | 18 个spec 文件 |
| **Rust 测试** | ~40 个测试用例 |
| **跨包集成** | 1 套 JSON Schema v1.0.0（ProClaw ↔ NvWaX 双向 1:1 校验） |
| **安装包大小** | ~6.8 MB (Windows x64) |

## ✅ 生产环境验收

| 版本 | 验收状态 | 核心功能 |
|------|----------|----------|
| **ProClaw Plus** | ✅ 通过 | 供应链(库存/采购/销售)、AI团队、财务管理 |
| **ProClaw Light** | ✅ 通过 | AI知识库(媒体/问答/资料三库)、侧边栏导航 |

### 测试覆盖
- **单元测试**: 96.5% 通过率 (221/229)
- **E2E测试**: 18个测试套件覆盖核心流程
- **浏览器测试**: Browser MCP自动化验证通过

详见 [CHANGELOG](CHANGELOG.md) 和 [发布说明](RELEASE_NOTES_v0.1.0.md)

## 📖 文档

### 用户指南
- [安装指南](docs/guides/INSTALLATION_GUIDE.md)
- [快速开始](docs/guides/QUICKSTART.md)
- [部署指南](docs/guides/DEPLOYMENT_USER_GUIDE.md)
- [Pro 版开通指南](docs/guides/PRO_SETUP_GUIDE.md)
- [Supabase 设置](docs/guides/SUPABASE_SETUP.md)
- [测试指南](docs/guides/TESTING_GUIDE.md)
- [新数据库配置指南](docs/guides/NEW_DATABASE_SETUP.md)
- [数据库快速开始](docs/guides/DATABASE_QUICKSTART.md)
- [认证设置指南](docs/guides/AUTH_SETUP.md)
- [NvWaX 集成指南（开发者）](docs/integration/NVWAX_INTEGRATION.md) — 跨包调用、ProClawPlugin API、虚拟公司插件开发
- [VirtualCompanyPackage JSON Schema](docs/integration/virtual-company-package.schema.json) — ProClaw ↔ NvWaX 跨端数据交换契约（schemaVersion 1.0.0）

### 技术文�?
- [技术方案](docs/TECHNICAL_OVERVIEW.md)
- [API 文档](docs/API_DOCUMENTATION.md)
- [数据�?Schema](docs/DATABASE_SCHEMA.md)
- [已知问题](docs/KNOWN_ISSUES.md)
- [项目定位](docs/PROJECT_POSITIONING.md)
- [实施计划](docs/IMPLEMENTATION_PLAN.md)

### PRD 产品需�?
### PRD 产品需求
- [**产品需求总览**](docs/REQUIREMENTS.md) - 推荐首读
- [PRD 总索引](docs/prd/PRD_INDEX.md)

- [PRD v4.0 核心需求](docs/prd/_deprecated/ProClaw_PRD_v4.0.md)
- [PRD v4.1 音视频通话](docs/prd/ProClaw 手机端音视频通话功能需求（补充 v4.1�?md)
- [PRD v4.2 外部伙伴邀请](docs/prd/需求文档：ProClaw 外部伙伴邀请与自动关联机制（PRD v4.2�?md)
- [PRD v4.3 员工邀请与角色分配](docs/prd/需求文档：ProClaw 员工邀请与角色权限自动分配（PRD v4.3�?md)
- [PRD v5.0 云托管商城](docs/prd/需求文档：ProClaw 云托管商城（AI 生成独立站）PRD v5.0.md)
- [PRD v5.1 用户中心](docs/prd/需求文档：ProClaw 用户中心（PRD v5.1�?md)
- [PRD v6.0 ProClaw Light 版](docs/prd/architecture/需求文档：ProClaw 虚拟公司版（Agent 化架构）PRD v6.0.md)
- [PRD v6.1 安装向导](docs/prd/需求文档：ProClaw 安装向导（CEO Agent 对话式配置）PRD v6.1.md)
- [PRD v6.2 CEO Agent 主控官](docs/prd/需求文档：CEO Agent 作为主控�?- 项目上下文协议与任务分派（PRD v6.2�?md)
- [PRD v6.3 决策确认机制](docs/prd/需求文档：CEO Agent 决策确认机制与个性化学习（PRD v6.3�?md)
- [PRD v7.0 网站运营 AI & 社媒](docs/prd/需求文档：ProClaw 网站运营 AI Team 与多区域社媒运营（PRD v7.0�?md)
- [PRD v7.1 营销网站用户中心](docs/prd/需求文档：ProClaw 营销网站用户中心（PRD v7.1�?md)
- [PRD v8.0 Token 计费改造](docs/prd/需求文档：ProClaw 云托管商�?Token 计费模式改造（PRD v8.0�?md)
- [行业插件架构升级](docs/prd/需求文档：ProClaw 插件化行业版架构升级.md)
- [行业插件功能实现](docs/prd/需求文档：行业插件功能实现（餐�?美业 宠物 Cloud�?md)
- [ProClaw-Light 桌面端需求](docs/prd/需求文档：ProClaw-Light 桌面端需�?md)
- [ProClaw Cloud 托管版](docs/prd/需求：ProClaw Cloud 托管版（Web �?+ �?token 计费�?md)

### 发布文档
- [Beta 发布就绪](docs/releases/BETA_RELEASE_READY.md)
- [v0.1.0 发布说明](RELEASE_NOTES_v0.1.0.md)
- [发布检查清单](docs/releases/RELEASE_CHECKLIST.md)
- [GitHub 发布说明](docs/releases/GITHUB_RELEASE_NOTES.md)
- [测试交付检查清单](docs/releases/TEST_DELIVERY_CHECKLIST.md)

### 功能文档
- [AI 聊天窗口增强](docs/features/AI_CHAT_WINDOW_ENHANCEMENTS.md)
- [AI 决策系统](docs/features/AI_DECISION_SYSTEM.md)
- [AI 引导系统优化](docs/features/AI_GUIDE_SYSTEM_OPTIMIZATION.md)
- [管理员后台总览](docs/features/ADMIN_DASHBOARD_COMPLETE_OVERVIEW.md)
- [FAQ 自动采集系统](docs/features/FAQ_AUTO_COLLECTION_SYSTEM.md)
- [FAQ 快速开始](docs/features/FAQ_QUICK_START.md)
- [电商产品库说明](docs/features/ECOMMERCE_PRODUCT_LIBRARY_README.md)
- [仪表盘改进](docs/features/DASHBOARD_IMPROVEMENTS.md)
- [仪表盘快速启动](docs/features/DASHBOARD_QUICKSTART.md)
- [多图片上传](docs/features/MULTI_IMAGE_UPLOAD_FEATURE.md)
- [自动编码生成](docs/features/AUTO_GENERATE_CODE_IMPLEMENTATION.md)
- [采购销售订单自动编码](docs/features/PURCHASE_SALES_ORDER_AUTO_CODE_FEATURE.md)
- [供应商客户自动编码](docs/features/SUPPLIER_CUSTOMER_AUTO_CODE_FEATURE.md)
- [商品编号自动生成](docs/features/AUTO_GENERATE_PRODUCT_CODE.md)
- [用户中心同步](docs/features/USER_CENTER_SYNC.md)
- [Rust 后端 SPU/SKU 指南](docs/features/RUST_BACKEND_SPU_SKU_GUIDE.md)
- [超级管理员账户](docs/features/SUPER_ADMIN_ACCOUNT.md)

### 营销网站
- [营销网站](marketing-site/README.md) - Vite + React 营销落地�?
- [管理后台](marketing-site/src/pages/admin/) - 10+ 管理页面

### 贡献
- [贡献指南](CONTRIBUTING.md)
- [Agent 开发指南](docs/guides/AGENT_DEVELOPMENT.md)

## 🧪 持续集成 (CI)

每次 PR 都会跑 9 个 job:

- **Hermes 快速反馈**(优先) — Hermes 模块单测 + 类型检查,3 分钟内反馈
- **Storybook 构建** — 可视化组件静态构建
- **Rust Clippy (Hermes-aware)** — `hermes_commands.rs` 必须 0 警告
- 全量 Frontend / Mobile / Rust fmt / lint / test

详细配置见 [docs/plans/hermes_ci_setup.md](docs/plans/hermes_ci_setup.md)。

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议!

1. Fork 本仓�?
2. 创建特性分�?(`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开�?Pull Request

详见 [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 许可�?

本项目采�?GNU General Public License v3.0 许可�?- 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Tauri](https://tauri.app/) - 轻量级桌面应用框�?
- [Supabase](https://supabase.com/) - 开�?Firebase 替?
- [Dify](https://dify.ai/) - LLM 应用开发平�?
- [LangChain](https://langchain.com/) - LLM 应用开发框�?
- [Expo](https://expo.dev/) - React Native 跨平台开发框�?
- [Next.js](https://nextjs.org/) - React 全栈框架
- [Axum](https://github.com/tokio-rs/axum) - Rust Web 框架
- [React Native WebRTC](https://github.com/react-native-webrtc) - WebRTC 移动端实�?

---

**Star �?这个项目以支持持续开�?**
