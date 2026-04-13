# 🦞 ProClaw Desktop

> AI-Powered Business Operating System for Small and Medium Businesses

[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0--beta.1-green.svg)](https://github.com/BiglionX/ProClaw/releases)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)

## ✨ 核心特性

- 🤖 **经营智能体** - AI 驱动的统一业务管理界面
- 📦 **产品库管理** - 基础产品CRUD、品牌分类、库存跟踪
- 📊 **进销存 AI** - 自动化库存管理和销量预测
- 🔌 **技能商店** - 可扩展的功能模块生态
- 💾 **离线优先** - SQLite 本地存储 + Supabase 云端同步
- 🔒 **数据安全** - SQLCipher 加密 + Supabase RLS

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
# 编辑 .env.local 填入你的 Supabase 凭证
```

### 开发模式

```bash
npm run tauri dev
```

### 构建生产版本

```bash
npm run tauri build
```

## 📚 技术栈

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

- [技术方案](docs/TECHNICAL_OVERVIEW.md)
- [开发指南](docs/DEVELOPER_GUIDE.md)
- [部署指南](docs/DEPLOYMENT.md)
- [API 文档](docs/API_REFERENCE.md)
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
