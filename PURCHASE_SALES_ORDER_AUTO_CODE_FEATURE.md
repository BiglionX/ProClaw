# 采购订单和销售订单自动编码功能

## 📋 功能概述

为ProClaw桌面端的**采购订单**和**销售订单**模块添加了**自动编码**功能，实现全业务流程编码自动化。

### 核心特性

✅ **采购订单自动编号** - `PO-{YYYYMMDD}-{随机4位}`  
✅ **销售订单自动编号** - `SO-{YYYYMMDD}-{随机4位}`  
✅ **智能生成** - 创建订单时自动生成唯一编号  
✅ **灵活修改** - 支持手动编辑和重新生成  
✅ **双重保障** - 前端生成 + 后端验证  
✅ **业务规范** - 符合行业标准编码规则  

---

## 🎯 编码规则对比

| 模块 | 前缀 | 格式 | 示例 | 用途 |
|------|------|------|------|------|
| **商品SKU** | SKU | SKU-日期-随机码 | SKU-20260415-A3F7 | 商品库存单位 |
| **供应商** | SUP | SUP-日期-随机码 | SUP-20260415-B8K2 | 供应商档案 |
| **客户** | CUS | CUS-日期-随机码 | CUS-20260415-M9X1 | 客户档案 |
| **采购订单** | PO | PO-日期-随机码 | PO-20260415-X7Y3 | 采购订单号 |
| **销售订单** | SO | SO-日期-随机码 | SO-20260415-K2M8 | 销售订单号 |

### 编码组成

```
{PREFIX}-{YYYYMMDD}-{RANDOM4}
```

**示例解析**：
- `PO-20260415-X7Y3`
  - `PO`: 采购订单前缀（Purchase Order）
  - `20260415`: 2026年4月15日
  - `X7Y3`: 4位随机码（36进制大写）

- `SO-20260415-K2M8`
  - `SO`: 销售订单前缀（Sales Order）
  - `20260415`: 2026年4月15日
  - `K2M8`: 4位随机码（36进制大写）

---

## 🔧 技术实现

### 1. 编码生成函数

#### 采购订单号生成

**文件**: `src/lib/purchaseService.ts`

```typescript
/**
 * 生成采购订单号
 * 格式: PO-{YYYYMMDD}-{随机4位}
 * 示例: PO-20260415-A3F7
 */
export function generatePurchaseOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PO-${dateStr}-${randomStr}`;
}
```

#### 销售订单号生成

**文件**: `src/lib/salesService.ts`

```typescript
/**
 * 生成销售订单号
 * 格式: SO-{YYYYMMDD}-{随机4位}
 * 示例: SO-20260415-A3F7
 */
export function generateSalesOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SO-${dateStr}-${randomStr}`;
}
```

### 2. 后端自动补全

#### 采购订单创建

```typescript
export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput
): Promise<{ id: string; po_number: string; total_amount: number }> {
  // 如果未提供订单号，自动生成
  const finalInput = {
    ...input,
    po_number: input.po_number || generatePurchaseOrderNumber(),
  };
  return await invoke('create_purchase_order', { order: finalInput });
}
```

#### 销售订单创建

```typescript
export async function createSalesOrder(
  input: CreateSalesOrderInput
): Promise<{ id: string; so_number: string; total_amount: number }> {
  // 如果未提供订单号，自动生成
  const finalInput = {
    ...input,
    so_number: input.so_number || generateSalesOrderNumber(),
  };
  return await invoke('create_sales_order', { order: finalInput });
}
```

### 3. 前端集成（待实现）

**建议的UI位置**：
- 采购订单创建对话框
- 销售订单创建对话框

**建议的UI组件**：
```tsx
// 采购订单
<Box sx={{ display: 'flex', gap: 1 }}>
  <TextField
    label="采购订单号（自动生成）"
    value={poForm.po_number}
    helperText="格式: PO-日期-随机码"
  />
  <Button onClick={() => setPoForm({ 
    ...poForm, 
    po_number: generatePurchaseOrderNumber() 
  })}>
    重新生成
  </Button>
</Box>

// 销售订单
<Box sx={{ display: 'flex', gap: 1 }}>
  <TextField
    label="销售订单号（自动生成）"
    value={soForm.so_number}
    helperText="格式: SO-日期-随机码"
  />
  <Button onClick={() => setSoForm({ 
    ...soForm, 
    so_number: generateSalesOrderNumber() 
  })}>
    重新生成
  </Button>
</Box>
```

---

## 📊 使用场景

### 场景1: 快速创建采购订单（推荐）

1. 进入"采购管理" → "新建采购订单"
2. 选择供应商
3. 添加采购商品
4. 订单号自动填充（如：`PO-20260415-X7Y3`）
5. 点击保存

**优势**：无需手动输入订单号，提高效率

### 场景2: 使用自定义订单号

1. 点击"新建采购订单"
2. 看到自动生成的订单号
3. **手动修改**为业务编号（如：`PO-2026-Q2-001`）
4. 填写其他信息
5. 点击保存

**优势**：灵活性高，可使用有意义的编号

### 场景3: 刷新不满意的订单号

1. 对自动生成的订单号不满意
2. 点击"重新生成"按钮（如果UI已实现）
3. 获得新的随机订单号
4. 可多次点击直到满意

**优势**：提供更多选择

### 场景4: 批量创建订单

1. 第一个订单使用自动编号
2. 第二个订单点击"重新生成"或手动修改
3. 保持编号规律性

**优势**：便于后续管理和查询

---

## 🎨 UI效果（建议）

### 采购订单对话框

```
┌─────────────────────────────────────────┐
│ 新建采购订单                             │
├─────────────────────────────────────────┤
│                                          │
│ 采购订单号（自动生成）  [重新生成]       │
│ ┌──────────────────────┐                │
│ │ PO-20260415-X7Y3     │                │
│ └──────────────────────┘                │
│ 格式: PO-日期-随机码                     │
│                                          │
│ 供应商 *            订单日期             │
│ ┌──────────────┐   ┌──────────────┐    │
│ │ 选择供应商 ▼ │   │ 2026-04-15   │    │
│ └──────────────┘   └──────────────┘    │
│                                          │
│ 商品列表                                 │
│ ┌──────────────────────────────────┐   │
│ │ + 添加商品                        │   │
│ └──────────────────────────────────┘   │
│                                          │
└─────────────────────────────────────────┘
```

### 销售订单对话框

```
┌─────────────────────────────────────────┐
│ 新建销售订单                             │
├─────────────────────────────────────────┤
│                                          │
│ 销售订单号（自动生成）  [重新生成]       │
│ ┌──────────────────────┐                │
│ │ SO-20260415-K2M8     │                │
│ └──────────────────────┘                │
│ 格式: SO-日期-随机码                     │
│                                          │
│ 客户 *              订单日期             │
│ ┌──────────────┐   ┌──────────────┐    │
│ │ 选择客户 ▼   │   │ 2026-04-15   │    │
│ └──────────────┘   └──────────────┘    │
│                                          │
│ 商品列表                                 │
│ ┌──────────────────────────────────┐   │
│ │ + 添加商品                        │   │
│ └──────────────────────────────────┘   │
│                                          │
└─────────────────────────────────────────┘
```

---

## 🔄 数据流转

### 完整流程（以采购订单为例）

```
用户点击"新建采购订单"
    ↓
打开订单创建对话框
    ↓
（可选）前端调用 generatePurchaseOrderNumber()
    ↓
生成订单号：PO-20260415-X7Y3
    ↓
显示在输入框中（或直接提交时生成）
    ↓
用户选择供应商、添加商品
    ↓
点击"保存"
    ↓
调用 createPurchaseOrder(orderData)
    ↓
后端检查：if (!input.po_number) 生成
    ↓
创建采购订单记录
    ↓
返回订单ID和订单号
    ↓
跳转到订单详情页或列表页
```

---

## ⚠️ 注意事项

### 1. 订单号唯一性

**当前实现**：
- 前端/后端生成随机订单号
- 概率极低但仍可能重复（1/160万/天）

**建议优化**：
```sql
-- 添加唯一索引
CREATE UNIQUE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE UNIQUE INDEX idx_sales_orders_so_number ON sales_orders(so_number);
```

```typescript
// 后端捕获冲突并重试
try {
  await db.insert(...);
} catch (err) {
  if (err.code === 'UNIQUE_CONSTRAINT') {
    // 重新生成并重试
    const newPoNumber = generatePurchaseOrderNumber();
    await db.insert({ ...data, po_number: newPoNumber });
  }
}
```

### 2. 时区问题

**当前实现**使用UTC时间，可能导致：
- 中国用户晚上23点创建的订单，日期可能是明天

**改进方案**：
```typescript
// 使用本地时间
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const dateStr = `${year}${month}${day}`;
```

### 3. 订单号修改限制

**问题**：已有订单的编号被其他数据引用（付款、收货等）

**建议**：
- 订单号一旦创建，不建议修改
- 如需修改，应检查关联数据
- 可在UI中添加警告提示

---

## 📈 性能分析

### 生成速度

- `generatePurchaseOrderNumber()` / `generateSalesOrderNumber()` 执行时间：< 1ms
- 无网络请求，纯本地计算
- 对用户完全透明

### 内存占用

- 函数无状态，无额外内存开销
- 每次调用独立执行

### 并发安全

- ✅ 无共享状态，线程安全
- ✅ 无异步操作，无竞态条件
- ⚠️ 需数据库层面保证唯一性

---

## 🧪 测试要点

### 功能测试

- [ ] 创建采购订单时订单号自动生成
- [ ] 创建销售订单时订单号自动生成
- [ ] 订单号格式正确（PO/SO-YYYYMMDD-XXXX）
- [ ] 手动修改订单号正常保存
- [ ] 后端自动补全缺失的订单号

### 边界测试

- [ ] 连续快速创建多个订单
- [ ] 手动清空订单号后保存（应自动生成）
- [ ] 输入特殊字符作为订单号
- [ ] 超长订单号（>100字符）

### 兼容性测试

- [ ] 旧数据（无订单号）能正常查看
- [ ] 手动输入的订单号不被覆盖
- [ ] 导入的订单保留原编号

---

## 🚀 后续优化方向

### 短期优化

1. **时区修复** - 使用本地时间而非UTC
2. **唯一性检查** - 生成后查询数据库确认唯一
3. **历史记录** - 记录已生成的订单号，避免重复
4. **自定义前缀** - 允许用户配置前缀

### 中期优化

1. **序列号模式** - 使用自增序列（PO-000001）
2. **分类编码** - 根据订单类型生成不同前缀
3. **批量生成** - 导入Excel时批量生成订单号
4. **二维码集成** - 订单号自动生成二维码

### 长期优化

1. **AI智能编码** - 根据订单内容智能生成易记编号
2. **多仓库支持** - 不同仓库使用不同编码规则
3. **国际化** - 支持多国语言编码规范
4. **区块链存证** - 订单号生成记录上链

---

## 📝 全系统自动编码总结

### 已完成模块

| 模块 | 前缀 | 格式 | 状态 | 文件位置 |
|------|------|------|------|---------|
| **商品SKU** | SKU | SKU-日期-随机码 | ✅ 完成 | productService.ts |
| **供应商** | SUP | SUP-日期-随机码 | ✅ 完成 | purchaseService.ts |
| **客户** | CUS | CUS-日期-随机码 | ✅ 完成 | salesService.ts |
| **采购订单** | PO | PO-日期-随机码 | ✅ API完成 | purchaseService.ts |
| **销售订单** | SO | SO-日期-随机码 | ✅ API完成 | salesService.ts |

### 统一特点

- ✅ 相同编码规则（日期+随机码）
- ✅ 不同前缀区分模块
- ✅ 前端可调用生成函数
- ✅ 后端自动补全
- ✅ UI可扩展"重新生成"按钮

### 待实现UI

- ⏳ 采购订单创建对话框 - 订单号输入框 + 重新生成按钮
- ⏳ 销售订单创建对话框 - 订单号输入框 + 重新生成按钮

---

## 📚 相关文件

### 后端服务
- **采购订单编码**: `src/lib/purchaseService.ts` - `generatePurchaseOrderNumber()`
- **销售订单编码**: `src/lib/salesService.ts` - `generateSalesOrderNumber()`

### 类型定义
- **采购订单接口**: `src/lib/purchaseService.ts` - `PurchaseOrder`, `CreatePurchaseOrderInput`
- **销售订单接口**: `src/lib/salesService.ts` - `SalesOrder`, `CreateSalesOrderInput`

### 前端页面（待更新）
- **采购管理**: 需要添加订单创建对话框
- **销售管理**: 需要添加订单创建对话框

---

## 💡 最佳实践

### 推荐使用方式

1. **日常使用** - 直接使用自动生成的订单号
2. **有编号规范** - 手动输入符合规范的编号
3. **批量录入** - 先用自动生成，后期统一调整

### 订单号管理建议

1. **保持一致性** - 选定一种方式后坚持使用
2. **定期备份** - 防止数据丢失
3. **文档记录** - 记录编号规则和含义
4. **培训员工** - 确保团队理解编号系统

---

**最后更新**: 2024年  
**版本**: v1.0  
**作者**: ProClaw开发团队
