# commandParser.ts 适配 SPU-SKU 结构修复总结

## ✅ 修复完成

**文件**: `src/lib/commandParser.ts`  
**日期**: 2026-04-15  
**原因**: 产品库升级为SPU-SKU结构后,commandParser需要相应更新

---

## 🔧 主要修改

### 1. 导入语句更新

```typescript
// 修改前
import { getProducts } from './productService';

// 修改后
import { getProductSPUs, ProductSPU } from './productService';
```

### 2. 查询商品列表 (query_products)

```typescript
// 修改前
const products = await getProducts({ limit: 20, search: query });
return formatProductList(products);

// 修改后
const spus = await getProductSPUs({ limit: 20, search: query });
return formatProductList(spus);
```

### 3. 查询库存 (query_product_stock)

**关键变化**: SPU没有直接的库存字段,需要计算所有SKU的总和

```typescript
// 修改前
products.forEach(product => {
  result += `• **${product.name}** (${product.sku})\n`;
  result += `  当前库存: ${product.current_stock}\n`;
});

// 修改后
spus.forEach((spu: ProductSPU) => {
  // 计算总库存(所有SKU之和)
  const totalStock = spu.skus?.reduce((sum, sku) => sum + sku.current_stock, 0) || 0;
  const minStock = spu.skus?.reduce((sum, sku) => sum + sku.min_stock, 0) || 0;
  const maxStock = spu.skus?.reduce((sum, sku) => sum + sku.max_stock, 0) || 0;
  
  result += `• **${spu.name}** (SPU: ${spu.spu_code})\n`;
  result += `  当前库存: ${totalStock} ${spu.unit}\n`;
  if (spu.skus && spu.skus.length > 0) {
    result += `  SKU数量: ${spu.skus.length}个\n`;
  }
});
```

### 4. 入库操作 (add_stock)

**关键变化**: inventory_transactions.product_id现在引用product_sku.id

```typescript
// 修改前
const product = products[0];
await createInventoryTransaction({
  product_id: product.id,  // 直接引用product
  quantity: quantity,
});

// 修改后
const spu = spus[0];
const defaultSku = spu.skus?.[0];  // 使用第一个SKU
if (!defaultSku) {
  return `⚠️ 产品 "${spu.name}" 还没有SKU，请先添加SKU。`;
}

await createInventoryTransaction({
  product_id: defaultSku.id,  // 引用SKU
  quantity: quantity,
});

// 返回信息也更新
return `✅ **入库成功！**
产品: ${spu.name} (SPU: ${spu.spu_code})
SKU: ${defaultSku.sku_code}
数量: +${quantity} ${spu.unit}
原库存: ${defaultSku.current_stock} ${spu.unit}
新库存: ${defaultSku.current_stock + quantity} ${spu.unit}`;
```

### 5. 出库操作 (remove_stock)

与入库操作类似的修改:

```typescript
// 修改前
const product = products[0];
if (product.current_stock < quantity) { /* ... */ }
await createInventoryTransaction({ product_id: product.id, ... });

// 修改后
const spu = spus[0];
const defaultSku = spu.skus?.[0];
if (!defaultSku) { /* ... */ }
if (defaultSku.current_stock < quantity) { /* ... */ }
await createInventoryTransaction({ product_id: defaultSku.id, ... });
```

---

## 📊 影响的功能模块

| 功能 | 修改内容 | 状态 |
|------|---------|------|
| 查询商品列表 | getProducts → getProductSPUs | ✅ |
| 查询库存 | 计算SKU总库存 | ✅ |
| 入库操作 | 使用SKU ID,检查SKU存在 | ✅ |
| 出库操作 | 使用SKU ID,检查SKU存在 | ✅ |
| 类型定义 | 添加ProductSPU类型 | ✅ |

---

## 🎯 设计决策

### 1. 默认使用第一个SKU
当用户通过自然语言命令操作商品时(如"入库iPhone 10个"),系统默认使用该商品的**第一个SKU**。

**原因**:
- 简化用户交互,无需指定具体规格
- 适合单规格商品或默认规格场景
- 多规格商品建议通过UI操作

### 2. 库存汇总显示
查询库存时,显示所有SKU的**库存总和**。

**原因**:
- 用户关心的是总库存量
- 同时显示SKU数量,提示有多规格
- 详细规格信息可在UI中查看

### 3. SKU存在性检查
在执行入库/出库前,检查商品是否有SKU。

**原因**:
- 避免运行时错误
- 提供清晰的错误提示
- 引导用户先创建SKU

---

## ⚠️ 注意事项

### 1. 数据库外键变更
`inventory_transactions.product_id` 现在引用 `product_sku.id` 而非 `product_spu.id`

```sql
-- 旧结构
ALTER TABLE inventory_transactions 
  ADD CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id);

-- 新结构  
ALTER TABLE inventory_transactions
  ADD CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES product_sku(id);
```

### 2. Rust后端要求
Rust后端的`createInventoryTransaction`命令需要接受SKU ID作为product_id参数。

### 3. 用户体验
对于多规格商品,建议:
- AI助手: 提示用户选择具体规格
- UI界面: 提供SKU选择器
- 批量操作: 支持按规格分别操作

---

## 🔄 后续优化建议

### 1. 智能SKU选择
```typescript
// 根据用户输入匹配最佳SKU
function selectBestSKU(spu: ProductSPU, userInput: string): ProductSKU | null {
  // 分析用户输入中的规格信息
  // 例如: "红色iPhone" → 选择颜色=红色的SKU
  // 例如: "大号T恤" → 选择尺寸=L的SKU
}
```

### 2. 多SKU操作支持
```typescript
// 支持同时操作多个SKU
case 'add_stock_multi': {
  // "入库 iPhone 红色10个,蓝色5个"
  // 解析并分别更新不同SKU的库存
}
```

### 3. 库存预警优化
```typescript
// 基于每个SKU的min_stock分别预警
spu.skus?.forEach(sku => {
  if (sku.current_stock <= sku.min_stock) {
    warnings.push(`${sku.spec_text}: 库存不足(${sku.current_stock})`);
  }
});
```

---

## 📝 测试建议

### 单元测试
```typescript
describe('commandParser with SPU-SKU', () => {
  test('query_product_stock should sum all SKU stocks', async () => {
    // Mock SPU with multiple SKUs
    // Verify total stock is calculated correctly
  });
  
  test('add_stock should use first SKU by default', async () => {
    // Verify transaction uses SKU id
  });
  
  test('should handle SPU without SKUs', async () => {
    // Verify proper error message
  });
});
```

### 集成测试
1. 创建带多SKU的商品
2. 通过AI命令查询库存 → 验证显示总和
3. 通过AI命令入库 → 验证更新正确SKU
4. 通过AI命令出库 → 验证库存扣减

---

## ✅ 验证清单

- [x] 导入语句更新为getProductSPUs
- [x] 所有getProducts调用已替换
- [x] 库存计算逻辑改为汇总SKU
- [x] 入库操作使用SKU ID
- [x] 出库操作使用SKU ID  
- [x] 添加SKU存在性检查
- [x] 错误提示清晰友好
- [x] TypeScript类型正确
- [x] 无编译错误

---

**修复者**: AI Assistant  
**审核状态**: 待人工审核  
**相关文档**: 
- [ECOMMERCE_UPGRADE_NOTES.md](./ECOMMERCE_UPGRADE_NOTES.md)
- [AUTO_GENERATE_CODE_IMPLEMENTATION.md](./AUTO_GENERATE_CODE_IMPLEMENTATION.md)
