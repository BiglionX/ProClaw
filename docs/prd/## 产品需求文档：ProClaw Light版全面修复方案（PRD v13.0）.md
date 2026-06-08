T# ProClaw Light 全面修复方案

> 核心原则：**Light 是 Plus 去掉进销存的子集**，修复以"共享层不动、Light 分支补齐"为策略，不重构共享代码。

---

## 架构总览：Light vs Plus 应有的复用边界

```
                    ┌─────────────────────────────┐
                    │        Rust 后端             │
                    │  ┌─────────┐  ┌──────────┐  │
                    │  │ light   │  │inventory │  │
                    │  │ feature │  │ feature  │  │
                    │  │(产品只读 │  │(采购/销售│  │
                    │  │ +零售)  │  │ /财务/对账)│  │
                    │  └────┬────┘  └─────┬────┘  │
                    │       └──────┬──────┘       │
                    │        共享模块(插件/用户/…) │
                    └─────────────────────────────┘
                    ┌─────────────────────────────┐
                    │        前端 (React)          │
                    │  共享层: productService,     │
                    │    authStore, Sidebar, …     │
                    │  ┌────────────────────────┐  │
                    │  │ Light 适配层 (薄)       │  │
                    │  │ lightAIAssistant       │  │
                    │  │ LightFeatureGate       │  │
                    │  └────────────────────────┘  │
                    └─────────────────────────────┘
```

---

## P0：功能断裂修复（不修等于不能用）

### P0-1：Light AI 助手商品库数据断路

**问题**：`getProductsSync()` 在 Tauri 环境永远返回 `[]`，因为 `getProducts()` 返回 Promise。

**修复**：将 `lightAIAssistant.ts` 改为 async，让 `queryLightAI` 返回 Promise，调用方 `FloatingAgentChat.tsx:467` 已经在 async 上下文中。

**文件**：`src/lib/lightAIAssistant.ts`

```typescript
// 改前
function getProductsSync(): Product[] {
  const result = getProducts({ limit: 50 });
  if (result instanceof Promise) { return []; }
  return result as unknown as Product[];
}

// 改后
async function getProductsAsync(): Promise<Product[]> {
  try {
    return await getProducts({ limit: 50 });
  } catch {
    return [];
  }
}
```

同时所有调用 `getProductsSync()` 的 handler 改为 async：

```typescript
// 改前
export function queryLightAI(userQuery: string): AIResponse {
// 改后
export async function queryLightAI(userQuery: string): Promise<AIResponse> {
```

`FloatingAgentChat.tsx:467` 改为 `await`：

```typescript
// 改前 (行 467)
const result = queryLightAI(userInput);
// 改后
const result = await queryLightAI(userInput);
```

**影响范围**：`lightAIAssistant.ts`（4 处 `getProductsSync` 调用）、`FloatingAgentChat.tsx`（1 处调用）。`getLightQuickCommands` 和 `getLightInitialMessage` 不受影响（纯静态数据）。

---

### P0-2：Light 版安装向导配置丢失

**问题**：`handleEnterWorkspace` (行 435-453) 检查 `installPath/companyName/modelProvider`，Light 版不设这些字段，永远走 fallback 分支，Light 专有数据 `storeType/hasData/boundPlatforms` 无人持久化。

**修复**：为 Light 版写独立的完成逻辑，分两条路径。

**文件**：`src/components/SetupWizard/SetupWizard.tsx`

```typescript
// 行 435 替换
const handleEnterWorkspace = useCallback(async () => {
  if (isLight) {
    // Light 版：保存 Light 配置到 Rust 后端
    try {
      await safeInvoke('complete_setup_and_switch', {
        config: {
          install_path: 'default',
          company_name: setupData.storeType
            ? ({ catering: '餐饮店', retail: '零售店', service: '服务店', fresh: '生鲜店', other: '店铺' }
              as Record<string, string>)[setupData.storeType] || '店铺'
            : '店铺',
          model_provider: 'light-rule-engine',
          model_path: null,
          // Light 扩展字段
          store_type: setupData.storeType || 'retail',
          has_data: setupData.hasData ?? false,
          bound_platforms: setupData.boundPlatforms || [],
        },
      });
    } catch {
      // 非 Tauri 环境降级
    }
    window.location.hash = '#/login';
    return;
  }

  // Plus 版：原有逻辑不变
  if (!setupData.installPath || !setupData.companyName || !setupData.modelProvider) {
    // ... 原有 fallback
  }
  // ... 原有完整逻辑
}, [setupData, isLight]);
```

**Rust 端**需扩展 `SetupConfigPayload` 的对应结构体以接受 `store_type` 等字段。如果当前 Rust 端 `complete_setup_and_switch` 忽略未知字段（serde 默认行为），则前端先行即可；否则需在 `src-tauri/src/setup_commands.rs` 的结构体中加 `#[serde(default)]` 字段。

---

### P0-3：知识库中文文本乱码

**问题**：`knowledgeBaseService.ts:163` 使用 `atob()` 解码 Base64，中文字符乱码。

**修复**：替换为 `TextDecoder`。

**文件**：`src/lib/knowledgeBaseService.ts` 行 159-166

```typescript
// 改前
export function extractTextContent(dataUrl: string, fileType: string): string {
  if (fileType === 'text' || fileType === 'txt') {
    try {
      const base64 = dataUrl.split(',')[1];
      return atob(base64);
    } catch {
      return '';
    }
  }
  return '';
}

// 改后
export function extractTextContent(dataUrl: string, fileType: string): string {
  if (fileType === 'text' || fileType === 'txt' || fileType === 'md') {
    try {
      const base64 = dataUrl.split(',')[1];
      const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(binary);
    } catch {
      return '';
    }
  }
  return '';
}
```

**影响**：这是共享层修复，Plus 和 Light 都受益。无破坏性变更。

---

## P1：安全性修复

### P1-1：Rust 端增加 `light` feature flag

**问题**：Light 编译产物包含全部 `inventory` 命令（采购、销售、退货、财务、对账），用户可通过 `invoke()` 直接调用。

**修复**：在 `Cargo.toml` 添加 `light` feature，`main.rs` 中用 `#[cfg(feature = "light")]` 区分命令注册。

**文件**：`src-tauri/Cargo.toml`

```toml
[features]
default = ["custom-protocol", "inventory"]
custom-protocol = ["tauri/custom-protocol"]
inventory = []
light = []          # 新增
virtual_company = []
```

**文件**：`src-tauri/src/main.rs`

Light 版应包含：产品 CRUD（`product_commands`）、店铺命令（`store_commands`）、行业插件命令（catering/beauty/…）、通用模块。排除：采购/销售/退货/财务/付款/对账。

```rust
// Light 版产品模块（只读 + 基础 CRUD，不含采购销售）
#[cfg(feature = "light")]
pub mod product_commands;
#[cfg(feature = "light")]
pub mod store_commands;

// 进销存版独占模块
#[cfg(feature = "inventory")]
pub mod inventory_commands;
#[cfg(feature = "inventory")]
pub mod purchase_commands;
#[cfg(feature = "inventory")]
pub mod sales_commands;
#[cfg(feature = "inventory")]
pub mod purchase_return_commands;
#[cfg(feature = "inventory")]
pub mod sales_return_commands;
#[cfg(feature = "inventory")]
pub mod finance_commands;
#[cfg(feature = "inventory")]
pub mod payment_commands;
#[cfg(feature = "inventory")]
pub mod reconciliation_commands;
```

**构建配置**：Light 版构建使用 `--no-default-features --features "custom-protocol,light"`。在 `build-release.ps1` 中添加 Light 构建目标。

---

### P1-2：模拟账号安全加固

**问题**：`authStore.ts:8` 明文密码 `IamBigBoss`，且 mock 用户跳过 `checkAuth`。

**修复**：不在源码中存储明文密码，改为运行时生成。

**文件**：`src/lib/authStore.ts`

```typescript
// 改前
const MOCK_ACCOUNTS = [
  {
    username: 'boss',
    password: 'IamBigBoss',
    // ...
  },
];

// 改后
const MOCK_ACCOUNTS = [
  {
    username: 'boss',
    // 密码从环境变量读取，开发时设为 VITE_MOCK_PASSWORD=proclaw2024
    password: import.meta.env.VITE_MOCK_PASSWORD || `mock-${Date.now()}`,
    // ...
  },
];
```

`.env.development` 中加：
```
VITE_MOCK_PASSWORD=proclaw2024
```

`.env.production` 中**不加此变量**，生产构建自动失效。

---

### P1-3：Agent 沙箱路径穿越防护

**问题**：`agent_sandbox.rs:60` 的 `agent_id` 未做 sanitize。

**修复**：复用已有的 `path_safety::sanitize_path_component()`。

**文件**：`src-tauri/src/agent_sandbox.rs`

```rust
// 改前
pub fn get_agent_dir(&self, agent_id: &str) -> PathBuf {
    self.base_data_dir.join("agents").join(agent_id)
}

// 改后
pub fn get_agent_dir(&self, agent_id: &str) -> Result<PathBuf, String> {
    let sanitized = path_safety::sanitize_path_component(agent_id)?;
    Ok(self.base_data_dir.join("agents").join(sanitized))
}
```

调用方（`clean_agent_data` 等）同步改用 `?` 传播错误。

---

### P1-4：`load_plugin_backend` 路径白名单

**问题**：任意前端可加载 `C:/malicious.dll`。

**修复**：限制 `library_path` 必须在插件目录下。

**文件**：`src-tauri/src/plugin_loader.rs`

```rust
pub fn load_plugin_backend(
    plugin_id: String,
    library_path: String,
) -> Result<Vec<PluginCommandDef>, String> {
    let loader = PluginLoader::global();
    let path = Path::new(&library_path);
    
    // 路径白名单：必须在插件数据目录下
    let plugin_dir = loader.base_data_dir.join("plugins").join(&plugin_id);
    let canonical_path = path.canonicalize().map_err(|e| format!("路径无效: {}", e))?;
    let canonical_dir = plugin_dir.canonicalize().map_err(|e| format!("插件目录无效: {}", e))?;
    if !canonical_path.starts_with(&canonical_dir) {
        return Err("插件库路径必须在插件数据目录下".to_string());
    }
    
    loader.load_plugin_library(&plugin_id, path)
}
```

---

## P2：代码质量修复

### P2-1：`AppMode` 类型去掉 `| string`

**问题**：`| string` 使联合类型退化为 `string`。

**修复**：用模板字面量类型或 branded type 兼容第三方扩展。

**文件**：`src/config/appMode.ts` 行 13

```typescript
// 改前
export type AppMode = 'inventory' | 'virtual_company' | 'light' | 'catering' | 'beauty' | 'pet' | 'cloud-proclaw' | string;

// 改后：内置模式 + 第三方插件模式用 branded type
export type BuiltinAppMode = 'inventory' | 'virtual_company' | 'light' | 'catering' | 'beauty' | 'pet' | 'cloud-proclaw';
export type PluginAppMode = string & { readonly __brand: unique symbol };
export type AppMode = BuiltinAppMode | PluginAppMode;

/** 类型守卫：判断是否为内置模式 */
export function isBuiltinMode(mode: string): mode is BuiltinAppMode {
  return ['inventory', 'virtual_company', 'light', 'catering', 'beauty', 'pet', 'cloud-proclaw'].includes(mode);
}
```

第三方插件使用 `mode as PluginAppMode` 显式标记，不再静默通过。

---

### P2-2：`convertSPUToProduct` 中 `min_stock` 语义修正

**问题**：多 SKU 的 `min_stock` 之和不等于"安全库存"。

**修复**：取最小值而非求和。

**文件**：`src/lib/productService.ts` 行 384

```typescript
// 改前
const minStock = spu.skus?.reduce((sum, sku) => sum + sku.min_stock, 0) || 0;

// 改后
const minStock = spu.skus?.reduce((min, sku) => Math.min(min, sku.min_stock), Infinity) || 0;
```

同样 `max_stock`（行 385）改为取最大值：

```typescript
const maxStock = spu.skus?.reduce((max, sku) => Math.max(max, sku.max_stock), 0) || 999999;
```

---

### P2-3：消息 ID 碰撞修复

**问题**：`Date.now().toString()` / `Date.now() + 1` 作消息 ID。

**修复**：用 `crypto.randomUUID()`，所有 `FloatingAgentChat.tsx` 中的 `id: Date.now().toString()` 和 `id: (Date.now() + 1).toString()` 统一替换。

**文件**：`src/components/Agent/FloatingAgentChat.tsx`（约 12 处）

```typescript
// 改前
id: Date.now().toString(),
id: (Date.now() + 1).toString(),

// 改后
id: crypto.randomUUID(),
```

> 注意：Tauri WebView 支持此 API（Chromium 92+）。如需兼容更老环境，用 `nanoid` 库。

---

### P2-4：`getStorePlugins` 强制 HTTPS

**文件**：`src/config/appMode.ts` 行 308-316

```typescript
async getStorePlugins(baseUrl: string): Promise<IndustryPluginManifest[]> {
  // 新增协议校验
  if (!baseUrl.startsWith('https://')) {
    console.warn('[PluginManager] 插件商店 URL 必须使用 HTTPS');
    return [];
  }
  // ... 原有 fetch 逻辑
}
```

---

### P2-5：`handleSend` 外层 catch 保留错误信息

**文件**：`src/components/Agent/FloatingAgentChat.tsx` 行 602-609

```typescript
// 改前
} catch (error) {
  const errorMessage: Message = {
    content: '抱歉,处理您的指令时出现了错误。请稍后重试。',
  };
}

// 改后
} catch (error) {
  console.error('[AgentChat] 处理指令失败:', error);
  const errorDetail = error instanceof Error ? error.message : String(error);
  const errorMessage: Message = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: `抱歉,处理您的指令时出现了错误。\n\n错误详情：${errorDetail}\n\n请稍后重试，或联系技术支持。`,
    timestamp: new Date(),
  };
  setMessages(prev => [...prev, errorMessage]);
}
```

---

### P2-6：`generatePersonalizedText` 调用加 try-catch

**文件**：`src/components/SetupWizard/SetupWizard.tsx`（行 124、134、198、211、463）

所有 `await generatePersonalizedText(...)` 调用处加 try-catch，降级为默认文案：

```typescript
// 模式：所有调用点统一
let personalGreeting: string | null = null;
try {
  personalGreeting = await generatePersonalizedText('greeting', ctx);
} catch {
  // LLM 不可用，降级为硬编码问候语
}
```

---

## 修复优先级与工作量估算

| 编号 | 优先级 | 问题 | 工作量 | Light 专属? |
|------|--------|------|--------|-------------|
| P0-1 | 🔴 | 商品库数据断路 | 1h | 是 |
| P0-2 | 🔴 | 安装配置丢失 | 2h | 是 |
| P0-3 | 🔴 | 中文知识库乱码 | 0.5h | 共享 |
| P1-1 | 🟠 | Rust `light` feature | 4h | 是 |
| P1-2 | 🟠 | 模拟账号安全 | 0.5h | 共享 |
| P1-3 | 🟠 | Agent 沙箱路径穿越 | 1h | 共享 |
| P1-4 | 🟠 | 插件加载路径白名单 | 1h | 共享 |
| P2-1 | 🟡 | AppMode 类型 | 1h | 共享 |
| P2-2 | 🟡 | min_stock 语义 | 0.5h | 共享 |
| P2-3 | 🟡 | 消息 ID 碰撞 | 0.5h | 共享 |
| P2-4 | 🟡 | HTTPS 强制 | 0.5h | 共享 |
| P2-5 | 🟡 | 错误信息保留 | 0.5h | 共享 |
| P2-6 | 🟡 | LLM 调用 try-catch | 0.5h | 共享 |

**总计**：约 13.5h，其中 Light 专属 7h，共享层 6.5h。

---

## 关于"复用 Plus"的设计约束

你的直觉是对的——Light 不应该有自己的"分支 fork"，而应是 Plus 的**受限于 feature gate 的子集**。核心原则：

1. **前端共享层**（productService、authStore、Sidebar、DashboardPage）**不改动**，Light 分歧点通过 `useAppModeStore` 的 `mode` 做条件渲染，这已经是当前架构的设计，只是实现有 bug
2. **Light 适配层**（lightAIAssistant、SetupWizard Light 步骤）是 Light **独有的薄层**，补齐而非重构
3. **Rust 后端**是唯一需要做 feature 分叉的地方——Light 编译时排除采购/销售/财务模块，这是安全隔离的底线
4. **不引入新抽象**：不做 `FeatureGate` 组件、不做 `ModeStrategy` 模式，保持当前 `mode === 'light'` 的条件分支风格，只修 bug
