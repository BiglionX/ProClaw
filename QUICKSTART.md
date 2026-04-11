# 🦞 Proclaw Desktop - 快速启动指南

## ✅ Phase 0 Week 1 完成

项目已成功初始化,所有基础配置完成!

## 🚀 立即开始

### 1. 启动开发服务器

```bash
cd d:\BigLionX\3cep\proclaw-desktop
npm run dev
```

访问 http://localhost:3000/ 查看应用

### 2. 启动 Tauri 桌面应用(完整模式)

```bash
npm run tauri dev
```

这将同时启动前端和 Rust 后端,并在桌面窗口中运行应用。

## 📁 项目结构

```
proclaw-desktop/
├── src/                    # React 前端代码
│   ├── components/        # 可复用组件
│   ├── pages/            # 页面组件
│   ├── lib/              # 工具函数和库
│   ├── db/               # 数据库相关
│   └── ...
├── src-tauri/             # Tauri Rust 后端
│   ├── src/main.rs       # Rust 入口
│   └── ...
└── ...
```

## 🎯 下一步: Phase 0 Week 2

下周我们将集成 Supabase:

1. **创建 Supabase 项目**
   - 访问 https://supabase.com
   - 创建新项目
   - 获取项目 URL 和 Anon Key

2. **配置环境变量**
   ```bash
   # 编辑 .env.local 文件
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **实现认证模块**
   - 用户登录/注册
   - Session 管理
   - 权限控制

## 📚 参考文档

- [技术方案](../docs/PROCLAW_TECHNICAL_PLAN.md)
- [开发计划](../docs/PROCLAW_DEVELOPMENT_PLAN.md)
- [项目总结](../docs/PROCLAW_PROJECT_SUMMARY.md)

## 💡 常用命令

```bash
# 开发模式(仅前端)
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# Tauri 开发模式
npm run tauri dev

# Tauri 构建
npm run tauri build
```

## ⚠️ 常见问题

### Q: 端口 3000 被占用怎么办?
A: 修改 `vite.config.ts` 中的 `server.port` 配置

### Q: Rust 编译很慢?
A: 首次编译需要下载依赖,后续会快很多

### Q: 如何调试 Rust 代码?
A: 使用 VS Code 的 Rust Analyzer 插件

## 🎉 恭喜!

你已经成功启动了 Proclaw Desktop 项目!
继续按照开发计划推进,我们将在 26 周内完成整个项目。

---

**当前进度**: Phase 0 Week 1 ✅  
**下一阶段**: Phase 0 Week 2 - Supabase 集成
