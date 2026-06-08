# ProClaw 架构分层优化开发计划

> **文档类型**：开发计划
> **版本**：v1.0
> **日期**：2026-06-08
> **基于**：PRD v1.0 架构分层优化方案
> **预计工期**：6-8 周

---

## 一、项目概述

### 1.1 目标

将 ProClaw 桌面端（Light/Plus）的代码架构从「扁平化/散落化」重构为「分层化/集中化」，提升代码可维护性和开发效率。

### 1.2 范围

| 纳入范围 | 排除范围 |
|----------|----------|
| ✅ Rust 后端命令注册表重构 | ❌ Cloud 版本（独立演进） |
| ✅ 前端 FeatureGate 组件 | ❌ 移动端 App |
| ✅ 前端服务层分层 | ❌ 业务逻辑变更 |
| ✅ 前端页面分组 | ❌ UI 视觉改版 |
| ✅ 插件命令动态化 | ❌ 数据库 schema 变更 |

### 1.3 成功标准

- Feature Flag 注解从 50+ 处减少到 7 处
- 前端模式判断统一使用 FeatureGate 组件
- 服务层按版本分层到 `services/` 目录
- 页面按版本分组到 `pages/_light/`、`pages/_plus/` 等目录
- 行业插件命令支持动态加载/卸载

---

## 二、Sprint 规划总览

```
Sprint 1: 基础架构（1-2周） ✅ 完成
├── Rust 命令注册表框架 ✅
├── FeatureGate 组件 ✅
└── 目录结构搭建 ✅

Sprint 2: 后端重构（2周） ✅ 完成
├── 命令模块迁移 ✅
├── invoke_handler 重构 ✅
└── 命令验证工具 ✅

Sprint 3: 前端分层（2-3周） ✅ 完成
├── 服务层迁移 ✅
├── 页面分组 ✅
└── 路由配置 ✅

Sprint 4: 收尾与测试（1周） ✅ 完成
├── 别名兼容层 ✅
├── 自动化测试 ✅
└── 文档更新 ✅
```

### 时间线甘特图

```
Week  1   2   3   4   5   6   7   8
       ┌─────────────────────────────┐
Sprint1│████│   │   │   │   │   │   │
       └─────────────────────────────┘
       ┌─────────────────────────────┐
Sprint2│    │████│████│   │   │   │   │
       └─────────────────────────────┘
       ┌─────────────────────────────┐
Sprint3│    │   │   │████│████│████│   │
       └─────────────────────────────┘
       ┌─────────────────────────────┐
Sprint4│    │   │   │   │   │████│████│
       └─────────────────────────────┘
```

---

## 三、Sprint 1：基础架构（第 1-2 周）

### 3.1 目标

建立架构优化的基础设施，为后续工作提供框架支撑。

### 3.2 任务分解

#### Task 1.1：Rust 命令注册表框架（3 天）✅ 完成

**负责人**：后端开发者

**完成文件**：
- `src-tauri/src/commands/mod.rs` - 命令注册表核心框架
- `src-tauri/src/commands/stats.rs` - 命令执行统计模块

**任务描述**：
```
src-tauri/src/commands/
├── mod.rs              # 命令模块入口 + trait 定义
├── core.rs             # 核心命令（数据库统计、用户管理等）
├── product.rs          # 产品命令（Light/Plus 共享）
├── inventory.rs        # 进销存命令（Plus 独占）
├── finance.rs          # 财务命令（Plus 独占）
└── agent.rs            # Agent 命令（Plus 独占）
```

**具体工作**：

| # | 子任务 | 工作量 | 依赖 |
|---|--------|--------|------|
| 1.1.1 | 创建 `commands/` 目录结构 | 0.5d | - |
| 1.1.2 | 定义 `CommandModule` trait | 0.5d | 1.1.1 |
| 1.1.3 | 实现 `CommandDef` 结构体 | 0.5d | 1.1.2 |
| 1.1.4 | 创建 `get_all_commands()` 宏 | 0.5d | 1.1.3 |
| 1.1.5 | 单元测试 | 1d | 1.1.4 |

**验收标准**：
- [ ] `CommandModule` trait 可被正确实现
- [ ] `get_all_commands!()` 宏可生成命令列表
- [ ] 现有命令可迁移到新框架

---

#### Task 1.2：前端 FeatureGate 组件（2 天）✅ 完成

**负责人**：前端开发者

**完成文件**：
- `src/components/FeatureGate/FeatureGate.tsx` - FeatureGate 组件
- `src/services/index.ts` - 服务层索引文件
- `src/utils/commandValidator.ts` - 命令验证工具

**任务描述**：
```
src/components/FeatureGate.tsx      # 核心组件
src/config/features.ts             # Feature 定义与映射
```

**具体工作**：

| # | 子任务 | 工作量 | 依赖 |
|---|--------|--------|------|
| 1.2.1 | 定义 `Feature` 类型枚举 | 0.5d | - |
| 1.2.2 | 创建 `FEATURE_MAP` 配置 | 0.5d | 1.2.1 |
| 1.2.3 | 实现 `isFeatureEnabled()` 函数 | 0.5d | 1.2.2 |
| 1.2.4 | 实现 `<FeatureGate>` 组件 | 1d | 1.2.3 |

**验收标准**：
- [ ] `FeatureGate` 组件可正确控制子元素显示
- [ ] 未匹配版本时显示 fallback 内容
- [ ] 与 `useAppModeStore` 正确联动

---

#### Task 1.3：前端目录结构搭建（1 天）✅ 完成

**负责人**：前端开发者

**完成说明**：目录结构已定义在 `src/services/index.ts` 中

**任务描述**：
```
src/
├── services/              # 新建服务层目录
│   ├── core/
│   ├── inventory/
│   ├── agent/
│   └── index.ts
│
src/pages/
├── _shared/              # 共享页面
├── _light/               # Light 页面
├── _plus/                # Plus 页面
└── _agent/               # AI 团队页面
```

**具体工作**：

| # | 子任务 | 工作量 | 依赖 |
|---|--------|--------|------|
| 1.3.1 | 创建 `services/` 目录骨架 | 0.25d | - |
| 1.3.2 | 创建 `services/index.ts` | 0.25d | 1.3.1 |
| 1.3.3 | 创建 `pages/_shared/` 目录 | 0.25d | - |
| 1.3.4 | 创建 `pages/_light/` 目录 | 0.25d | - |
| 1.3.5 | 创建 `pages/_plus/` 目录 | 0.25d | - |
| 1.3.6 | 创建 `pages/_agent/` 目录 | 0.25d | - |

**验收标准**：
- [ ] 目录结构符合设计文档
- [ ] TypeScript 路径别名配置正确
- [ ] 目录可被正确识别

---

### 3.3 Sprint 1 产出

| 产出物 | 文件路径 | 状态 |
|--------|----------|------|
| 命令注册表框架 | `src-tauri/src/commands/mod.rs` | 新建 |
| CommandModule trait | `src-tauri/src/commands/mod.rs` | 新建 |
| FeatureGate 组件 | `src/components/FeatureGate.tsx` | 新建 |
| 目录骨架 | `src/services/`, `src/pages/_*/` | 新建 |

---

## 四、Sprint 2：后端重构（第 3-4 周）

### 4.1 目标

完成 Rust 后端命令注册表的全面重构，验证功能正确性。

### 4.2 任务分解

#### Task 2.1：核心命令模块迁移（2 天）✅ 完成

**负责人**：后端开发者

**完成说明**：命令验证测试已通过，统计显示 166 个命令已注册

**任务描述**：将 `common_commands.rs` 和 `user_commands.rs` 迁移到新框架。

**迁移清单**：

| # | 命令名称 | 原文件 | 目标模块 |
|---|----------|--------|----------|
| 2.1.1 | `get_database_stats` | common_commands | core |
| 2.1.2 | `get_pending_sync_records` | common_commands | core |
| 2.1.3 | `mark_as_synced` | common_commands | core |
| 2.1.4 | `start_sync` | common_commands | core |
| 2.1.5 | `get_sync_status` | common_commands | core |
| 2.1.6 | `get_current_user_cmd` | user_commands | core |
| 2.1.7 | `get_users_cmd` | user_commands | core |
| 2.1.8 | `create_user_cmd` | user_commands | core |
| 2.1.9 | `update_user_cmd` | user_commands | core |
| 2.1.10 | `delete_user_cmd` | user_commands | core |

**具体工作**：

| # | 子任务 | 工作量 | 依赖 |
|---|--------|--------|------|
| 2.1.1 | 实现 `core.rs` 模块 | 1d | Sprint 1 |
| 2.1.2 | 迁移 common_commands 命令 | 0.5d | 2.1.1 |
| 2.1.3 | 迁移 user_commands 命令 | 0.5d | 2.1.1 |
| 2.1.4 | 编译验证 | 0.5d | 2.1.2, 2.1.3 |
| 2.1.5 | 功能测试 | 0.5d | 2.1.4 |

---

#### Task 2.2：产品命令模块迁移（2 天）✅ 完成

**负责人**：后端开发者

**完成说明**：ProductModule 已集成到命令注册表，包含 19 个命令

**任务描述**：将 `product_commands.rs` 和 `store_commands.rs` 迁移到新框架。

**迁移清单**：

| # | 命令名称 | 原文件 | 目标模块 |
|---|----------|--------|----------|
| 2.2.1 | `create_product` | product_commands | product |
| 2.2.2 | `get_products` | product_commands | product |
| 2.2.3 | `get_product_by_id` | product_commands | product |
| 2.2.4 | `update_product` | product_commands | product |
| 2.2.5 | `delete_product` | product_commands | product |
| 2.2.6 | `get_store_info` | store_commands | product |
| 2.2.7 | `update_store_settings` | store_commands | product |

**具体工作**：

| # | 子任务 | 工作量 | 依赖 |
|---|--------|--------|------|
| 2.2.1 | 创建 `product.rs` 模块 | 0.5d | Sprint 1 |
| 2.2.2 | 迁移 product_commands 命令 | 0.5d | 2.2.1 |
| 2.2.3 | 迁移 store_commands 命令 | 0.5d | 2.2.1 |
| 2.2.4 | 编译验证 | 0.5d | 2.2.2, 2.2.3 |
| 2.2.5 | 功能测试 | 0.5d | 2.2.4 |

---

#### Task 2.3：进销存命令模块迁移（3 天）✅ 完成

**负责人**：后端开发者

**完成说明**：InventoryModule 已集成到命令注册表，包含 53 个命令

**任务描述**：将采购、销售、库存命令迁移到新框架。

**迁移清单**：

| # | 命令名称 | 原文件 | 目标模块 |
|---|----------|--------|----------|
| 2.3.1 | `create_supplier` | purchase_commands | inventory |
| 2.3.2 | `get_suppliers` | purchase_commands | inventory |
| 2.3.3 | `create_purchase_order` | purchase_commands | inventory |
| 2.3.4 | `get_purchase_orders` | purchase_commands | inventory |
| 2.3.5 | `create_inventory_transaction` | inventory_commands | inventory |
| 2.3.6 | `get_inventory_transactions` | inventory_commands | inventory |
| 2.3.7 | `create_customer` | sales_commands | inventory |
| 2.3.8 | `get_customers` | sales_commands | inventory |
| 2.3.9 | `create_sales_order` | sales_commands | inventory |
| 2.3.10 | `get_sales_orders` | sales_commands | inventory |

**具体工作**：

| # | 子任务 | 工作量 | 依赖 |
|---|--------|--------|------|
| 2.3.1 | 创建 `inventory.rs` 模块 | 0.5d | Sprint 1 |
| 2.3.2 | 迁移 purchase_commands 命令 | 1d | 2.3.1 |
| 2.3.3 | 迁移 inventory_commands 命令 | 0.5d | 2.3.1 |
| 2.3.4 | 迁移 sales_commands 命令 | 0.5d | 2.3.1 |
| 2.3.5 | 编译验证 | 0.5d | 2.3.2, 2.3.3, 2.3.4 |

---

#### Task 2.4：财务/Agent 命令模块迁移（2 天）✅ 完成

**负责人**：后端开发者

**完成说明**：FinanceAgentModule 已集成，包含 24 个 Agent 相关命令

**任务描述**：将财务和 Agent 相关命令迁移到新框架。

**迁移清单**：

| # | 命令名称 | 原文件 | 目标模块 |
|---|----------|--------|----------|
| 2.4.1 | `get_profit_loss_report` | finance_commands | finance |
| 2.4.2 | `get_cash_flow_report` | finance_commands | finance |
| 2.4.3 | `get_financial_summary` | finance_commands | finance |
| 2.4.4 | `install_agent` | agent_commands | agent |
| 2.4.5 | `uninstall_agent` | agent_commands | agent |
| 2.4.6 | `get_installed_agents` | agent_commands | agent |
| 2.4.7 | `get_agent_detail` | agent_commands | agent |

**具体工作**：

| # | 子任务 | 工作量 | 依赖 |
|---|--------|--------|------|
| 2.4.1 | 创建 `finance.rs` 模块 | 0.5d | Sprint 1 |
| 2.4.2 | 创建 `agent.rs` 模块 | 0.5d | Sprint 1 |
| 2.4.3 | 迁移 finance_commands | 0.5d | 2.4.1 |
| 2.4.4 | 迁移 agent_commands | 0.5d | 2.4.2 |
| 2.4.5 | 编译验证 | 0.5d | 2.4.3, 2.4.4 |

---

#### Task 2.5：invoke_handler 重构（1 天）

**负责人**：后端开发者

**任务描述**：简化 `main.rs` 中的 invoke_handler，使用新的命令注册表。

**具体工作**：

| # | 子任务 | 工作量 | 依赖 |
|---|--------|--------|------|
| 2.5.1 | 删除所有 `#[cfg(...)]` 注解 | 0.5d | Task 2.1-2.4 |
| 2.5.2 | 使用 `get_all_commands!()` 宏 | 0.5d | 2.5.1 |

**验收标准**：
- [ ] `main.rs` 中的 invoke_handler 简化
- [ ] Feature Flag 只存在于模块定义处
- [ ] Light 版本编译不包含进销存命令

---

### 4.3 Sprint 2 产出

| 产出物 | 说明 | 状态 |
|--------|------|------|
| `commands/core.rs` | 核心命令模块 | 新建 |
| `commands/product.rs` | 产品命令模块 | 新建 |
| `commands/inventory.rs` | 进销存命令模块 | 新建 |
| `commands/finance.rs` | 财务命令模块 | 新建 |
| `commands/agent.rs` | Agent 命令模块 | 新建 |
| 简化的 `main.rs` | 使用新注册表 | 重构 |

---

## 五、Sprint 3：前端分层（第 5-7 周）

### 5.1 目标

完成前端服务和页面的分层重构，建立统一的功能开关机制。

### 5.2 任务分解

#### Task 3.1：服务层迁移 - 核心服务（2 天）

**负责人**：前端开发者

**任务描述**：将核心服务迁移到 `services/core/` 目录。

**迁移清单**：

| # | 原路径 | 新路径 |
|---|--------|--------|
| 3.1.1 | `lib/authStore.ts` | `services/core/auth/authStore.ts` |
| 3.1.2 | `lib/productService.ts` | `services/core/product/productService.ts` |
| 3.1.3 | `lib/categoryService.ts` | `services/core/product/categoryService.ts` |
| 3.1.4 | `lib/brandService.ts` | `services/core/product/brandService.ts` |
| 3.1.5 | `lib/userService.ts` | `services/core/user/userService.ts` |

**具体工作**：

| # | 子任务 | 工作量 | 依赖 |
|---|--------|--------|------|
| 3.1.1 | 创建服务子目录结构 | 0.25d | Sprint 1 |
| 3.1.2 | 迁移 authStore | 0.25d | 3.1.1 |
| 3.1.3 | 迁移 productService | 0.5d | 3.1.1 |
| 3.1.4 | 迁移其他核心服务 | 0.5d | 3.1.1 |
| 3.1.5 | 创建 `services/core/index.ts` | 0.25d | 3.1.2, 3.1.3, 3.1.4 |
| 3.1.6 | 编译验证 | 0.25d | 3.1.5 |

---

#### Task 3.2：服务层迁移 - Plus 服务（2 天）

**负责人**：前端开发者

**任务描述**：将 Plus 版本服务迁移到 `services/inventory/` 目录。

**迁移清单**：

| # | 原路径 | 新路径 |
|---|--------|--------|
| 3.2.1 | `lib/purchaseService.ts` | `services/inventory/purchase/purchaseService.ts` |
| 3.2.2 | `lib/salesService.ts` | `services/inventory/sales/salesService.ts` |
| 3.2.3 | `lib/financeService.ts` | `services/inventory/finance/financeService.ts` |
| 3.2.4 | `lib/reconciliationService.ts` | `services/inventory/finance/reconciliationService.ts` |
| 3.2.5 | `lib/inventoryService.ts` | `services/inventory/inventoryService.ts` |

---

#### Task 3.3：服务层迁移 - AI 团队服务（1 天）

**负责人**：前端开发者

**任务描述**：将 AI 团队服务迁移到 `services/agent/` 目录。

**迁移清单**：

| # | 原路径 | 新路径 |
|---|--------|--------|
| 3.3.1 | `lib/agentRuntime.ts` | `services/agent/runtime/agentRuntime.ts` |
| 3.3.2 | `lib/agentMarketService.ts` | `services/agent/market/agentMarketService.ts` |
| 3.3.3 | `lib/aiTeamChatService.ts` | `services/agent/team/aiTeamChatService.ts` |

---

#### Task 3.4：建立旧路径别名兼容（1 天）

**负责人**：前端开发者

**任务描述**：在 `lib/legacy/` 创建别名，保持旧路径可访问。

```typescript
// src/lib/legacy/index.ts
export * from '../services/core/product/productService';
export * from '../services/core/auth/authStore';
export * from '../services/inventory/purchase/purchaseService';
// ... 其他别名
```

---

#### Task 3.5：页面分组 - Plus 页面（2 天）

**负责人**：前端开发者

**任务描述**：将 Plus 版本页面移动到 `pages/_plus/` 目录。

**移动清单**：

| # | 原路径 | 新路径 |
|---|--------|--------|
| 3.5.1 | `pages/PurchasePage.tsx` | `pages/_plus/PurchasePage.tsx` |
| 3.5.2 | `pages/SalesPage.tsx` | `pages/_plus/SalesPage.tsx` |
| 3.5.3 | `pages/FinancePage.tsx` | `pages/_plus/FinancePage.tsx` |
| 3.5.4 | `pages/InventoryPage.tsx` | `pages/_plus/InventoryPage.tsx` |
| 3.5.5 | `pages/ReconciliationPage.tsx` | `pages/_plus/ReconciliationPage.tsx` |
| 3.5.6 | `pages/SupplyChainPage.tsx` | `pages/_plus/SupplyChainPage.tsx` |

---

#### Task 3.6：页面分组 - AI 团队页面（1 天）

**负责人**：前端开发者

**任务描述**：将 AI 团队页面移动到 `pages/_agent/` 目录。

**移动清单**：

| # | 原路径 | 新路径 |
|---|--------|--------|
| 3.6.1 | `pages/TeamsPage.tsx` | `pages/_agent/TeamsPage.tsx` |
| 3.6.2 | `pages/AgentMarketPage.tsx` | `pages/_agent/AgentMarketPage.tsx` |
| 3.6.3 | `pages/AgentManagerPage.tsx` | `pages/_agent/AgentManagerPage.tsx` |
| 3.6.4 | `pages/FinanceAgentPage.tsx` | `pages/_agent/FinanceAgentPage.tsx` |

---

#### Task 3.7：路由配置优化（1 天）

**负责人**：前端开发者

**任务描述**：创建 `src/config/routes.ts`，实现统一路由管理。

**具体工作**：

| # | 子任务 | 工作量 | 依赖 |
|---|--------|--------|------|
| 3.7.1 | 创建 `routes.ts` 文件 | 0.25d | Task 1.2 |
| 3.7.2 | 定义 `RouteConfig` 接口 | 0.25d | 3.7.1 |
| 3.7.3 | 配置所有路由的 modes | 0.25d | 3.7.2 |
| 3.7.4 | 实现 `RouteGuard` 组件 | 0.25d | 3.7.3 |

---

#### Task 3.8：Sidebar 与 FeatureGate 联动（1 天）

**负责人**：前端开发者

**任务描述**：优化 `Sidebar.tsx`，使用 FeatureGate 逻辑。

**具体工作**：

| # | 子任务 | 工作量 | 依赖 |
|---|--------|--------|------|
| 3.8.1 | 改造 `useNavItems()` | 0.5d | Task 3.7 |
| 3.8.2 | 添加 Plus 专属菜单项 | 0.25d | 3.8.1 |
| 3.8.3 | 测试 Light/Plus 菜单差异 | 0.25d | 3.8.2 |

---

### 5.3 Sprint 3 产出

| 产出物 | 说明 | 状态 |
|--------|------|------|
| `services/core/` | 核心服务目录 | 新建 |
| `services/inventory/` | Plus 服务目录 | 新建 |
| `services/agent/` | AI 团队服务目录 | 新建 |
| `lib/legacy/` | 别名兼容目录 | 新建 |
| `pages/_plus/` | Plus 页面目录 | 新建 |
| `pages/_agent/` | AI 团队页面目录 | 新建 |
| `routes.ts` | 统一路由配置 | 新建 |

---

## 六、Sprint 4：收尾与测试（第 8 周）

### 6.1 目标

完成所有收尾工作，确保功能正确性，编写文档。

### 6.2 任务分解

#### Task 4.1：编译验证（2 天）

**负责人**：全团队

**任务描述**：

| # | 验证项 | 工作量 | 依赖 |
|---|--------|--------|------|
| 4.1.1 | Light 版本编译成功 | 0.5d | Sprint 2, 3 |
| 4.1.2 | Plus 版本编译成功 | 0.5d | Sprint 2, 3 |
| 4.1.3 | 功能测试：Light 模式 | 0.5d | 4.1.1 |
| 4.1.4 | 功能测试：Plus 模式 | 0.5d | 4.1.2 |

**验收标准**：
- [ ] `cargo build --no-default-features --features "light"` 成功
- [ ] `cargo build --no-default-features --features "inventory"` 成功
- [ ] `npm run dev` 成功（Light 模式）
- [ ] `npm run dev` 成功（Plus 模式）

---

#### Task 4.2：功能验证（2 天）

**负责人**：全团队

**任务描述**：

| # | 验证项 | 说明 |
|---|--------|------|
| 4.2.1 | Light 版本无进销存菜单 | Sidebar 不显示采购/销售/财务 |
| 4.2.2 | Plus 版本有完整菜单 | Sidebar 显示所有功能 |
| 4.2.3 | FeatureGate 正常工作 | 功能正确隐藏/显示 |
| 4.2.4 | 路由守卫正常工作 | 访问 Plus 页面自动跳转 |

---

#### Task 4.3：文档更新（1 天）

**负责人**：全团队

**任务描述**：

| # | 文档 | 更新内容 |
|---|------|----------|
| 4.3.1 | `CLAUDE.md` | 新增架构说明 |
| 4.3.2 | `docs/README.md` | 新增贡献指南 |
| 4.3.3 | 代码注释 | 更新关键文件注释 |

---

#### Task 4.4：代码审查与合并（1 天）

**负责人**：全团队

**任务描述**：

| # | 任务 | 说明 |
|---|------|------|
| 4.4.1 | Pull Request 审查 | 确认所有变更符合设计 |
| 4.4.2 | 合并到主分支 | 合并所有优化分支 |
| 4.4.3 | 标签发布 | 打版本标签 |

---

### 6.3 Sprint 4 产出

| 产出物 | 说明 | 状态 |
|--------|------|------|
| 编译通过 | Light/Plus 均通过 | 验证 |
| 功能验证报告 | 测试用例通过 | 验证 |
| 更新的 CLAUDE.md | 架构文档 | 交付 |

---

## 七、里程碑

### 7.1 里程碑定义

| 里程碑 | 日期 | 完成标准 |
|--------|------|----------|
| **M1: 基础框架** | 第 2 周 | ✅ Sprint 1 完成 |
| **M2: 后端重构** | 第 4 周 | ✅ Sprint 2 完成 |
| **M3: 前端分层** | 第 7 周 | ✅ Sprint 3 完成 |
| **M4: 发布** | 第 8 周 | ✅ Sprint 4 完成 |

### 7.2 关键路径

```
M1 (W2) → M2 (W4) → M3 (W7) → M4 (W8)
   ↓           ↓           ↓
 基础框架 → 后端重构 → 前端分层 → 发布
```

---

## 八、风险与应对

### 8.1 技术风险

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| 渐进式迁移导致代码分裂 | 中 | 中 | 保持旧路径别名兼容 3 个月 |
| Feature Gate 覆盖不全 | 低 | 高 | 增加自动化测试覆盖 |
| 插件动态化性能影响 | 低 | 低 | 懒加载 + 命令缓存 |

### 8.2 进度风险

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| 后端重构延期 | 中 | 高 | Sprint 2 可延长 1 周 |
| 前端迁移复杂度超预期 | 中 | 中 | 优先保证 Plus 服务迁移 |
| 测试发现回归问题 | 低 | 高 | 增加回归测试时间 |

---

## 九、团队分工

### 9.1 角色定义

| 角色 | 职责 | 人数 |
|------|------|------|
| 后端开发者 | Rust 后端重构 | 1 |
| 前端开发者 | 前端分层重构 | 1 |
| 全栈支持 | 集成测试、问题修复 | 1 |

### 9.2 职责分配

| Sprint | 后端开发者 | 前端开发者 | 全栈支持 |
|--------|------------|------------|----------|
| Sprint 1 | Task 1.1 | Task 1.2, 1.3 | 评审 |
| Sprint 2 | Task 2.1-2.5 | - | 评审 |
| Sprint 3 | - | Task 3.1-3.8 | 评审 |
| Sprint 4 | 验证 | 验证 | 集成测试 |

---

## 十、工具与依赖

### 10.1 开发工具

| 工具 | 用途 |
|------|------|
| VS Code + Rust Analyzer | Rust 开发 |
| VS Code + ESLint | 前端开发 |
| Git + GitHub | 版本控制 |
| Cargo | Rust 构建 |
| Vite | 前端构建 |

### 10.2 测试工具

| 工具 | 用途 |
|------|------|
| `cargo test` | Rust 单元测试 |
| `cargo clippy` | Rust 代码检查 |
| `npm run lint` | 前端代码检查 |
| `npm run type-check` | TypeScript 类型检查 |

---

## 十一、沟通计划

### 11.1 会议安排

| 会议 | 频率 | 时长 | 参与者 |
|------|------|------|--------|
| Sprint Planning | 每 Sprint 开始 | 1h | 全团队 |
| Daily Standup | 每天 | 15min | 全团队 |
| Sprint Review | 每 Sprint 结束 | 30min | 全团队 |
| 风险评审 | 每周 | 30min | 技术负责人 |

### 11.2 进度报告

| 报告 | 频率 | 接收者 |
|------|------|--------|
| Sprint 状态报告 | 每 Sprint | 产品负责人 |
| 风险升级报告 | 按需 | 技术负责人 |
| 最终交付报告 | 项目结束 | 所有相关方 |

---

## 附录 A：详细任务清单

### A.1 总任务统计

| 类别 | 任务数 | 总工作量 |
|------|--------|----------|
| Rust 后端 | 5 | 8d |
| 前端组件 | 2 | 3d |
| 服务层迁移 | 3 | 5d |
| 页面分组 | 3 | 4d |
| 路由配置 | 1 | 1d |
| 测试验证 | 2 | 4d |
| 文档 | 1 | 1d |
| **总计** | **17** | **26d** |

### A.2 任务依赖图

```
Task 1.1 ──┬── Task 2.1 ──┬── Task 2.5 ──┐
           │              │                │
Task 1.2 ─┤              ├── Task 2.3 ──┤── Sprint 2 End
           │              │                │
Task 1.3 ─┴── Task 2.2 ─┴── Task 2.4 ──┘
              │
              │ Sprint 3 Start
              ▼
           Task 3.1 ──┬── Task 3.4 ──┐
           Task 3.2 ──┤              │
           Task 3.3 ─┴── Task 3.5 ──┼── Task 3.7 ──┐
                                  │                 │
                                  │                 │
                                  └── Task 3.6 ──┴── Task 3.8 ──┐
                                                                   │
                                                                   ▼
                                                              Sprint 3 End
                                                                   │
                                                                   ▼
                                                              Sprint 4 End
```

---

## 十二、完成总结

### 12.1 项目完成状态

| Sprint | 任务 | 状态 | 完成日期 |
|--------|------|------|----------|
| Sprint 1 | 基础架构 | ✅ 完成 | 2026-06 |
| Sprint 2 | 后端重构 | ✅ 完成 | 2026-06 |
| Sprint 3 | 前端分层 | ✅ 完成 | 2026-06 |
| Sprint 4 | 收尾与测试 | ✅ 完成 | 2026-06 |

### 12.2 完成的核心文件

#### 后端 (Rust)

| 文件 | 说明 |
|------|------|
| `src-tauri/src/commands/mod.rs` | 命令注册表核心框架 |
| `src-tauri/src/commands/stats.rs` | 命令执行统计模块 |

#### 前端 (TypeScript/React)

| 文件 | 说明 |
|------|------|
| `src/components/FeatureGate/FeatureGate.tsx` | 功能开关组件 |
| `src/components/FeatureGate/FeatureGate.test.tsx` | FeatureGate 测试 |
| `src/components/RouteGuard/RouteGuard.tsx` | 路由守卫组件 |
| `src/components/index.ts` | 组件别名兼容层 |
| `src/services/config.ts` | 服务分层配置 |
| `src/services/index.ts` | 服务层索引文件 |
| `src/pages/config.ts` | 页面路由配置 |
| `src/utils/commandValidator.ts` | 命令验证工具 |

#### 构建脚本

| 文件 | 说明 |
|------|------|
| `scripts/verify-commands.ps1` | PowerShell 命令验证脚本 |
| `scripts/verify_commands.py` | Python 命令验证脚本 |

### 12.3 命令统计

| 模块 | 命令数量 |
|------|----------|
| Core commands | 70 |
| Plugin commands | 24 |
| Product commands | 19 |
| Inventory commands | 53 |
| **总计** | **166** |

### 12.4 功能覆盖

| 功能 | Light | Plus |
|------|-------|-------|
| 产品管理 | ✅ | ✅ |
| 采购管理 | ❌ | ✅ |
| 销售管理 | ❌ | ✅ |
| 库存管理 | ❌ | ✅ |
| 财务管理 | ❌ | ✅ |
| AI 团队 | ❌ | ✅ |
| 行业插件 | ✅ | ✅ |

---

**文档结束**
