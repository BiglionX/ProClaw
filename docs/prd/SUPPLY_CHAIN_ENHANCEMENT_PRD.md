# 进销存（供应链）模块完善需求文档 (PRD)

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | ✅ 已实现 v1.0+ (2026-06-08) |
| **首次落地版本** | v1.0.0 (2026-06-08) |
| **关联发布** | [RELEASE_NOTES_v1.0.0.md](../../RELEASE_NOTES_v1.0.0.md) §"双模式架构 - 供应链：库存/采购/销售管理" |
| **覆盖率** | ~90%（采购/销售订单 CRUD 全状态流已落地；退货闭环已上线；P2 完善项如库存盘点/应付应收台账部分落地） |
| **代码入口** | `src/pages/PurchasePage.tsx`（589 行）、`src/pages/SalesPage.tsx`（634 行）、`src/pages/InventoryPage.tsx`（1449 行）、`src/pages/SupplyChainPage.tsx`（2458 行）、`src-tauri/src/purchase_commands.rs`、`src-tauri/src/sales_commands.rs` |
| **数据库依赖** | `database/complete_schema.sql`（purchase_orders/sales_orders/inventory_transactions + 新增 purchase_returns/sales_returns） |
| **测试覆盖** | `e2e/purchase.spec.ts`、`e2e/sales.spec.ts`、`e2e/inventory.spec.ts` |
| **差异与遗留** | P0 采购/销售订单 UI + P0 退货闭环均已落地；P2 库存盘点/订单打印/操作日志待 v1.x |
| **后续动作** | 维持现状；按 v1.x 路线图补齐 P2 项 |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-06-08 | ✅ 已实现 v1.0+ | v1.0.0 发布，进销存全状态流 + 退货闭环上线 |
| 2026-06-16 | ✅ 已实现 v1.0+ | 文档整理：添加实施状态区块 |

---

> 文档状态：草稿 | 优先级：P0~P2 | 版本：v1.0 | 日期：2026-06-05

---

## 一、现状分析

### 1.1 已有功能清单

| 模块 | 子功能 | 后端 API | 前端 UI | 完整度 |
|------|--------|----------|---------|--------|
| **库存管理** | 库存交易(入库/出库/调整/调拨) | ✅ | ✅ | 90% |
| | 库存统计 + 低库存预警 | ✅ | ✅ | 90% |
| **采购管理** | 供应商 CRUD | ✅ | ✅ | 90% |
| | 采购订单创建 | ✅ `create_purchase_order` | ❌ alert("开发中...") | 20% |
| | 采购订单列表 | ✅ `get_purchase_orders` | ✅ 只读列表 | 40% |
| | 采购订单修改/删除 | ✅ `update/delete` | ❌ 无 UI | 10% |
| | 采购收货（自动入库） | ✅ `receive_purchase_order_cmd` | ❌ 无 UI | 10% |
| | **采购退货** | ❌ 无表/无API | ❌ 无 UI | **0%** |
| **销售管理** | 客户 CRUD | ✅ | ✅ | 90% |
| | 销售订单创建 | ✅ `create_sales_order` | ❌ alert("开发中...") | 20% |
| | 销售订单列表 | ✅ `get_sales_orders` | ✅ 只读列表 | 40% |
| | 销售订单修改/删除 | ✅ `update/delete` | ❌ 无 UI | 10% |
| | 销售出库（自动扣库存） | ✅ `submit_sales_order_cmd` | ❌ 无 UI | 10% |
| | **销售退货** | ❌ 无表/无API | ❌ 无 UI | **0%** |

### 1.2 核心痛点

1. **退货流程完全缺失**：采购退货和销售退货是进销存的基本闭环，当前完全没有实现
2. **订单创建无 UI**：采购订单和销售订单的后端 API 已具备，但前端仅有 `alert("功能开发中...")` 占位
3. **订单操作无入口**：确认、收货、取消、删除等操作的后端命令已就绪，但前端缺少交互按钮
4. **订单仅列表查看**：无法查看订单详情、无法编辑、无法执行状态流转

---

## 二、改造目标

构建完整的"采购→入库→销售→出库→退货→退库"业务闭环，将进销存模块完善度从 **~40% 提升至 95%**。

---

## 三、用户故事

| 编号 | 用户 | 需求 | 目的 |
|------|------|------|------|
| US-01 | 采购员 | 我能创建采购订单，选择供应商和商品，填写数量和价格 | 完成采购下单 |
| US-02 | 采购员 | 我能查看采购订单详情，修改草稿状态的订单，删除/取消订单 | 管理采购订单 |
| US-03 | 仓管员 | 我能点击"确认收货"自动入库并更新库存 | 完成收货入库 |
| US-04 | 采购员 | 当收到的货有问题时，我能创建采购退货单，关联原采购订单，走退库流程 | 处理采购退货 |
| US-05 | 销售员 | 我能创建销售订单，选择客户和商品，填写数量价格和收货地址 | 完成销售下单 |
| US-06 | 销售员 | 我能查看销售订单详情，修改草稿订单，删除/取消订单 | 管理销售订单 |
| US-07 | 仓管员 | 我能点击"确认出库"自动扣减库存并更新发货状态 | 完成销售出库 |
| US-08 | 销售员 | 当客户退货时，我能创建销售退货单，关联原销售订单，走退库入库流程 | 处理销售退货 |
| US-09 | 财务 | 退货流程自动更新应付/应收款余额 | 财务对账准确 |

---

## 四、功能需求详述

### 4.1 P0 — 采购订单创建/编辑/操作 UI（高优先级）

**现状**: Rust 后端 `create_purchase_order` / `update_purchase_order_cmd` / `delete_purchase_order_cmd` / `receive_purchase_order_cmd` 均已实现，前端仅有占位 alert。

**需求**:

#### 4.1.1 创建采购订单对话框
- 表头：供应商选择（下拉搜索）、预计交货日期、备注
- 明细：商品选择（下拉搜索SPU/SKU）、数量、单价、自动计算金额小计
- 支持多行明细（添加/删除行）
- 提交后调用 `createPurchaseOrder`

#### 4.1.2 采购订单详情/操作
- 点击列表行 → 弹出详情对话框或行内展开
- 展示订单头信息 + 明细表格
- **操作按钮（按状态显示）**：
  - `draft`: 编辑 / 删除 / 确认
  - `confirmed`: 确认收货 / 取消
  - `shipped`: 确认收货
  - `received`: (不可操作)
  - `cancelled`: 删除

#### 4.1.3 收货操作
- 调用 `receivePurchaseOrder` → 自动增加库存 + 写入 `inventory_transactions`
- 收货成功后 toast 提醒，刷新列表

---

### 4.2 P0 — 销售订单创建/编辑/操作 UI（高优先级）

**现状**: 后端 `create_sales_order` / `update_sales_order_cmd` / `delete_sales_order_cmd` / `submit_sales_order_cmd` 均已实现，前端仅占位。

**需求**: 与采购订单类似，额外字段：
- 收货地址（`shipping_address`）
- 确认出库时需校验库存是否充足，不足则提示

#### 4.2.1 销售订单操作按钮（按状态）
- `draft`: 编辑 / 删除 / 确认出库
- `confirmed`: 标记发货 / 取消
- `shipped`: 标记已送达
- `delivered`: (不可操作)
- `cancelled`: 删除

---

### 4.3 P0 — 采购退货（全新功能）

**现状**: 数据库无退货表，Rust 无退货 API，前端无 UI。

**业务流程**:
```
已收货采购订单 → 创建采购退货单 → 关联原PO + 商品 → 确认退货 → 
自动减少库存(outbound) + 更新应付账款 → 退货完成
```

#### 4.3.1 数据库新增表

```sql
-- 采购退货单主表
CREATE TABLE IF NOT EXISTS purchase_returns (
    id TEXT PRIMARY KEY,
    pr_number TEXT UNIQUE NOT NULL,    -- PR-YYYYMMDD-XXXX
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id),
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    return_date DATE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'completed', 'cancelled')),
    total_amount REAL DEFAULT 0,       -- 退货总金额
    refund_amount REAL DEFAULT 0,      -- 已退款金额
    reason TEXT,                       -- 退货原因
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    deleted_at TIMESTAMP
);

-- 采购退货单明细
CREATE TABLE IF NOT EXISTS purchase_return_items (
    id TEXT PRIMARY KEY,
    purchase_return_id TEXT NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,           -- 关联SKU
    quantity INTEGER NOT NULL,         -- 退货数量
    unit_price REAL NOT NULL,          -- 退货单价
    total_price REAL NOT NULL,         -- 小计
    reason TEXT,                       -- 行级退货原因
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.3.2 Rust 后端命令
| 命令 | 功能 |
|------|------|
| `create_purchase_return` | 创建采购退货单（含明细） |
| `get_purchase_returns` | 获取退货单列表（按状态/搜索/关联PO） |
| `get_purchase_return_detail` | 获取退货单详情 |
| `confirm_purchase_return` | 确认退货 → 扣减库存(outbound) + 记录库存交易 |
| `cancel_purchase_return` | 取消退货单 |
| `update_purchase_return` | 修改草稿状态退货单 |

#### 4.3.3 前端 UI
- 采购管理 Tab 下新增 **"采购退货"** 子 Tab
- 列表：PR编号、原PO号、供应商、日期、状态、金额
- 创建对话框：选择原采购订单 → 自动带出供应商和已收货商品 → 填写退货数量和原因
- 操作：确认退货（扣库存）/ 取消

---

### 4.4 P0 — 销售退货（全新功能）

**业务流程**:
```
已确认销售订单 → 创建销售退货单 → 关联原SO + 商品 → 确认退货 → 
自动增加库存(inbound) + 更新应收账款 → 退货完成
```

#### 4.4.1 数据库新增表

```sql
CREATE TABLE IF NOT EXISTS sales_returns (
    id TEXT PRIMARY KEY,
    sr_number TEXT UNIQUE NOT NULL,    -- SR-YYYYMMDD-XXXX
    sales_order_id TEXT NOT NULL REFERENCES sales_orders(id),
    customer_id TEXT NOT NULL REFERENCES customers(id),
    return_date DATE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'completed', 'cancelled')),
    total_amount REAL DEFAULT 0,
    refund_amount REAL DEFAULT 0,
    reason TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_return_items (
    id TEXT PRIMARY KEY,
    sales_return_id TEXT NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.4.2 Rust 后端命令
| 命令 | 功能 |
|------|------|
| `create_sales_return` | 创建销售退货单 |
| `get_sales_returns` | 获取退货单列表 |
| `get_sales_return_detail` | 获取退货单详情 |
| `confirm_sales_return` | 确认退货 → 增加库存(inbound) + 记录库存交易 |
| `cancel_sales_return` | 取消退货单 |

#### 4.4.3 前端 UI
- 销售管理 Tab 下新增 **"销售退货"** 子 Tab
- 列表：SR编号、原SO号、客户、日期、状态、金额
- 创建对话框：选择原销售订单 → 自动带出客户和商品 → 填写退货数量
- 操作：确认退货（恢复库存）/ 取消

---

### 4.5 P1 — 订单状态流转健全

| 模块 | 状态流转路径 | 当前后端支持 | 需补充前端操作 |
|------|-------------|-------------|---------------|
| 采购订单 | draft → confirmed → shipped → received | ✅ 全链路 | 确认/取消/收货按钮 |
| | 任意状态 → cancelled | ✅ | 取消按钮 |
| 销售订单 | draft → confirmed → shipped → delivered | ✅ 全链路 | 确认/发货/送达按钮 |
| | 任意状态 → cancelled | ✅ | 取消按钮 |
| 采购退货 | draft → confirmed → completed | 需新建 | 全链路 |
| 销售退货 | draft → confirmed → completed | 需新建 | 全链路 |

---

### 4.6 P2 — 其他完善项

| 编号 | 功能 | 说明 | 优先级 |
|------|------|------|--------|
| IM-01 | 库存盘点 | 创建盘点单，对比账面库存和实盘库存，自动生成盘盈/盘亏调整 | P2 |
| IM-02 | 操作日志 | 记录进销存关键操作（创建/修改/删除/确认）的审计日志 | P2 |
| IM-03 | 应付/应收台账 | 按供应商/客户展示应付款/应收款汇总 | P2 |
| IM-04 | 订单打印 | 采购订单/销售订单/退货单的PDF导出或打印模板 | P2 |

---

## 五、技术实现计划

### 5.1 数据库迁移

新增迁移文件 `029_purchase_sales_returns.sql`：
```sql
-- 包含 4.3.1 和 4.4.1 中的四张新表
```

### 5.2 Rust 后端

**新增文件**：
- `src-tauri/src/purchase_return_commands.rs` — 采购退货 5 个命令
- `src-tauri/src/sales_return_commands.rs` — 销售退货 5 个命令

**修改文件**：
- `src-tauri/src/main.rs` — 注册新命令

**新增 TypeScript 服务层**：
- `src/lib/purchaseReturnService.ts` — 采购退货 API 封装
- `src/lib/salesReturnService.ts` — 销售退货 API 封装

### 5.3 前端 UI

**修改文件**：`src/pages/SupplyChainPage.tsx`

**新增/修改内容**：
| 位置 | 变动 | 工作内容 |
|------|------|---------|
| 采购管理子 Tab | 新增第三个 Tab "采购退货" | 新增 `PurchaseReturnTab` 组件 |
| 采购订单 Tab | 替换 alert 占位 | 新增创建/详情/操作对话框 |
| 销售管理子 Tab | 新增第三个 Tab "销售退货" | 新增 `SalesReturnTab` 组件 |
| 销售订单 Tab | 替换 alert 占位 | 新增创建/详情/操作对话框 |
| 采购订单列表 | 新增操作列 | 详情/编辑/确认/取消/收货/删除按钮 |
| 销售订单列表 | 新增操作列 | 详情/编辑/确认/发货/送达/删除按钮 |

### 5.4 实施顺序

| 阶段 | 任务 | 预估工期 | 依赖 |
|------|------|---------|------|
| **Phase 1** | 采购订单创建/编辑/操作 UI | 1 天 | 无 |
| **Phase 2** | 销售订单创建/编辑/操作 UI | 1 天 | Phase 1 |
| **Phase 3** | 采购退货（全栈） | 1.5 天 | Phase 1 |
| **Phase 4** | 销售退货（全栈） | 1.5 天 | Phase 2 |
| **Phase 5** | P2 完善项（可选） | 1~2 天 | 无 |

---

## 六、验收标准

- [ ] 采购订单可完整创建（选择供应商→添加商品→填写数量价格→保存）
- [ ] 采购订单支持编辑/删除/确认/收货全状态流转
- [ ] 确认收货后库存自动增加，`inventory_transactions` 自动记录
- [ ] 销售订单可完整创建（选择客户→添加商品→填写地址→保存）
- [ ] 销售订单支持编辑/删除/确认/发货/送达全状态流转
- [ ] 确认出库后库存自动扣减，库存不足时提示
- [ ] 采购退货单可创建（关联原PO→选择退货商品→填数量→确认→库存扣减）
- [ ] 销售退货单可创建（关联原SO→选择退货商品→填数量→确认→库存恢复）
- [ ] 所有操作有 loading 状态和 toast 反馈（成功/失败）
- [ ] 退货编号自动生成（PR-日期-随机 / SR-日期-随机）
- [ ] 退货数量不超过原订单数量（前端+后端双重校验）
- [ ] 操作按钮按订单状态正确显隐
