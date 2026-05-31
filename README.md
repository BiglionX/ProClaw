[![Latest Release](https://img.shields.io/github/v/release/BiglionX/ProClaw?include_prereleases)](https://github.com/BiglionX/ProClaw/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/BiglionX/ProClaw/total)](https://github.com/BiglionX/ProClaw/releases)
# 🦞 ProClaw

> 开源AI驱动的商户经营操作系统 | Open-Source AI-Powered Business OS

[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0--beta.2-green.svg)](https://github.com/BiglionX/ProClaw/releases)
[![Tauri](https://img.shields.io/badge/Tauri-2.11-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Stars](https://img.shields.io/github/stars/BiglionX/ProClaw?style=social)](https://github.com/BiglionX/ProClaw)

## 🎯 项目定位

ProClaw 是一个**开源的AI驱动商户经营操作系统**，采用桌面应用架构（Tauri + React），为中小商户提供智能化的业务管理解决方案。支持三模式运行（Light 进销存版 / 标准进销存版 / 虚拟公司版），并配备移动端 App、云托管商城、AI 经营团队、行业插件等完整生态。

**核心特点**：
- 🤖 **AI 经营团队** - 25+ 专业 Agent 协同工作，自然语言交互
- 🏢 **三模式架构** - Light 进销存版 / 标准进销存版 / 虚拟公司版（含 CEO Agent 主控官）
- 🏭 **行业插件** - 餐饮（POS/桌台/KDS）、美业（预约/服务/员工/营销）、宠物（档案/寄养/美容）
- 💾 **本地优先** - 数据本地存储（SQLCipher 加密），完全自主可控
- ☁️ **云托管可选** - 支持 Supabase 云端同步、Token 计费、债务保护
- 🔌 **全栈生态** - 桌面端 + 移动端 App + 云托管商城 + 营销站点
- 🔑 **Token管理** - API密钥管理、用量统计、成本控制、月度账单

## ✨ 核心功能

### 1. AI 经营智能体
- **AI 经营团队**：内置 7 个专业 Agent（库存管理、销售预测、数据分析、采购管理、财务管理、客户服务、AI 智能找图）
- **Agent 生态 (25+ Bundles)**：CRM、文档生成、HR、任务管理、内容生成、转化优化、SEO、社交媒体运营（CN/US/SEA）等
- **CEO Agent 主控官系统 (PRD v6.2/v6.3)**：
  - 项目上下文协议 (PCP)：愿景/目标/约束/里程碑/决策管理
  - 任务分派与跟踪：自动分配任务给子 Agent，实时追踪状态
  - 决策确认机制：审批/驳回/编辑决策日志，个性化偏好学习
  - 快捷命令：/task list、/context show、/report
- 自然语言查询："帮我看看上周哪些商品卖得最好"
- 财务 Agent：账户管理、预算控制、发票管理、交易记录、报表生成
- Dify 工作流引擎集成 / LangChain 多提供商支持
- Token 用量监控和成本控制

### 2. 进销存管理
- **产品库管理**：简单模式 + SPU-SKU 电商模式，分类与品牌管理
- **供应商管理**：供应商 CRUD、自动编码生成
- **采购订单管理**：采购单创建/审核/收货全流程
- **销售订单管理**：销售单创建/出库，客户管理
- **实时库存跟踪**：库存变动记录，安全库存预警
- **智能补货建议**：基于销售数据和库存水平的自动补货推荐
- **多维度报表分析**：销售趋势、利润分析、库存周转

### 3. 用户与权限系统
- 注册/登录/权限控制（支持演示模式）
- 多租户支持
- 角色权限管理（店主/仓管/财务/采购/销售/客服）
- **员工邀请与角色分配 (PRD v4.3)**
- **外部伙伴邀请与自动关联 (PRD v4.2)**
- **用户中心 (PRD v5.1)**：个人资料、订阅管理、操作日志

### 4. 安装向导 (CEO Agent 对话式配置)
- CEO Agent 对话引导安装流程
- 安装路径选择（含磁盘空间检测）
- 公司名称注册
- AI 模型配置（ProCloud / 本地模型）
- 安装完成自动进入工作区

### 5. 设备配对与通信
- **桌面-移动端设备配对**：二维码扫码配对
- **语音/视频通话**：基于 WebRTC 的实时通话
- **消息系统**：联系人管理、实时消息、通话记录

### 6. 云托管商城 (CloudStore)
- AI 生成的独立电商站点（Next.js 16 + React 19）
- 商城主题自定义（颜色/布局/字体/Logo/Banner）
- 商品同步管理（从本地产品库同步）
- 订单管理、优惠券管理、商品评价管理
- 购物车、结算、支付集成
- 多套餐订阅（免费/基础/专业）
- 独立子域名 + 自定义域名

### 7. Agent 生态（虚拟公司版）
- **Agent 管理**：创建/编辑/删除/导入/导出 Agent
- **Agent 市场**：浏览/安装/发布 Agent 到市场
- **Agent 沙箱**：安全隔离运行环境
- **Agent 安全**：权限控制和安全策略
- **Agent 包**：ZIP 打包分发机制

### 8. 行业插件系统（Phase 4）
- **🍽️ 餐饮行业**：POS 收银、桌台管理、厨房显示系统 (KDS)、菜单管理
- **💇 美业行业**：预约管理、服务项目、员工管理、营销活动
- **🐾 宠物行业**：宠物档案、寄养管理、美容服务
- **☁️ Cloud 版**：Token 计费、债务保护、月度账单、云端备份
- **👥 会员管理**：跨行业通用会员体系

### 9. 运营与营销生态
- **运营中心**：统一运营看板、数据监控
- **营销网站 (PRD v7.0/v7.1)**：品牌落地页、用户引导、10+ 管理后台页面
- **AI 知识库**：三库合一（媒体库 + 问答库 + 资料库），FAQ 自动采集
- **网站运营 AI Team**：SEO 优化、内容生成、社媒运营（中国/美国/东南亚）

### 10. Light 极简版 (ProClaw-Light)
- 专注核心进销存功能，轻量级商户管理
- 简化的导航和页面布局
- 安装向导引导式配置
- 适合单一门店、个体商户快速上手

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Rust 1.77+（Tauri 2.x 要求）
- Git
- Windows：WebView2（Win10+ 已内置）

### 桌面端安装

```bash
# 克隆仓库
git clone https://github.com/BiglionX/ProClaw.git
cd ProClaw

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的 Supabase 凭证或启用演示模式
```

### 数据库配置

**选项 A：演示模式（无需配置）**
```env
VITE_DEMO_MODE=true
```

**选项 B：Supabase 数据库（推荐）**

详细指南：
- 📖 [新数据库配置指南](docs/guides/NEW_DATABASE_SETUP.md)
- ⚡ [快速配置清单](docs/guides/DATABASE_QUICKSTART.md)

简要步骤：
1. 在 [Supabase](https://supabase.com) 创建项目
2. 获取 Project URL 和 anon key
3. 更新 `.env.local`
4. 执行 `database/complete_schema.sql`
5. 启用 Email 认证

### 开发模式

```bash
# 桌面端开发（默认标准进销存版）
npm run tauri dev

# Light 极简版开发
$env:VITE_BUILD_MODE='light'; npm run tauri dev

# 虚拟公司版开发
$env:VITE_BUILD_MODE='virtual_company'; npm run tauri dev
```

桌面端内置 HTTP API 服务（端口 8888），为移动端 App 提供后端接口。

### 构建生产版本

```bash
# 标准进销存版
npm run tauri build

# Light 极简版
$env:VITE_BUILD_MODE='light'; npm run tauri build

# 虚拟公司版
$env:VITE_BUILD_MODE='virtual_company'; npm run tauri build
```

### 子项目开发

```bash
# 移动端 App（Expo）
cd mobile
npm install
npx expo start

# 云托管商城（Next.js）
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

### 🖥️ 本地优先（默认 - 免费）

**适合人群**：注重数据主权、有技术能力、追求完全控制的用戶

```bash
# 1. 下载桌面应用安装包
# 2. 安装到本地
# 3. 数据存储在本地 SQLite（SQLCipher加密）
# 4. 自行配置 Supabase 或其他后端（可选）
# 5. 离线可用，完全自主
```

**优势**：
- ✅ 完全免费，开源代码
- ✅ 数据100%本地存储，隐私安全
- ✅ 离线可用，不依赖网络
- ✅ 完全掌控，无供应商锁定
- ✅ 可自行定制和扩展

**注意**：需要自行维护和数据备份

### ☁️ 云托管（可选 - 付费订阅）

**适合人群**：追求便捷、需要团队协作、不想自行维护的用户

```bash
# 1. 注册云托管账号
# 2. 选择套餐（基础版/专业版/企业版）
# 3. 自动数据同步和备份
# 4. 多设备无缝协作
# 5. 零维护成本
```

**优势**：
- ✅ 自动数据同步和备份
- ✅ 多设备实时协作
- ✅ 无需自行维护基础设施
- ✅ 专业技术支持和SLA保障
- ✅ 定期更新和新功能

**定价**：
- 基础版：¥99/月
- 专业版：¥299/月
- 企业版：联系销售定制

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **桌面框架** | Tauri 2.11 (Rust) |
| **前端** | React 18 + TypeScript + Vite 5 |
| **UI** | MUI 5 + Tailwind CSS 3 |
| **状态管理** | Zustand + TanStack Query |
| **数据库** | SQLite + SQLCipher (本地) + Supabase (云端) |
| **HTTP 服务** | Axum 0.7 + WebSocket |
| **AI 框架** | LangChain + Dify + Ollama |
| **加密** | AES-256-GCM + Argon2 + HMAC-SHA256 + Ed25519 |
| **图表** | Recharts + simple-statistics |
| **移动端** | Expo 52 + React Native 0.76 (iOS/Android/Web) |
| **云商城** | Next.js 16 + React 19 + Tailwind CSS 4 |
| **营销站** | Vite 5 + React 18 + MUI 5 |
| **测试** | Vitest + Playwright + Rust #[test] |

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                  ProClaw 全栈生态                         │
├─────────────────────────────────────────────────────────┤
│  Desktop App (Tauri 2.11)                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript + MUI + Tailwind          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────┐   │   │
│  │  │ AI经营团队│ │ CEO Agent │ │ 进销存管理      │   │   │
│  │  │ 25+ Agent │ │ 主控官   │ │ 产品/采购/销售  │   │   │
│  │  └──────────┘ └──────────┘ └────────────────┘   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────┐   │   │
│  │  │ 行业插件  │ │ 运营中心 │ │ 用户中心        │   │   │
│  │  │ 餐饮/美业 │ │ 数据看板 │ │ 个人/订阅/日志  │   │   │
│  │  │ 宠物/Cloud│ └──────────┘ └────────────────┘   │   │
│  │  └──────────┘ ┌──────────┐ ┌────────────────┐   │   │
│  │               │ 设备配对  │ │ AI 知识库       │   │   │
│  │               │ 通话/消息 │ │ 媒体/问答/资料  │   │   │
│  │               └──────────┘ └────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Tauri Core (Rust)                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  SQLite + SQLCipher │ 文件系统 │ 系统托盘/通知   │   │
│  │  Axum HTTP Server  │ WebSocket │ API 路由       │   │
│  │  Agent 沙箱/安全    │ 同步引擎 │ 云端备份        │   │
│  │  插件管理器         │ 审批引擎 │ 邀请码管理      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│         ↕ WebSocket / HTTPS                             │
│                                                         │
│  Supabase Backend (可选)                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  PostgreSQL + Realtime │ Auth + RLS             │   │
│  │  Edge Functions         │ 云端备份               │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  Mobile App (Expo)       │  CloudStore (Next.js 16)     │
│  iOS/Android/Web         │  AI 生成电商独立站           │
├─────────────────────────────────────────────────────────┤
│  Marketing Site (Vite + React)                          │
│  营销落地页 / 用户引导 / 10+ 管理后台页面               │
└─────────────────────────────────────────────────────────┘
```

## 📊 项目规模

| 维度 | 数据 |
|------|------|
| **前端页面** | 55+ 个路由页面（含行业插件） |
| **前端组件** | 70+ 个 UI 组件（14 个组件目录） |
| **前端服务模块** | 65 个 lib 模块 |
| **Rust 后端** | 31+ 个命令模块，22 个 API 端点 |
| **Agent Bundles** | 25 个行业 Agent 包 |
| **行业插件** | 7 个插件（餐饮/美业/宠物/Cloud/零售/库存/虚拟公司） |
| **数据库迁移** | 12 个迁移脚本 |
| **单元测试** | 15 个测试模块，~200+ 测试用例 |
| **E2E 测试** | 17 个 spec 文件 |
| **Rust 测试** | ~40 个测试用例 |
| **安装包大小** | ~6.8 MB (Windows x64) |

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

### 技术文档
- [技术方案](docs/TECHNICAL_OVERVIEW.md)
- [API 文档](docs/API_DOCUMENTATION.md)
- [数据库 Schema](docs/DATABASE_SCHEMA.md)
- [已知问题](docs/KNOWN_ISSUES.md)
- [项目定位](docs/PROJECT_POSITIONING.md)
- [实施计划](docs/IMPLEMENTATION_PLAN.md)

### PRD 产品需求
- [PRD v4.0 核心需求](docs/prd/ProClaw_PRD_v4.0.md)
- [PRD v4.1 音视频通话](docs/prd/ProClaw 手机端音视频通话功能需求（补充 v4.1）.md)
- [PRD v4.2 外部伙伴邀请](docs/prd/需求文档：ProClaw 外部伙伴邀请与自动关联机制（PRD v4.2）.md)
- [PRD v4.3 员工邀请与角色分配](docs/prd/需求文档：ProClaw 员工邀请与角色权限自动分配（PRD v4.3）.md)
- [PRD v5.0 云托管商城](docs/prd/需求文档：ProClaw 云托管商城（AI 生成独立站）PRD v5.0.md)
- [PRD v5.1 用户中心](docs/prd/需求文档：ProClaw 用户中心（PRD v5.1）.md)
- [PRD v6.0 虚拟公司版](docs/prd/需求文档：ProClaw 虚拟公司版（Agent 化架构）PRD v6.0.md)
- [PRD v6.1 安装向导](docs/prd/需求文档：ProClaw 安装向导（CEO Agent 对话式配置）PRD v6.1.md)
- [PRD v6.2 CEO Agent 主控官](docs/prd/需求文档：CEO Agent 作为主控官 - 项目上下文协议与任务分派（PRD v6.2）.md)
- [PRD v6.3 决策确认机制](docs/prd/需求文档：CEO Agent 决策确认机制与个性化学习（PRD v6.3）.md)
- [PRD v7.0 网站运营 AI & 社媒](docs/prd/需求文档：ProClaw 网站运营 AI Team 与多区域社媒运营（PRD v7.0）.md)
- [PRD v7.1 营销网站用户中心](docs/prd/需求文档：ProClaw 营销网站用户中心（PRD v7.1）.md)
- [PRD v8.0 Token 计费改造](docs/prd/需求文档：ProClaw 云托管商城 Token 计费模式改造（PRD v8.0）.md)
- [行业插件架构升级](docs/prd/需求文档：ProClaw 插件化行业版架构升级.md)
- [行业插件功能实现](docs/prd/需求文档：行业插件功能实现（餐饮 美业 宠物 Cloud）.md)
- [ProClaw-Light 桌面端需求](docs/prd/需求文档：ProClaw-Light 桌面端需求.md)
- [ProClaw Cloud 托管版](docs/prd/需求：ProClaw Cloud 托管版（Web 端 + 按 token 计费）.md)

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
- [营销网站](marketing-site/README.md) - Vite + React 营销落地页
- [管理后台](marketing-site/src/pages/admin/) - 10+ 管理页面

### 贡献
- [贡献指南](CONTRIBUTING.md)
- [Agent 开发指南](docs/guides/AGENT_DEVELOPMENT.md)

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议!

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

详见 [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 许可证

本项目采用 GNU General Public License v3.0 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Tauri](https://tauri.app/) - 轻量级桌面应用框架
- [Supabase](https://supabase.com/) - 开源 Firebase 替代品
- [Dify](https://dify.ai/) - LLM 应用开发平台
- [LangChain](https://langchain.com/) - LLM 应用开发框架
- [Expo](https://expo.dev/) - React Native 跨平台开发框架
- [Next.js](https://nextjs.org/) - React 全栈框架
- [Axum](https://github.com/tokio-rs/axum) - Rust Web 框架
- [React Native WebRTC](https://github.com/react-native-webrtc) - WebRTC 移动端实现

---

**Star ⭐ 这个项目以支持持续开发!**
