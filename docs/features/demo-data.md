# ProClaw 演示数据包（Test User Bundle）

> 适用版本：ProClaw Desktop 1.0.0+

## 概述

演示账号 `boss / IamBigBoss` 登录后，系统自动注入一份完整的测试数据包，
用于功能演示、UX 验收和销售展示。

## 预置内容清单

| 数据项 | 数量 | 来源 | 展示位置 |
|--------|------|------|----------|
| 产品 SPU | 20 | 本地 SQLite（`seed_demo_products` Tauri 命令） | 「商品库」页 |
| 云商城 | 1 | `demo.proclaw.cc` | 「云商城 → 仪表盘」 |
| AI 团队 | 3 | Nvwax → `localTeamSkillMap` 回退 | 「AI 团队」页 |
| 行业插件 | 1 | `ma_foreign_counter` 内置 manifest | 「插件商店」+「外贸柜台」页 |

### 20 个 iPhone 电池 SPU 产品

- 覆盖 iPhone 6 ~ iPhone 15 全系列
- 每个 SPU 包含 1~3 个 SKU（容量/包装变体）
- 价格档位 79~259 元
- 库存随机分布在 50~500

### 3 个 AI 团队 Skill ID

| Skill ID | 展示名称 | 角色定位 |
|----------|---------|---------|
| `team-skill-biz-ops-001` | AI 经营团队 | CEO 经营决策 / 财务分析 / 供应链调度 |
| `team-skill-social-cn-001` | 国内社媒运营 Team | 抖音/小红书/视频号 |
| `team-skill-social-us-eu-001` | 欧美社媒运营 Team | Facebook / Instagram / Twitter |

### 外贸柜台运营助手插件

- 插件 ID：`ma_foreign_counter`
- Manifest：`public/plugins/ma_foreign_counter/manifest.json`
- 模块：多语言翻译 / 国际物流跟踪 / 海关申报
- UI 入口：`/foreign-counter`

## 触发流程

```
登录 boss/IamBigBoss
       │
       ▼
[AppLayout] 监听登录状态变化
       │
       ▼
[demoBootstrap.bootstrapDemoData()]
       │
       ├─ 注册 ma_foreign_counter 插件 → manifestRegistry
       ├─ seed_demo_products (Tauri) 或 DEMO_PRODUCTS (mock 兜底)
       ├─ createCloudStore('free', 'demo')
       ├─ ensureTeamFromNvwax(skillId) × 3 (Nvwax → localTeamSkillMap 回退)
       └─ markAsDemoData({...})
              │
              ▼
        广播 `proclaw:demo-bootstrapped` 事件
              │
              ▼
        WelcomeTour 弹窗 + TopBar 徽章 + 各页面自动刷新
```

## 数据标记

| Key | 类型 | 用途 |
|-----|------|------|
| `proclaw_user` | localStorage | 当前用户信息，识别演示账号 |
| `proclaw_demo_flag_v1` | localStorage | 演示数据版本 + 数量 + 资源 ID |
| `proclaw_demo_bootstrap_v1` | localStorage | 引导缓存，避免重复扫描 |
| `proclaw_demo_cloud_store_id` | localStorage | 演示云商城 ID 列表，便于重置 |

## 重置演示数据

> 仅演示账号 `boss@proclaw.demo` 可用。

**入口**：设置 → 🧪 数据管理 → 重置为演示数据

**流程**：
1. 清除 `proclaw_demo_flag_v1`
2. 清除 `proclaw_demo_bootstrap_v1`
3. 清除 `proclaw_demo_cloud_store_id`
4. 调用 `bootstrapDemoData({ force: true })` 重新注入
5. 广播 `proclaw:demo-bootstrapped` 事件

**重试次数** 记录在 `proclaw_demo_flag_v1.resetCount`，可在「数据管理」面板查看。

## 关键源文件

| 路径 | 职责 |
|------|------|
| `src/lib/demoBootstrap.ts` | 主引导服务（幂等 / 缓存 / 重置） |
| `src/lib/demoFlag.ts` | localStorage flag 工具 |
| `src/lib/manifestRegistry.ts` | 内置插件注册表 |
| `src/lib/agentMarketService.ts` | localTeamSkillMap（Nvwax 回退） |
| `src-tauri/src/product_commands.rs` | `seed_demo_products` / `mark_store_as_demo` |
| `src/components/Demo/WelcomeTour.tsx` | 首次登录欢迎弹窗 |
| `src/components/Layout/TopBar.tsx` | 「🧪 演示数据」徽章 |
| `src/pages/SettingsPage.tsx` | 数据管理 Tab + 重置按钮 |
| `src/pages/ForeignCounter/*.tsx` | 外贸柜台插件 UI |
| `public/plugins/ma_foreign_counter/` | 插件 manifest + icon |

## 单元测试

`src/lib/demoFlag.test.ts`（21 个用例）：
- `isDemoAccountContext`：演示用户邮箱识别
- `isDemoDataInitialized` / `readDemoFlag`：flag 读写一致性
- `updateDemoFlag` / `recordDemoReset`：部分字段合并 + 重置次数
- `clearDemoData` / `isDemoResource`：清除 + 资源类型判断

运行：`npx vitest run src/lib/demoFlag.test.ts`

## 故障排查

| 现象 | 排查方向 |
|------|---------|
| 演示数据没注入 | 检查 `proclaw_demo_flag_v1` 是否存在；非演示账号直接跳过 |
| AI 团队没下载 | Nvwax 连不上时会回退 `localTeamSkillMap`，查看 console |
| 云商城预览 404 | 确认 `seed_demo_products` 已写入 `product_spus` |
| 重置按钮无效 | 必须是 `boss@proclaw.demo`，其他账号看不到 Tab |
| 插件商店 Tab 不显示 | 确认 `manifestRegistry.listPluginManifests()` 返回至少 1 个 |
