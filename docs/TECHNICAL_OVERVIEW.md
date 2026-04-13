# ProClaw 技术架构概览

## 系统架构

ProClaw 采用现代化的桌面应用架构,结合 Tauri 2.0 的轻量级特性和 React 的灵活性。

### 架构图

`\n\n   经营智能体 (Operating Agent)       \n\n   内置模块                           \n   - 产品库                          \n   - 进销存 AI                       \n   - 技能商店                        \n\n   Tauri Core (Rust)                 \n\n         ↕ WebSocket / HTTPS\n\n   Supabase Backend                  \n\n`

## 技术选型理由

### 为什么选择 Tauri?

- **轻量级**: 安装包仅 5-10MB (vs Electron 150MB+)
- **低内存**: 运行时约 50-100MB (vs Electron 200-400MB)
- **安全性**: Rust 后端提供内存安全保证
- **性能**: 原生系统调用,无 Chromium 开销

### 为什么选择 Supabase?

- **开源**: 完全开源,可自托管
- **全功能**: Auth + Database + Realtime + Storage
- **RLS**: 行级安全策略,多租户隔离
- **实时同步**: WebSocket 实时数据更新

## 数据流

1. 用户操作  React 组件
2. Zustand Store 管理状态
3. Service Layer 处理业务逻辑
4. 离线时写入 SQLite
5. 在线时同步到 Supabase

## 核心模块

- **src/lib/**: 服务层(Supabase、AI、同步等)
- **src/pages/**: 页面组件
- **src/components/**: 可复用 UI 组件
- **src-tauri/**: Rust 后端代码
