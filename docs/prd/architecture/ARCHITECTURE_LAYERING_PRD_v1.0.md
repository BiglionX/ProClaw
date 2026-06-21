# ProClaw 架构分层优化方案

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | ✅ 已实现 v1.0+ (2026-06-08) |
| **首次落地版本** | v1.0.0 (2026-06-08) |
| **关联发布** | [RELEASE_NOTES_v1.0.0.md](../../../RELEASE_NOTES_v1.0.0.md) §"测试覆盖: 96.5% 通过率 (221/229)" / 架构分层优化（166 个 Rust 命令） |
| **覆盖率** | 100%（Sprint 1-4 全部完成：Rust 命令注册表 + FeatureGate 组件 + 服务层分层 + 页面分组） |
| **代码入口** | `src-tauri/src/commands/mod.rs`（2145 行）、`src-tauri/src/commands/stats.rs`、`src/components/FeatureGate.tsx`、`src/services/index.ts`、`src/pages/_light/`、`src/pages/_plus/`、`src/pages/_agent/` |
| **数据库依赖** | N/A（架构重构） |
| **测试覆盖** | `src/components/FeatureGate/FeatureGate.test.tsx`、`src-tauri/src/commands/stats.rs` 单元测试 |
| **差异与遗留** | 无显著差异；Feature Flag 注解从 50+ 减到 7 处；命令注册表 166 个命令集中管理 |
| **后续动作** | 维持现状；按 v1.x 路线图持续维护 |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-06-08 | ✅ 已实现 v1.0+ | Sprint 1-4 全部完成，166 个命令迁移至注册表 |
| 2026-06-16 | ✅ 已实现 v1.0+ | 文档整理：添加实施状态区块 |

---

> **文档类型**：技术架构改进需求
> **版本**：v1.0
> **日期**：2026-06-08
> **状态**：草稿

---

## 一、现状与问题

### 1.1 产品线定位

| 版本 | Feature Flag | Rust 后端 | 前端模式 | 定位 | 目标用户 |
|------|-------------|-----------|----------|------|----------|
| **Light** | `light` | 仅基础 CRUD | `light` | 服务行业（宠物/美容/地产中介/物业管理等） | 一人虚拟公司 |
| **Plus** | `inventory` | +进销存/财务/对账 | `inventory` | 完整进销存管理 | 小微商户 |

> **注意**：「ProClaw」是产品名称，非版本命名。当前桌面端系统支持 Light 和 Plus 两个版本。

### 1.2 当前架构问题

#### 问题 1：条件编译散落各处

**Rust 后端**：`invoke_handler` 中 50+ 个命令使用 `#[cfg(feature = "...")]` 注解。

```rust
// main.rs 中的现状（部分示例）
#[cfg(feature = "inventory")]
create_purchase_order,
#[cfg(feature = "inventory")]
get_purchase_orders,
#[cfg(feature = "inventory")]
create_sales_order,
... // 50+ 处类似注解
```

**影响**：
- 新增命令需记忆 Feature Flag 位置
- 删除命令容易遗漏注解清理
- 代码审查困难

#### 问题 2：前端模式判断碎片化

**前端**：`mode === 'inventory'` / `mode === 'light'` 散落在 200+ 个文件中。

```typescript
// 散落的模式判断
if (mode === 'inventory') { /* 显示 Plus 功能 */ }
{mode === 'light' && <LightDashboard />}
<IS_LIGHT ? <LightNav /> : <PlusNav />}
```

**影响**：
- 新增功能需在多处添加判断
- 遗漏判断导致功能泄露或缺失
- 难以全局评估功能可用性

#### 问题 3：服务层扁平化

**现状**：`src/lib/` 目录 83 个文件按类型混在一起。

```
src/lib/
├── authStore.ts          # 认证
├── productService.ts      # 商品
├── purchaseService.ts     # 采购
├── salesService.ts        # 销售
├── financeService.ts      # 财务
├── agentRuntime.ts        # Agent 运行时
├── teamService.ts         # 团队
└── ...                   # 77 个其他文件
```

**影响**：
- 功能归属不清晰
- 新人难以理解代码结构
- Plus/Light 共享代码边界模糊

#### 问题 4：页面目录扁平化

**现状**：`src/pages/` 目录 54 个文件混在一起。

```
src/pages/
├── DashboardPage.tsx      # 共享
├── ProductsPage.tsx       # Light/Plus 共享
├── PurchasePage.tsx       # Plus 独占
├── SalesPage.tsx          # Plus 独占
├── TeamsPage.tsx          # Plus 独占
├── AgentMarketPage.tsx    # Plus 独占
└── ...                   # 48 个其他页面
```

**影响**：
- 难以区分功能所属版本
- 版本迭代时需全局搜索
- 插件页面与内置页面混杂

---

## 二、优化目标

### 2.1 功能边界清晰化

| 优化项 | 当前状态 | 目标状态 |
|--------|----------|----------|
| Feature Flag | 50+ 处分散注解 | 集中在注册表 |
| 模式判断 | 200+ 处散落 | 统一 Gate 组件 |
| 服务目录 | 83 个文件扁平 | 按版本分层 |
| 页面目录 | 54 个文件扁平 | 按版本分组 |

### 2.2 开发效率提升

- 新增命令：只需实现 CommandModule trait
- 新增页面：按版本放入对应目录
- 新增服务：按版本放入对应目录
- 功能开关：统一配置，变更可追溯

### 2.3 代码可维护性

- 目录结构即架构图
- Feature Flag 变更有单一入口
- 版本差异一目了然
- 插件扩展不影响内置代码

---

## 三、解决方案

### 3.1 Rust 后端：命令注册表分层

#### 3.1.1 创建命令模块注册表

新建 `src-tauri/src/commands/mod.rs`：

```rust
/// 命令模块注册表
/// 
/// 使用方式：
/// 1. 实现 CommandModule trait
/// 2. 在 get_all_commands() 中注册
/// 3. main.rs 中调用 generate_handler!()

pub mod core;        // 核心命令（所有版本共享）
pub mod product;     // 产品命令（Light/Plus 共享）
pub mod inventory;   // 进销存命令（Plus 独占）
pub mod finance;     // 财务命令（Plus 独占）
pub mod agent;       // Agent 命令（Plus 独占）
pub mod plugin;      // 插件命令（动态加载）
```

#### 3.1.2 定义 CommandModule Trait

```rust
pub trait CommandModule {
    /// 模块名称
    fn name() -> &'static str;
    
    /// 模块是否启用（基于 Feature Flag）
    fn is_enabled() -> bool;
    
    /// 模块包含的命令列表
    fn commands() -> Vec<CommandDef>;
}

/// 示例：Plus 进销存模块
pub struct InventoryModule;

impl CommandModule for InventoryModule {
    fn name() -> &'static str { "inventory" }
    
    fn is_enabled() -> bool {
        cfg!(feature = "inventory") || cfg!(feature = "virtual_company")
    }
    
    fn commands() -> Vec<CommandDef> {
        vec![
            CommandDef { name: "create_purchase_order", handler: create_purchase_order },
            CommandDef { name: "get_purchase_orders", handler: get_purchase_orders },
            // ...
        ]
    }
}
```

#### 3.1.3 统一 Handler 生成

```rust
/// 生成 invoke_handler
#[macro_export]
macro_rules! generate_handler {
    () => {
        tauri::generate_handler![
            // 核心命令（始终可用）
            $crate::commands::core::get_database_stats,
            $crate::commands::core::get_users,
            
            // 产品命令（Light/Plus）
            $(if $module:ident::is_enabled() {
                $($module::commands())*
            })+
            
            // 插件命令（动态）
            $crate::commands::plugin::load_plugin_backend,
        ]
    }
}
```

#### 3.1.4 优化效果对比

| 项目 | 当前 | 优化后 |
|------|------|--------|
| Feature Flag 位置 | 50+ 处 | 7 处（每个模块 1 处） |
| 新增命令步骤 | 3 步（定义+注解+注册） | 2 步（定义+实现 trait） |
| 删除命令步骤 | 3 步 | 1 步（移除实现） |

---

### 3.2 前端：Feature Gate 统一组件

#### 3.2.1 创建 FeatureGate 组件

新建 `src/components/FeatureGate.tsx`：

```tsx
/** 功能标识枚举 */
export type Feature =
  | 'purchase'           // 采购管理
  | 'sales'             // 销售管理
  | 'finance'           // 财务报表
  | 'reconciliation'     // 对账管理
  | 'agent'             // Agent 市场
  | 'team'              // AI 团队
  | 'sandbox'           // Agent 沙箱
  | 'cloudStore'        // 云商城
  | 'invitation';       // 邀请管理

/** 功能与版本的映射关系 */
const FEATURE_MAP: Record<Feature, AppMode[]> = {
  purchase: ['inventory'],
  sales: ['inventory'],
  finance: ['inventory'],
  reconciliation: ['inventory'],
  agent: ['inventory'],
  team: ['inventory'],
  sandbox: ['inventory'],
  cloudStore: ['inventory', 'light'],
  invitation: ['inventory', 'light'],
};

/** 功能可用性查询 */
export function isFeatureEnabled(feature: Feature, mode: AppMode): boolean {
  return FEATURE_MAP[feature]?.includes(mode) ?? false;
}

/** Feature Gate 组件 */
interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const mode = useAppModeStore(s => s.mode);
  
  if (!isFeatureEnabled(feature, mode)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
```

#### 3.2.2 使用示例

```tsx
// 替换前的散落判断
{mode === 'inventory' && <PurchasePage />}
{mode === 'inventory' && <SalesPage />}
{mode === 'inventory' && <FinancePage />}

// 替换后的统一 Gate
<FeatureGate feature="purchase">
  <PurchasePage />
</FeatureGate>

<FeatureGate feature="sales">
  <SalesPage />
</FeatureGate>

<FeatureGate feature="finance">
  <FinancePage />
</FeatureGate>
```

#### 3.2.3 Sidebar 联动

```tsx
// Sidebar.tsx 优化
function useNavItems(): NavItem[] {
  const mode = useAppModeStore(s => s.mode);
  
  const baseItems: NavItem[] = [
    { text: '数据中心', path: '/datacenter', mode: ['inventory', 'light'] },
    { text: '商品库', path: '/products', mode: ['inventory', 'light'] },
    { text: '供应链', path: '/supplychain', mode: ['inventory'] },  // Plus 独占
    { text: '采购管理', path: '/purchase', mode: ['inventory'] },   // Plus 独占
    { text: '销售管理', path: '/sales', mode: ['inventory'] },      // Plus 独占
    { text: '财务报表', path: '/finance', mode: ['inventory'] },    // Plus 独占
    { text: 'AI 团队', path: '/teams', mode: ['inventory'] },       // Plus 独占
  ];
  
  return baseItems.filter(item => item.mode.includes(mode));
}
```

---

### 3.3 前端：服务层按版本分层

#### 3.3.1 目录结构

```
src/
├── services/                      # 服务层（重构后）
│   ├── core/                     # 核心服务（所有版本共享）
│   │   ├── auth/
│   │   │   ├── authStore.ts
│   │   │   └── types.ts
│   │   ├── product/
│   │   │   ├── productService.ts
│   │   │   ├── categoryService.ts
│   │   │   └── types.ts
│   │   ├── user/
│   │   │   ├── userService.ts
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   ├── inventory/                # Plus 版服务（进销存）
│   │   ├── purchase/
│   │   │   ├── purchaseService.ts
│   │   │   └── types.ts
│   │   ├── sales/
│   │   │   ├── salesService.ts
│   │   │   └── types.ts
│   │   ├── finance/
│   │   │   ├── financeService.ts
│   │   │   ├── reconciliationService.ts
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   ├── agent/                   # Plus 版服务（AI 团队）
│   │   ├── team/
│   │   │   ├── teamService.ts
│   │   │   └── types.ts
│   │   ├── agent/
│   │   │   ├── agentRuntime.ts
│   │   │   └── types.ts
│   │   └── index.ts
│   │
│   └── index.ts                 # 服务统一导出
│
└── lib/                          # 保留：工具类和常量
    ├── utils/
    ├── constants/
    └── legacy/                   # 迁移过渡：旧路径兼容
        ├── productService.ts    # -> services/core/product/
        ├── purchaseService.ts   # -> services/inventory/purchase/
        └── ...
```

#### 3.3.2 服务导出规范

```typescript
// src/services/index.ts
// 统一导出，所有模块从此入口导入

export * from './core';
export * from './inventory';
export * from './agent';

// 版本兼容别名
export { productService as getProductService } from './core/product';
export { purchaseService as getPurchaseService } from './inventory/purchase';
```

#### 3.3.3 渐进式迁移策略

| 阶段 | 任务 | 工作量 |
|------|------|--------|
| 1 | 创建 `services/` 目录结构 | 1d |
| 2 | 新增服务直接放新目录 | - |
| 3 | 旧服务逐步迁移（保留别名） | 3d |
| 4 | 删除旧别名（3个月后） | 0.5d |

---

### 3.4 前端：页面按版本分组

#### 3.4.1 目录结构

```
src/pages/
├── _shared/                      # 所有版本共享页面
│   ├── LoginPage.tsx
│   ├── SetupPage.tsx
│   ├── SettingsPage.tsx
│   └── NotFoundPage.tsx
│
├── _light/                       # Light 版页面
│   ├── LightDashboard.tsx
│   ├── ProductsPage.tsx          # 商品库
│   ├── KnowledgeBasePage.tsx     # 知识库
│   ├── QALibraryPage.tsx         # 问答库
│   └── MediaLibraryPage.tsx      # 媒体库
│
├── _plus/                        # Plus 版页面（进销存）
│   ├── PlusDashboard.tsx
│   ├── PurchasePage.tsx          # 采购管理
│   ├── PurchaseReturnPage.tsx    # 采购退货
│   ├── SalesPage.tsx             # 销售管理
│   ├── SalesReturnPage.tsx       # 销售退货
│   ├── FinancePage.tsx           # 财务报表
│   ├── ReconciliationPage.tsx    # 对账管理
│   ├── InventoryPage.tsx         # 库存管理
│   └── SupplyChainPage.tsx       # 供应链总览
│
├── _agent/                       # Plus 版页面（AI 团队）
│   ├── TeamsPage.tsx
│   ├── AgentManagerPage.tsx
│   ├── AgentMarketPage.tsx
│   └── FinanceAgentPage.tsx
│
├── _cloud/                       # 云商城页面
│   ├── CloudStorePage.tsx
│   └── CloudStoreOrdersPage.tsx
│
└── plugins/                      # 行业插件页面
    ├── beauty/
    ├── catering/
    ├── pet/
    └── ...（其他行业）
```

#### 3.4.2 路由配置优化

```typescript
// src/config/routes.ts

interface RouteConfig {
  path: string;
  component: React.ComponentType;
  /** 可使用的版本，默认为所有版本 */
  modes?: AppMode[];
  /** 页面级 Feature Gate */
  feature?: Feature;
  /** 是否需要认证 */
  auth?: boolean;
}

const routes: RouteConfig[] = [
  // 所有版本共享
  { path: '/login', component: LoginPage },
  { path: '/settings', component: SettingsPage },
  
  // Light 版
  { path: '/datacenter', component: LightDashboard, modes: ['light', 'inventory'] },
  { path: '/products', component: ProductsPage, modes: ['light', 'inventory'] },
  { path: '/knowledge', component: KnowledgeBasePage, modes: ['light', 'inventory'] },
  
  // Plus 版（进销存）
  { path: '/purchase', component: PurchasePage, modes: ['inventory'], feature: 'purchase' },
  { path: '/sales', component: SalesPage, modes: ['inventory'], feature: 'sales' },
  { path: '/finance', component: FinancePage, modes: ['inventory'], feature: 'finance' },
  { path: '/reconciliation', component: ReconciliationPage, modes: ['inventory'], feature: 'reconciliation' },
  
  // Plus 版（AI 团队）
  { path: '/teams', component: TeamsPage, modes: ['inventory'], feature: 'team' },
  { path: '/agent-market', component: AgentMarketPage, modes: ['inventory'], feature: 'agent' },
];

// 路由守卫组件
function RouteGuard({ route }: { route: RouteConfig }) {
  const mode = useAppModeStore(s => s.mode);
  
  // 1. 版本检查
  if (route.modes && !route.modes.includes(mode)) {
    return <Navigate to="/datacenter" replace />;
  }
  
  // 2. Feature 检查
  if (route.feature && !isFeatureEnabled(route.feature, mode)) {
    return <Navigate to="/datacenter" replace />;
  }
  
  return <route.component />;
}
```

---

### 3.5 插件命令动态化

#### 3.5.1 现状问题

当前行业插件命令（catering/beauty/pet...）与内置命令混在一起编译：

```rust
// main.rs 中
pub mod catering_commands;   // 行业插件
pub mod beauty_commands;     // 行业插件
pub mod pet_commands;        // 行业插件
// ... 8 个行业插件
```

#### 3.5.2 优化方案

```rust
// src-tauri/src/plugins/mod.rs

/// 插件命令注册表（运行时）
pub struct PluginCommandRegistry {
    commands: HashMap<String, Vec<PluginCommand>>,
}

impl PluginCommandRegistry {
    /// 动态注册插件命令
    pub fn register(&self, plugin_id: &str, commands: Vec<PluginCommand>) {
        self.commands.insert(plugin_id.to_string(), commands);
    }
    
    /// 动态调用插件命令
    pub async fn invoke(&self, plugin_id: &str, cmd: &str, args: Value) -> Result<Value, String> {
        let commands = self.commands.get(plugin_id)
            .ok_or_else(|| format!("插件 {} 未加载", plugin_id))?;
        
        let handler = commands.iter()
            .find(|c| c.name == cmd)
            .ok_or_else(|| format!("命令 {} 不存在", cmd))?;
        
        handler.invoke(args).await
    }
}

// main.rs 中保留的只有：
pub mod product_commands;    // 基础产品命令（Light/Plus）
pub mod plugin_loader;        // 插件加载器
pub mod plugin_registry;      // 插件注册表（动态）

// 行业插件命令完全动态化，不再静态编译
```

#### 3.5.3 优化效果

| 项目 | 当前 | 优化后 |
|------|------|--------|
| 编译产物 | 包含 11 个行业插件命令 | 不包含（运行时加载） |
| 新增行业插件 | 需修改 main.rs | 无需修改 |
| 插件卸载 | 需重新编译 | 运行时卸载 |

---

## 四、实施计划

### Phase 1：基础架构（1-2 周）

| 任务 | 工作量 | 优先级 | 交付物 |
|------|--------|--------|--------|
| 创建 Rust 命令注册表框架 | 2d | P0 | `commands/mod.rs` |
| 实现 CommandModule trait | 1d | P0 | 7 个模块实现 |
| 重构 invoke_handler | 1d | P0 | 简化后的 main.rs |
| 创建前端 FeatureGate 组件 | 1d | P0 | `FeatureGate.tsx` |

### Phase 2：前端分层（2-3 周）

| 任务 | 工作量 | 优先级 | 交付物 |
|------|--------|--------|--------|
| 创建 services/ 目录结构 | 0.5d | P0 | 目录骨架 |
| 迁移核心服务到新目录 | 2d | P1 | `services/core/` |
| 迁移 Plus 服务到新目录 | 2d | P1 | `services/inventory/` |
| 创建页面分组目录 | 0.5d | P0 | 页面目录骨架 |
| 迁移 Plus 页面到 `_plus/` | 2d | P1 | `pages/_plus/` |
| 更新路由配置 | 1d | P1 | `routes.ts` |
| 建立旧路径别名兼容 | 1d | P1 | `lib/legacy/` |

### Phase 3：插件动态化（2 周）

| 任务 | 工作量 | 优先级 | 交付物 |
|------|--------|--------|--------|
| 创建 PluginCommandRegistry | 1d | P1 | `plugins/mod.rs` |
| 迁移行业插件命令到动态注册 | 2d | P1 | 11 个行业插件 |
| 清理 main.rs 中的静态导入 | 0.5d | P2 | 简化的 main.rs |
| 测试动态加载/卸载 | 1d | P1 | 测试用例 |

---

## 五、验收标准

### 5.1 功能验收

- [ ] Light 版本编译后不包含进销存命令
- [ ] Plus 版本编译后包含所有命令
- [ ] FeatureGate 组件正确控制功能可见性
- [ ] Sidebar 根据版本动态显示菜单
- [ ] 行业插件可动态加载/卸载

### 5.2 代码质量验收

- [ ] Feature Flag 注解从 50+ 处减少到 7 处
- [ ] 服务目录按版本清晰分层
- [ ] 页面目录按版本清晰分组
- [ ] 新增命令只需实现 CommandModule trait

### 5.3 性能验收

- [ ] 编译时间不增加超过 10%
- [ ] 运行时性能无明显下降
- [ ] 插件动态加载时间 < 500ms

---

## 六、风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 渐进式迁移导致代码分裂 | 中 | 中 | 保持旧路径别名兼容 3 个月 |
| Feature Gate 覆盖不全 | 低 | 高 | 增加自动化测试覆盖 |
| 插件动态化性能影响 | 低 | 低 | 懒加载 + 命令缓存 |
| 向后兼容破坏 | 低 | 高 | 充分测试 + 灰度发布 |

---

## 七、附录

### A. Feature 与版本的映射关系

| Feature | Light | Plus | 说明 |
|---------|-------|------|------|
| `purchase` | ❌ | ✅ | 采购管理 |
| `sales` | ❌ | ✅ | 销售管理 |
| `finance` | ❌ | ✅ | 财务报表 |
| `reconciliation` | ❌ | ✅ | 对账管理 |
| `agent` | ❌ | ✅ | Agent 市场 |
| `team` | ❌ | ✅ | AI 团队 |
| `sandbox` | ❌ | ✅ | Agent 沙箱 |
| `cloudStore` | ✅ | ✅ | 云商城 |
| `invitation` | ✅ | ✅ | 邀请管理 |
| `product` | ✅ | ✅ | 商品库 |
| `knowledge` | ✅ | ✅ | 知识库 |
| `qa` | ✅ | ✅ | 问答库 |

### B. 目录结构完整示意

```
ProClaw/
├── src/                              # 前端
│   ├── components/
│   │   ├── FeatureGate.tsx          # [新增]
│   │   └── ...
│   ├── pages/
│   │   ├── _shared/                 # [新增]
│   │   ├── _light/                  # [新增]
│   │   ├── _plus/                   # [新增]
│   │   ├── _agent/                  # [新增]
│   │   ├── _cloud/                 # [新增]
│   │   └── plugins/
│   ├── services/                    # [新增]
│   │   ├── core/
│   │   ├── inventory/
│   │   ├── agent/
│   │   └── index.ts
│   ├── lib/                         # 保留工具类
│   └── config/
│       ├── appMode.ts               # [优化]
│       └── routes.ts                # [新增]
│
└── src-tauri/src/                   # 后端
    ├── commands/                     # [新增]
    │   ├── mod.rs
    │   ├── core.rs
    │   ├── product.rs
    │   ├── inventory.rs
    │   ├── finance.rs
    │   └── agent.rs
    ├── plugins/                     # [重构]
    │   ├── mod.rs
    │   ├── loader.rs
    │   └── registry.rs
    └── main.rs                      # [简化]
```
