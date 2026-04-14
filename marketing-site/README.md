# ProClaw Marketing Site - User Center & Admin Dashboard

ProClaw 营销网站的用户中心和管理员后台系统，基于 React + TypeScript + Supabase 构建。

## 功能特性

- ✅ 用户认证（注册/登录/登出）
- 🚧 个人资料管理
- 🚧 API Key 管理（大模型接口配置）
- 🚧 Token 余额与使用统计
- 🚧 Token 购买流程
- 🚧 Admin 后台管理
- 🚧 外部项目接口管理

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件库**: MUI 5 + Tailwind CSS
- **状态管理**: Zustand
- **路由**: React Router v6
- **后端服务**: Supabase (PostgreSQL + Auth + Edge Functions)
- **加密**: crypto-js (AES)
- **图表**: Recharts

## 快速开始

### 1. 安装依赖

```bash
cd marketing-site
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写您的 Supabase 配置：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_ENCRYPTION_KEY=your_encryption_key_here
```

### 3. 设置数据库

在 Supabase Dashboard 中执行 `database/schema.sql` 文件来创建所有表和策略。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 项目结构

```
marketing-site/
├── database/
│   └── schema.sql              # 数据库迁移脚本
├── src/
│   ├── components/             # React 组件
│   │   ├── Layout/            # 布局组件
│   │   ├── Auth/              # 认证相关组件
│   │   ├── UserCenter/        # 用户中心组件
│   │   └── Admin/             # Admin 后台组件
│   ├── lib/                   # 工具库
│   │   ├── supabase.ts        # Supabase 客户端
│   │   ├── authStore.ts       # 认证状态管理
│   │   └── crypto.ts          # 加密工具
│   ├── pages/                 # 页面组件
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── UserDashboard.tsx
│   │   └── AdminDashboard.tsx
│   ├── types/                 # TypeScript 类型定义
│   │   └── index.ts
│   ├── App.tsx                # 主应用组件
│   ├── main.tsx               # 入口文件
│   └── index.css              # 全局样式
├── .env.example               # 环境变量示例
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

## 开发计划

详见 [开发计划文档](../docs/marketing-site-user-system-plan.md)

### Phase 1: 基础架构搭建 ✅
- [x] 数据库设计与 SQL 迁移脚本
- [x] 初始化 React 项目结构
- [ ] 实现认证系统

### Phase 2: 用户中心功能
- [ ] 个人资料管理
- [ ] API Key 管理
- [ ] Token 余额与统计
- [ ] Token 购买流程

### Phase 3: Admin 后台
- [ ] Admin Dashboard
- [ ] 用户管理
- [ ] Token 销售管理
- [ ] 外部接口管理

### Phase 4: API 代理与安全
- [ ] API 代理服务
- [ ] 速率限制与配额

### Phase 5: 测试与部署
- [ ] 端到端测试
- [ ] 安全审计
- [ ] 部署上线

## 许可证

GPL-3.0 License
