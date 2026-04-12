# 📝 Changelog

所有重要变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 计划中

- 集成真实 AI 后端 (Dify/Qwen)
- 技能商店生态系统
- 多仓库管理
- 自动更新机制
- macOS 应用签名

---

## [0.1.0-beta] - 2026-04-12

🎉 **首个公开测试版本发布！**

### ✨ 新增功能

#### 核心架构

- ✅ Tauri 2.0 + React 18 + TypeScript 桌面应用框架
- ✅ SQLite + SQLCipher 本地加密数据库
- ✅ Supabase 云端同步支持（可选）
- ✅ 离线优先架构设计
- ✅ 跨平台支持 (Windows/macOS/Linux)

#### 产品库管理

- ✅ 完整的 CRUD 操作（创建、读取、更新、删除）
- ✅ 产品分类和品牌管理
- ✅ 图片上传和预览（Base64 存储）
- ✅ 高级筛选（按分类、品牌、关键词）
- ✅ CSV 数据导出功能
- ✅ 后端 SQL 级过滤（高性能）

#### 进销存管理

- ✅ 库存交易记录（入库/出库/调整/调拨）
- ✅ 实时库存统计仪表板
- ✅ 低库存预警系统
- ✅ 库存充足性验证
- ✅ 交易历史查询和展示

#### AI 经营智能体

- ✅ 自然语言指令解析器（规则匹配）
- ✅ 智能对话界面（AgentChat）
- ✅ 快捷操作面板（QuickActions）
- ✅ 跨页面浮动助手（FloatingAgentChat）
- ✅ 支持 8 种预定义指令模式

#### 用户体验

- ✅ 首次设置向导（SetupPage）
- ✅ 演示模式（无需配置即可使用）
- ✅ 模拟账号快速登录（boss/IamBigBoss）
- ✅ 响应式 UI 设计（MUI + Tailwind）
- ✅ 深色/浅色主题支持
- ✅ 一键体验按钮

#### 认证系统

- ✅ 用户注册和登录
- ✅ Zustand 状态管理
- ✅ 路由保护（ProtectedRoute）
- ✅ 会话持久化
- ✅ 模拟账号支持

#### 数据同步

- ✅ 离线队列机制
- ✅ 双向同步架构
- ✅ 冲突检测与解决（Last-Write-Wins）
- ✅ 同步日志记录
- ✅ 同步状态跟踪

### 🔧 技术改进

#### 前端

- 集成 MUI 5.15 组件库
- 集成 Tailwind CSS 3.4
- React Router v6 路由系统
- React Query 数据获取
- Axios HTTP 客户端
- Zod 数据验证

#### 后端 (Rust)

- Tauri Commands 实现
- rusqlite 数据库操作
- SQLCipher 加密支持
- WAL 模式优化

#### 开发工具

- Vite 5.0 构建工具
- TypeScript 5.3 类型系统
- ESLint + Prettier 代码规范
- Husky Git Hooks

### 📚 文档

- ✅ RELEASE_NOTES.md - 发布说明
- ✅ INSTALLATION_GUIDE.md - 安装指南
- ✅ KNOWN_ISSUES.md - 已知问题
- ✅ PHASE0_COMPLETE.md - Phase 0 完成报告
- ✅ PHASE1_WEEK1_2_COMPLETE.md - Week 1-2 完成报告
- ✅ FINAL_IMPLEMENTATION_REPORT.md - 产品库功能实现报告
- ✅ INVENTORY_MODULE_REPORT.md - 进销存模块报告
- ✅ SUPABASE_SETUP.md - Supabase 配置指南
- ✅ QUICKSTART.md - 快速开始指南
- ✅ TESTING_GUIDE.md - 测试指南

### 🐛 Bug 修复

- 修复 syncService 中 last_sync_time 未实现的问题
- 修复 QuickActions 中快捷操作未绑定的问题
- 修复 supabase.ts 中未配置时的警告信息
- 修复路由系统中缺少 SetupPage 的问题

### ⚠️ 已知限制

- AI 功能为规则匹配，非真实 AI
- Supabase 同步引擎部分功能为模拟实现
- 图片使用 Base64 存储，效率较低
- 列表未使用虚拟滚动，大数据量时性能一般
- macOS 应用未签名，需要手动允许
- Windows SmartScreen 显示未知发布者警告
- 缺少自动更新机制

### 📊 代码统计

- 总文件数: 50+
- 代码行数: ~3,500+
- TypeScript: ~2,500 行
- Rust: ~800 行
- TSX/React: ~700 行
- 文档: ~2,000 行

---

## [0.0.1] - 2026-04-11

### 内部开发版本

- 项目初始化
- Tauri 环境搭建
- 基础架构验证
- 技术选型确认

---

## 版本说明

### 版本号格式

`主版本号.次版本号.修订号-预发布标签`

例如: `0.1.0-beta`

### 预发布标签

- `alpha`: 内部测试版
- `beta`: 公开测试版
- `rc`: 候选发布版
- (无标签): 稳定版

### 更新频率

- **Beta 阶段**: 每 2 周一个小版本
- **正式版**: 每 3 个月一个大版本

---

## 链接

- [GitHub Releases](https://github.com/your-org/proclaw-desktop/releases)
- [项目主页](https://proclaw.ai)
- [文档中心](./docs/PROCLAW_INDEX.md)

---

**保持关注，更多功能即将推出！** 🚀
