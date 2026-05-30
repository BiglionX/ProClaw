# 商品编号自动生成功能

## 📋 功能概述

ProClaw v3.0.1 新增了商品编号(SPU Code和SKU Code)自动生成功能,用户在创建商品时可以选择:
- ✅ **手动输入** - 完全自定义编号
- ✅ **自动生成** - 系统智能生成唯一编号

---

## 🎯 编码规则

### SPU Code (商品编码)
**格式**: `SPU-{YYYYMMDD}-{随机4位}`

**示例**:
- `SPU-20260415-A3F7`
- `SPU-20260415-B8K2`
- `SPU-20260416-C9M5`

**说明**:
- `SPU-`: 固定前缀
- `YYYYMMDD`: 创建日期(2026年04月15日)
- `随机4位`: 基于时间戳生成的随机字符串(避免同一天重复)

### SKU Code (规格编码)
**格式**: `SKU-{SPU_CODE后8位}-{序号}`

**示例**:
- `SKU-20260415-A3F7-01` (第1个SKU)
- `SKU-20260415-A3F7-02` (第2个SKU)
- `SKU-20260415-A3F7-03` (第3个SKU)

**说明**:
- `SKU-`: 固定前缀
- `{SPU_CODE后8位}`: 关联的SPU code后8位(日期+随机码)
- `{序号}`: SKU在该SPU中的序号(从01开始)

### Spec Text (规格文本)
**格式**: 自动从specifications对象提取值,用`/`连接

**示例**:
```typescript
// 输入
{ "颜色": "红色", "尺寸": "L" }

// 输出
"红色/L"
```

---

## 💻 使用示例

### 方式1: 完全自动生成(推荐)

```typescript
import { createProductSPU } from '@/lib/productService';

// 只需提供商品信息,编码自动生成
const result = await createProductSPU(
  {
    // spu_code 不提供,系统自动生成如: SPU-20260415-A3F7
    name: 'iPhone 15 Pro',
    subtitle: '钛金属设计',
    description: '全新iPhone 15 Pro...',
    category_id: 'cat_electronics',
    brand_id: 'brand_apple',
    unit: '台',
    weight: 0.187,
    is_on_sale: true,
  },
  [
    {
      // sku_code 不提供,系统自动生成如: SKU-20260415-A3F7-01
      specifications: { '颜色': '黑色', '容量': '128GB' },
      // spec_text 不提供,系统自动生成: "黑色/128GB"
      cost_price: 6500,
      sell_price: 7999,
      market_price: 8999,
      current_stock: 50,
      min_stock: 10,
      barcode: 'IP15P128BLK',
      is_default: true,
    },
    {
      // 第二个SKU,自动生成: SKU-20260415-A3F7-02
      specifications: { '颜色': '蓝色', '容量': '256GB' },
      // 自动生成: "蓝色/256GB"
      cost_price: 7200,
      sell_price: 8999,
      current_stock: 30,
    },
  ],
  [
    'https://example.com/iphone15-main.jpg',
    'https://example.com/iphone15-side.jpg',
  ]
);

console.log('创建的SPU Code:', result.spu_code); 
// 输出: SPU-20260415-A3F7

console.log('SKU Codes:', result.skus?.map(s => s.sku_code));
// 输出: ['SKU-20260415-A3F7-01', 'SKU-20260415-A3F7-02']
```

### 方式2: 混合模式(SPU手动,SKU自动)

```typescript
const result = await createProductSPU(
  {
    spu_code: 'SPU-IPHONE15PRO', // 手动指定
    name: 'iPhone 15 Pro',
    // ... 其他字段
  },
  [
    {
      // sku_code 不提供,基于SPU code生成: SKU-IPHONE15PRO-01
      specifications: { '颜色': '黑色' },
      cost_price: 6500,
      sell_price: 7999,
    },
    {
      // 自动生成: SKU-IPHONE15PRO-02
      specifications: { '颜色': '白色' },
      cost_price: 6500,
      sell_price: 7999,
    },
  ],
  []
);
```

### 方式3: 完全手动控制

```typescript
const result = await createProductSPU(
  {
    spu_code: 'SPU-CUSTOM-001', // 完全自定义
    name: '定制商品',
    // ... 其他字段
  },
  [
    {
      sku_code: 'SKU-CUSTOM-RED-L', // 完全自定义
      specifications: { '颜色': '红色', '尺寸': 'L' },
      spec_text: '红色/L', // 也可以自定义
      cost_price: 100,
      sell_price: 199,
    },
  ],
  []
);
```

---

## 🎨 前端UI实现建议

### 复选框设计

在商品编辑表单中添加:

```tsx
<Box sx={{ mb: 2 }}>
  <FormControlLabel
    control={
      <Checkbox
        checked={autoGenerateCode}
        onChange={(e) => setAutoGenerateCode(e.target.checked)}
      />
    }
    label="自动生成商品编号 (推荐)"
  />
  <Typography variant="caption" color="text.secondary">
    勾选后系统将自动生成唯一的SPU和SKU编号
  </Typography>
</Box>

{/* 根据选择显示/隐藏编码输入框 */}
{!autoGenerateCode && (
  <TextField
    label="SPU 编码"
    value={formData.spu_code}
    onChange={(e) => setFormData({ ...formData, spu_code: e.target.value })}
    required
    helperText="例如: SPU-IPHONE15PRO"
  />
)}
```

### SKU表格中的编码列

```tsx
<Table>
  <TableHead>
    <TableRow>
      <TableCell>SKU 编码</TableCell>
      <TableCell>规格</TableCell>
      <TableCell>价格</TableCell>
      {/* ... */}
    </TableRow>
  </TableHead>
  <TableBody>
    {skus.map((sku, index) => (
      <TableRow key={index}>
        <TableCell>
          {autoGenerateCode ? (
            <Typography variant="body2" color="text.secondary">
              自动生成
            </Typography>
          ) : (
            <TextField
              size="small"
              value={sku.sku_code || ''}
              onChange={(e) => updateSku(index, 'sku_code', e.target.value)}
              placeholder={`SKU-XXX-${String(index + 1).padStart(2, '0')}`}
            />
          )}
        </TableCell>
        {/* ... 其他列 */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 🔧 辅助函数

productService.ts 导出了3个辅助函数,可在需要时单独使用:

### generateSPUCode()
```typescript
import { generateSPUCode } from '@/lib/productService';

const code = generateSPUCode();
console.log(code); // "SPU-20260415-A3F7"
```

### generateSKUCode(spuCode, index)
```typescript
import { generateSKUCode } from '@/lib/productService';

const code = generateSKUCode('SPU-20260415-A3F7', 0);
console.log(code); // "SKU-20260415-A3F7-01"
```

### generateSpecText(specifications)
```typescript
import { generateSpecText } from '@/lib/productService';

const text = generateSpecText({ '颜色': '红色', '尺寸': 'L' });
console.log(text); // "红色/L"
```

---

## ⚠️ 注意事项

### 1. 编码唯一性
- SPU Code必须全局唯一(数据库有UNIQUE约束)
- SKU Code必须全局唯一(数据库有UNIQUE约束)
- 自动生成的编码基于时间戳+随机数,冲突概率极低

### 2. 编码不可修改
- 创建后不建议修改SPU/SKU Code
- 会影响订单、库存等关联数据
- 如需修改,请删除重建

### 3. 条形码 vs SKU Code
- `barcode`: 商品条形码(可扫描),可选
- `sku_code`: 内部库存编码,必填
- 两者可以不同,建议都填写

### 4. 批量导入
如果使用CSV/Excel批量导入:
- 可以留空spu_code和sku_code列
- 系统会自动生成
- 或在模板中预先定义好编码

---

## 📊 编码优势

### 自动生成的好处
✅ **避免重复** - 系统保证唯一性  
✅ **节省时间** - 无需手动构思编码规则  
✅ **规范统一** - 所有商品编码格式一致  
✅ **包含日期** - 便于按时间追溯  
✅ **易于识别** - 从编码可看出创建时间  

### 手动输入的场景
🔧 **迁移旧数据** - 保持原有编码体系  
🔧 **特殊业务需求** - 需要特定编码规则  
🔧 **外部系统对接** - 需与第三方编码对应  

---

## 🎯 最佳实践

### 推荐方案
对于大多数场景,**推荐使用自动生成**:

```typescript
// ✅ 推荐: 让系统处理编码
await createProductSPU(
  {
    name: '商品名称',
    // 不提供 spu_code
  },
  skus.map(sku => ({
    specifications: sku.specs,
    // 不提供 sku_code
    cost_price: sku.cost,
    sell_price: sku.price,
  })),
  images
);
```

### 特殊情况
仅在以下情况手动指定编码:
1. 从旧系统迁移数据
2. 公司有统一的编码规范
3. 需要与ERP/WMS系统同步

---

## 🔄 版本历史

- **v3.0.1** (2026-04-15): 新增自动生成编码功能
- **v3.0.0** (2026-04-15): SPU-SKU结构升级

---

**最后更新**: 2026-04-15  
**维护者**: ProClaw Team
