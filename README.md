[![Latest Release](https://img.shields.io/github/v/release/BiglionX/ProClaw?include_prereleases)](https://github.com/BiglionX/ProClaw/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/BiglionX/ProClaw/total)](https://github.com/BiglionX/ProClaw/releases)
# 🦞 ProClaw Desktop

> 开源AI驱动的商户经营操作系统 | Open-Source AI-Powered Business OS

[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0--beta.1-green.svg)](https://github.com/BiglionX/ProClaw/releases)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Stars](https://img.shields.io/github/stars/BiglionX/ProClaw?style=social)](https://github.com/BiglionX/ProClaw)

## 🎯 项目定位

ProClaw 是一个**开源的AI驱动商户经营操作系统**，采用桌面应用架构（Tauri），为中小商户提供智能化的业务管理解决方案。

**核心特点**：
- 🤖 **AI智能体** - 自然语言交互，智能分析经营数据
- 🔑 **Token管理** - API密钥管理、用量统计、成本控制
- 🔌 **资源桥接** - 连接各种API、Webhook、第三方服务
- 💾 **本地优先** - 数据本地存储，完全自主可控
- ☁️ **云托管可选** - 支持云端同步和协作

## ✨ 核心功能

### 1. 用户管理系统
- 注册/登录/权限控制
- 多租户支持
- 角色权限管理（店主/仓管/财务）

### 2. AI经营智能体
- 自然语言查询："帮我看看上周哪些商品卖得最好"
- 智能数据分析：销量预测、库存预警、利润分析
- Dify工作流引擎集成
- Token用量监控和成本控制

### 3. 进销存管理
- 产品库管理（CRUD、品牌分类）
- 实时库存跟踪
- 智能补货建议
- 多维度报表分析

### 4. 技能商店生态
- 可扩展的插件系统
- 财务管理、会员管理、电商对接等技能
- 开发者可创建自定义技能
- 收益分成机制

### 5. 外部资源桥接
- RESTful API集成
- Webhook支持
- 第三方服务连接（支付、物流、ERP等）
- 自定义连接器开发

## �� 快速开始

### 前置要求

- Node.js 18+ 
- Rust 1.75+
- Git

### 安装

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
npm run tauri dev
```

### 构建生产版本

```bash
npm run tauri build
```

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
| **桌面框架** | Tauri 2.0 (Rust) |
| **前端** | React 18 + TypeScript + Vite |
| **UI** | MUI 5 + Tailwind CSS |
| **状态管理** | Zustand + TanStack Query |
| **数据库** | SQLite (本地) + Supabase (云端) |
| **AI** | Dify + Pinecone Vector DB |
| **图表** | Recharts |

## 🏗️ 架构设计

```

   经营智能体 (Operating Agent)       

   内置模块                           
   - 产品库                          
   - 进销存 AI                       
   - 技能商店                        

   Tauri Core (Rust)                 
   - SQLite + SQLCipher              
   - 文件系统访问                     
   - 系统托盘/通知                    

         ↕ WebSocket / HTTPS

   Supabase Backend                  
   - PostgreSQL + Realtime           
   - Auth + RLS                      
   - Edge Functions (Dify)           

```

## 📖 文档

### 用户指南
- [安装指南](docs/guides/INSTALLATION_GUIDE.md)
- [快速开始](docs/guides/QUICKSTART.md)
- [Supabase 设置](docs/guides/SUPABASE_SETUP.md)
- [测试指南](docs/guides/TESTING_GUIDE.md)
- [测试快速开始](docs/guides/TESTING_QUICKSTART.md)

### 技术文档
- [技术方案](docs/TECHNICAL_OVERVIEW.md)
- [已知问题](docs/KNOWN_ISSUES.md)

### 项目报告
- [环境检查报告](docs/reports/ENVIRONMENT_CHECK_REPORT.md)
- [初始化完成报告](docs/reports/INITIALIZATION_COMPLETE.md)
- [阶段0完成报告](docs/reports/PHASE0_COMPLETE.md)
- [最终实现报告](docs/reports/FINAL_IMPLEMENTATION_REPORT.md)
- [产品增强完成报告](docs/reports/PRODUCT_ENHANCEMENT_COMPLETE.md)
- [库存模块报告](docs/reports/INVENTORY_MODULE_REPORT.md)
- [测试完成报告](docs/reports/TEST_COMPLETION_REPORT.md)

### 发布文档
- [Beta 发布就绪](docs/releases/BETA_RELEASE_READY.md)
- [GitHub 发布说明](docs/releases/GITHUB_RELEASE_NOTES.md)
- [发布检查清单](docs/releases/RELEASE_CHECKLIST.md)
- [发布说明](docs/releases/RELEASE_NOTES.md)
- [测试交付检查清单](docs/releases/TEST_DELIVERY_CHECKLIST.md)

### 营销网站
- [营销网站文档](marketing-site/README_MARKETING.md) - Next.js 营销落地页
- [营销系统完成报告](docs/reports/MARKETING_IMPLEMENTATION_COMPLETE.md)
- [营销系统就绪报告](docs/reports/MARKETING_SYSTEM_READY.md)

### 贡献
- [贡献指南](CONTRIBUTING.md)

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

---

**Star ⭐ 这个项目以支持持续开发!**
