# 供应商和客户自动编码功能

## 📋 功能概述

为ProClaw桌面端的**供应商管理**和**客户管理**模块添加了**自动编码**功能，实现全系统编码规范统一。

### 核心特性

✅ **供应商自动编码** - `SUP-{YYYYMMDD}-{随机4位}`  
✅ **客户自动编码** - `CUS-{YYYYMMDD}-{随机4位}`  
✅ **智能生成** - 新建时自动生成唯一编码  
✅ **灵活修改** - 支持手动编辑和重新生成  
✅ **双重保障** - 前端生成 + 后端验证  
✅ **UI友好** - 清晰的提示和一键刷新  

---

## 🎯 编码规则对比

| 模块 | 前缀 | 格式 | 示例 | 用途 |
|------|------|------|------|------|
| **商品SKU** | SKU | SKU-日期-随机码 | SKU-20260415-A3F7 | 商品库存单位 |
| **供应商** | SUP | SUP-日期-随机码 | SUP-20260415-B8K2 | 供应商档案 |
| **客户** | CUS | CUS-日期-随机码 | CUS-20260415-M9X1 | 客户档案 |

### 编码组成

```
{PREFIX}-{YYYYMMDD}-{RANDOM4}
```

**示例解析**：
- `SUP-20260415-A3F7`
  - `SUP`: 供应商前缀（Supplier）
  - `20260415`: 2026年4月15日
  - `A3F7`: 4位随机码（36进制大写）

---

## 🔧 技术实现

### 1. 编码生成函数

#### 供应商编码生成

**文件**: `src/lib/purchaseService.ts`

```typescript
/**
 * 生成供应商编码
 * 格式: SUP-{YYYYMMDD}-{随机4位}
 * 示例: SUP-20260415-A3F7
 */
export function generateSupplierCode(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SUP-${dateStr}-${randomStr}`;
}
```

#### 客户编码生成

**文件**: `src/lib/salesService.ts`

```typescript
/**
 * 生成客户编码
 * 格式: CUS-{YYYYMMDD}-{随机4位}
 * 示例: CUS-20260415-A3F7
 */
export function generateCustomerCode(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CUS-${dateStr}-${randomStr}`;
}
```

### 2. 后端自动补全

#### 供应商创建

```typescript
export async function createSupplier(
  input: CreateSupplierInput
): Promise<{ id: string; name: string; code: string }> {
  // 如果未提供编码，自动生成
  const finalInput = {
    ...input,
    code: input.code || generateSupplierCode(),
  };
  return await invoke('create_supplier', { supplier: finalInput });
}
```

#### 客户创建

```typescript
export async function createCustomer(
  input: CreateCustomerInput
): Promise<{ id: string; name: string; code: string }> {
  // 如果未提供编码，自动生成
  const finalInput = {
    ...input,
    code: input.code || generateCustomerCode(),
  };
  return await invoke('create_customer', { customer: finalInput });
}
```

### 3. 前端UI集成

#### 供应商对话框

**文件**: `src/pages/InventoryPage.tsx`

```typescript
// 打开供应商对话框（自动生成编码）
const handleOpenSupplierDialog = () => {
  setSupplierForm({
    name: '',
    code: generateSupplierCode(), // 自动生成编码
    contact_person: '',
    phone: '',
    // ...其他字段
  });
  setSupplierDialogOpen(true);
};
```

**UI组件**：
```tsx
<Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
  <TextField
    label="供应商编码（自动生成）"
    value={supplierForm.code}
    helperText="格式: SUP-日期-随机码"
  />
  <Button
    onClick={() => setSupplierForm({ 
      ...supplierForm, 
      code: generateSupplierCode() 
    })}
  >
    重新生成
  </Button>
</Box>
```

#### 客户对话框

```typescript
// 打开客户对话框（自动生成编码）
const handleOpenCustomerDialog = () => {
  setCustomerForm({
    name: '',
    code: generateCustomerCode(), // 自动生成编码
    contact_person: '',
    phone: '',
    // ...其他字段
  });
  setCustomerDialogOpen(true);
};
```

---

## 📊 使用场景

### 场景1: 快速录入供应商（推荐）

1. 进入"库存管理" → "供应商"标签
2. 点击"新增供应商"
3. 编码自动填充（如：`SUP-20260415-A3F7`）
4. 填写供应商名称等信息
5. 点击保存

**优势**：无需思考编码，系统自动生成

### 场景2: 使用自定义供应商编码

1. 点击"新增供应商"
2. 看到自动生成的编码
3. **手动修改**为业务编码（如：`SUPPLIER-APPLE-001`）
4. 填写其他信息
5. 点击保存

**优势**：灵活性高，可使用有意义的编码

### 场景3: 刷新不满意的编码

1. 对自动生成的编码不满意
2. 点击"重新生成"按钮
3. 获得新的随机编码
4. 可多次点击直到满意

**优势**：提供更多选择

### 场景4: 批量录入供应商

1. 第一个供应商使用自动编码
2. 第二个供应商点击"重新生成"
3. 或者手动修改后缀保持规律

**优势**：保持编码规律性

---

## 🎨 UI效果

### 供应商对话框

```
┌─────────────────────────────────────────┐
│ 新增供应商                               │
├─────────────────────────────────────────┤
│                                          │
│ 供应商名称 *                             │
│ ┌──────────────────────┐                │
│ │                      │                │
│ └──────────────────────┘                │
│                                          │
│ 供应商编码（自动生成）  [重新生成]       │
│ ┌──────────────────────┐                │
│ │ SUP-20260415-A3F7    │                │
│ └──────────────────────┘                │
│ 格式: SUP-日期-随机码                    │
│                                          │
│ 联系人              电话                 │
│ ┌──────────────┐   ┌──────────────┐    │
│ │              │   │              │    │
│ └──────────────┘   └──────────────┘    │
│                                          │
└─────────────────────────────────────────┘
```

### 客户对话框

```
┌─────────────────────────────────────────┐
│ 新增客户                                 │
├─────────────────────────────────────────┤
│                                          │
│ 客户名称 *            客户类型           │
│ ┌──────────────┐   ┌──────────────┐    │
│ │              │   │ 企业 ▼       │    │
│ └──────────────┘   └──────────────┘    │
│                                          │
│ 客户编码（自动生成）  [重新生成]         │
│ ┌──────────────────────┐                │
│ │ CUS-20260415-B8K2    │                │
│ └──────────────────────┘                │
│ 格式: CUS-日期-随机码                    │
│                                          │
└─────────────────────────────────────────┘
```

---

## 🔄 数据流转

### 完整流程（以供应商为例）

```
用户点击"新增供应商"
    ↓
触发 handleOpenSupplierDialog()
    ↓
调用 generateSupplierCode()
    ↓
生成编码：SUP-20260415-A3F7
    ↓
填充到 supplierForm.code
    ↓
显示在输入框中
    ↓
用户可以：
  1. 直接使用（推荐）
  2. 手动修改
  3. 点击"重新生成"
    ↓
用户填写其他信息
    ↓
点击"保存"
    ↓
调用 createSupplier(supplierForm)
    ↓
后端检查：if (!input.code) 生成
    ↓
创建供应商记录
    ↓
返回列表页
```

---

## ⚠️ 注意事项

### 1. 编码唯一性

**当前实现**：
- 前端生成随机编码
- 后端再次检查并补全
- 概率极低但仍可能重复（1/160万/天）

**建议优化**：
```sql
-- 添加唯一索引
CREATE UNIQUE INDEX idx_suppliers_code ON suppliers(code);
CREATE UNIQUE INDEX idx_customers_code ON customers(code);
```

```typescript
// 后端捕获冲突并重试
try {
  await db.insert(...);
} catch (err) {
  if (err.code === 'UNIQUE_CONSTRAINT') {
    // 重新生成并重试
    const newCode = generateSupplierCode();
    await db.insert({ ...data, code: newCode });
  }
}
```

### 2. 时区问题

**当前实现**使用UTC时间，可能导致：
- 中国用户晚上23点创建的记录，日期可能是明天

**改进方案**：
```typescript
// 使用本地时间
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const dateStr = `${year}${month}${day}`;
```

### 3. 编码修改限制

**问题**：已有供应商/客户的编码被其他数据引用

**建议**：
- 编码一旦创建，不建议修改
- 如需修改，应检查关联数据（订单、合同等）
- 可在UI中添加警告提示

---

## 📈 性能分析

### 生成速度

- `generateSupplierCode()` / `generateCustomerCode()` 执行时间：< 1ms
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

- [ ] 新建供应商时编码自动填充
- [ ] 新建客户时编码自动填充
- [ ] 编码格式正确（SUP/CUS-YYYYMMDD-XXXX）
- [ ] 点击"重新生成"获得新编码
- [ ] 手动修改编码正常保存
- [ ] 后端自动补全缺失的编码

### 边界测试

- [ ] 连续快速点击"重新生成"
- [ ] 手动清空编码后保存（应自动生成）
- [ ] 输入特殊字符作为编码
- [ ] 超长编码（>100字符）

### 兼容性测试

- [ ] 旧数据（无编码）能正常编辑
- [ ] 手动输入的编码不被覆盖
- [ ] 导入的数据保留原编码

---

## 🚀 后续优化方向

### 短期优化

1. **时区修复** - 使用本地时间而非UTC
2. **唯一性检查** - 生成后查询数据库确认唯一
3. **历史记录** - 记录已生成的编码，避免重复
4. **自定义前缀** - 允许用户配置前缀

### 中期优化

1. **序列号模式** - 使用自增序列（SUP-000001）
2. **分类编码** - 根据供应商/客户类型生成不同前缀
3. **批量生成** - 导入Excel时批量生成编码
4. **二维码集成** - 编码自动生成二维码

### 长期优化

1. **AI智能编码** - 根据名称智能生成易记编码
2. **多仓库支持** - 不同仓库使用不同编码规则
3. **国际化** - 支持多国语言编码规范
4. **区块链存证** - 编码生成记录上链

---

## 📝 全系统编码规范总结

| 模块 | 前缀 | 格式 | 示例 | 文件位置 |
|------|------|------|------|---------|
| **商品SKU** | SKU | SKU-日期-随机码 | SKU-20260415-A3F7 | productService.ts |
| **供应商** | SUP | SUP-日期-随机码 | SUP-20260415-B8K2 | purchaseService.ts |
| **客户** | CUS | CUS-日期-随机码 | CUS-20260415-M9X1 | salesService.ts |

**统一特点**：
- ✅ 相同编码规则（日期+随机码）
- ✅ 不同前缀区分模块
- ✅ 前端自动生成
- ✅ 后端自动补全
- ✅ UI支持重新生成

---

## 📚 相关文件

### 后端服务
- **供应商编码**: `src/lib/purchaseService.ts` - `generateSupplierCode()`
- **客户编码**: `src/lib/salesService.ts` - `generateCustomerCode()`

### 前端页面
- **库存管理**: `src/pages/InventoryPage.tsx` - UI集成

### 类型定义
- **供应商接口**: `src/lib/purchaseService.ts` - `Supplier`, `CreateSupplierInput`
- **客户接口**: `src/lib/salesService.ts` - `Customer`, `CreateCustomerInput`

---

## 💡 最佳实践

### 推荐使用方式

1. **小商家** - 直接使用自动生成的编码
2. **有编码规范** - 手动输入符合规范的编码
3. **批量录入** - 先用自动生成，后期统一调整

### 编码管理建议

1. **保持一致性** - 选定一种方式后坚持使用
2. **定期备份** - 防止数据丢失
3. **文档记录** - 记录编码规则和含义
4. **培训员工** - 确保团队理解编码系统

---

**最后更新**: 2024年  
**版本**: v1.0  
**作者**: ProClaw开发团队
