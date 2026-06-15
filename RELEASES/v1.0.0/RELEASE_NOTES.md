# ProClaw v1.0.0 正式版发布说明

> **v1.0.0+tray+db+contacts+msgs+safety+view+demo 更新 (2026-06-13 19:55)**
>
> - 🔧 恢复模拟账号案例数据：加载 `database/seed_iphone_batteries.sql`（20 个 iPhone 电池 SPU + 20 个 SKU + 20 张图片 + 6 个分类 + Apple 品牌）
> - 🔧 恢复安装后 AI Chat 引导窗口自动弹出：`isOpen` 初始状态改为基于 localStorage 标志检测（首次安装默认展开）
> - 🔧 引导触发条件修正：用 `proclaw:chat-guide-shown` localStorage 标志代替 `messages.length === 1`，避免重启应用时引导失效

> **v1.0.0+tray+db+contacts+msgs+safety+view 更新 (2026-06-13 19:30)**
>
> - 🔧 修复 `no such column: description ... FROM v_spu_inventory` 报错（视图从 9 列扩展为完整 16 列：description / category_id / brand_id / unit / is_on_sale / metadata / created_at / updated_at）
> - 🔧 增强 deleted_at 迁移鲁棒性：12 个 ALTER 拆分为独立 try/catch 循环 + messages 表原生定义补列（双重保险）

> **v1.0.0+tray+db+contacts+msgs+safety 更新 (2026-06-13 17:30)**
>
> - 🆕 多维度桌面端代码审计 + 修复 `Cannot read properties of undefined (reading 'toLocaleString')` 类崩溃
> - 🆕 新增 `src/lib/format.ts` 集中式安全格式化工具（safeNumber / safeFixed / safeCurrency / safeDate / safeBytes）
> - 🔧 修复 UsageDashboard.formatNumber / StoreDashboard.stats / ChatPage.tokenBalance 等 3 个高风险点

> **v1.0.0+tray+db+contacts+msgs 更新 (2026-06-13 16:20)**
>
> - 🔧 修复 `no such column: deleted_at in ... FROM messages ...` 报错（补齐 6 张表：messages / brands / product_categories / product_skus / purchase_returns / sales_returns）
> - 🔧 修复 `[CloudStore] get_cloud_store failed: no such table: cloud_stores`（内联云商城表创建：cloud_stores / cloud_store_themes / cloud_sync_log / cloud_orders + product_spu 云同步字段）

> **v1.0.0+tray+db+contacts 更新 (2026-06-13 15:35)**
>
> - 🆕 AI Team 群组联系人：QQ 群组风格显示（在线绿点、N 人在线、成员数）
> - 🆕 Agent 主动问候：点击 Agent 联系人时主动发送 "老板，有啥吩咐？"
> - 🔧 修复 `get_messages` 等命令 `missing required key params` 报错

> **v1.0.0+tray+db 更新 (2026-06-13 15:00)**
>
> - 🔧 修复 `no such column: deleted_at` 数据库错误（6 张表补充软删除列）
> - 🔧 修复 `no such table: secretary_bap` 数据库错误（SQLite 兼容迁移）

> **v1.0.0+tray 更新 (2026-06-13 14:30)**
>
> - 🆕 新增系统托盘驻留：关闭窗口时自动隐藏到右下角托盘，新消息弹出 Windows 桌面通知
> - 🗑️ 移除 MSI 安装包（v1.0.0 已切换为 NSIS-only）

## 下载地址

| 平台 | 文件 | 大小 |
|------|------|------|
| Windows 桌面端（绿色版） | [proclaw-desktop.exe](proclaw-desktop.exe) | 18.0 MB |
| Windows 桌面端（NSIS 安装包） | [ProClaw_1.0.0_x64-setup.exe](ProClaw_1.0.0_x64-setup.exe) | 7.0 MB |
| Android 手机端 | [ProClaw_1.0.0_android.apk](ProClaw_1.0.0_android.apk) | ~138 MB |

> 校验和见 [CHECKSUMS.md](CHECKSUMS.md) / [SHA256SUMS.txt](SHA256SUMS.txt)

## 主要功能

### 🏢 双模式架构
- **Plus 版（进销存版）**: 适用于商贸企业，提供完整的供应链管理
- **Light 版（服务行业版）**: 适用于餐饮、服务等行业，聚焦客户与员工管理

### 🤖 AI 智能体
- **CEO Agent 主控官**: AI 决策助手，智能分析经营数据，主动问候
- **AI 团队**: 销售助理、采购助理、财务助理等多个 AI Agent（11 类）
- **Agent 主动问候**: 进入会话时 Agent 主动打招呼 "老板，有啥吩咐？"
- **AI Team 群组（QQ 群组风格）**: 联系人列表独立分区，在线状态 + 成员数
- **AI 知识库**: 三库合一（媒体库/问答库/资料库）

### 🔌 插件生态
- **行业插件系统 Phase 4**: 支持餐饮、零售、电商等行业插件
- **插件市场**: 插件浏览、安装、更新全流程支持

### 🖥️ 桌面体验
- **系统托盘驻留**: 关闭主窗口时自动隐藏到右下角托盘，不退出进程
- **桌面通知**: 收到新消息时弹出 Windows 通知中心提醒
- **托盘右键菜单**: 「显示窗口 / 退出」快捷操作
- **未读消息数提示**: 鼠标悬停托盘图标即可查看未读消息数

### 📦 供应链管理
- 库存管理（多仓库、调拨、盘点）
- 采购管理（采购订单、入库、供应商管理）
- 销售管理（销售订单、出库、客户管理）
- 财务对账（应收应付、流水核对）

## 技术规格

| 项目 | 桌面端 | 手机端 |
|------|--------|--------|
| 框架 | Tauri 2.11 | Expo SDK 52 |
| 前端 | React + TypeScript | React Native |
| 数据库 | SQLite + Supabase | SQLite |
| 最低系统 | Windows 10 | Android 6.0 (API 23) |

## 版本历史

- **v1.0.0+tray+db+contacts+msgs+safety+view+demo** (2026-06-13 19:55): 恢复 iPhone 电池案例数据 + AI Chat 引导窗口自动弹出
- **v1.0.0+tray+db+contacts+msgs+safety+view** (2026-06-13 19:30): 修复 v_spu_inventory 视图列缺失 + deleted_at ALTER 拆分独立 try/catch
- **v1.0.0+tray+db+contacts+msgs+safety** (2026-06-13 17:30): 多维度桌面端代码审计 + 安全格式化工具 + 修复 toLocaleString 崩溃
- **v1.0.0+tray+db+contacts+msgs** (2026-06-13 16:20): 修复 messages 等 6 张表缺 `deleted_at` 列 + 修复云商城表 `cloud_stores` 缺失
- **v1.0.0+tray+db+contacts** (2026-06-13 15:35): AI Team 群组 QQ 风格显示 + Agent 主动问候
- **v1.0.0+tray+db** (2026-06-13 15:00): 修复数据库 schema 缺失列/缺表错误
- **v1.0.0+tray** (2026-06-13 14:30): 新增系统托盘驻留 + Windows 桌面通知
- **v1.0.0** (2026-06-08): 正式版发布
- **v0.1.x**: 内测版本

---

详细文档请访问 [GitHub 仓库](https://github.com/BigLionX/ProClaw)
