# 🛍️ ProClaw 电商商品库 v3.0.0

## 📖 概述

ProClaw产品库已升级为标准电商SPU-SKU结构,支持多规格、多图管理、商品属性等核心电商功能。

**版本**: v3.0.0  
**升级日期**: 2026-04-15  
**类型**: 重大架构升级

---

## ✨ 新特性

### 1. SPU-SKU层级结构
- **SPU (Standard Product Unit)**: 标准产品单位,定义商品的通用信息
- **SKU (Stock Keeping Unit)**: 库存量单位,定义具体规格的库存和价格

**示例**: 
- SPU: iPhone 15 Pro (通用信息)
  - SKU 1: 黑色/128GB ¥7,999 库存50
  - SKU 2: 蓝色/256GB ¥8,999 库存30

### 2. 多图管理
- 支持主图 + 轮播图
- 图片排序功能
- 图片描述(alt text)

### 3. 商品属性系统
- 灵活的属性定义(颜色、尺寸、材质等)
- 支持多种类型(text/select/number/boolean)
- 可配置必填项

### 4. SEO优化
- SEO标题
- SEO描述
- SEO关键词

### 5. 物流信息
- 重量(kg)
- 长宽高(cm)

---

## 📁 文件清单

### 数据库文件
```
database/
├── complete_schema.sql          # ✅ 已更新 - 包含新的SPU/SKU表结构
└── migrate_to_ecommerce.sql     # ✅ 新增 - 迁移脚本(含示例数据)
```

### TypeScript代码
```
src/lib/
├── productService.ts            # ✅ 已重写 - SPU/SKU服务层
└── attributeService.ts          # ✅ 新增 - 商品属性服务
```

### 文档
```
docs/
├── ECOMMERCE_UPGRADE_NOTES.md   # ✅ 新增 - 详细升级说明
├── ECOMMERCE_UPGRADE_SUMMARY.md # ✅ 新增 - 升级总结
├── RUST_BACKEND_SPU_SKU_GUIDE.md # ✅ 新增 - Rust后端实现指南
└── guides/
    └── QUICKSTART.md            # ✅ 已更新 - 添加v3.0.0说明
```

---

## 🚀 快速开始

### 1. 执行数据库迁移

```bash
# 方式1: Supabase Dashboard
# - 登录 https://supabase.com
# - 进入 SQL Editor
# - 复制 database/migrate_to_ecommerce.sql 内容并执行

# 方式2: psql命令行
psql -h db.xxx.supabase.co -U postgres -d postgres -f database/migrate_to_ecommerce.sql
```

### 2. 验证迁移结果

```sql
-- 检查表是否创建成功
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'product_%';

-- 应该看到:
-- product_spu
-- product_sku
-- product_images
-- product_attributes
-- product_spu_attributes

-- 检查示例数据
SELECT COUNT(*) as spu_count FROM product_spu;  -- 应该返回 3
SELECT COUNT(*) as sku_count FROM product_sku;  -- 应该返回 11
```

### 3. 使用TypeScript API

```typescript
import { getProductSPUs, createProductSPU } from '@/lib/productService';

// 获取商品列表
const spus = await getProductSPUs({
  limit: 20,
  status: 'on_sale',
});

// 创建新商品
const newSPU = await createProductSPU(
  {
    spu_code: 'SPU-NEW-001',
    name: '新商品',
    // ... 其他字段
  },
  [
    {
      sku_code: 'SKU-NEW-001-A',
      specifications: { '颜色': '红色' },
      spec_text: '红色',
      cost_price: 100,
      sell_price: 199,
      current_stock: 50,
    }
  ],
  ['https://example.com/image1.jpg']
);
```

---

## 📊 数据结构对比

### 旧结构 (v2.0.0)
```
products (单表)
├── id
├── sku
├── name
├── cost_price
├── sell_price
├── current_stock
└── image_url (单张)
```

### 新结构 (v3.0.0)
```
product_spu (SPU层)
├── id
├── spu_code
├── name
├── description
├── weight, length, width, height
├── seo_title, seo_description, seo_keywords
└── is_on_sale, is_featured

product_sku (SKU层)
├── id
├── spu_id (外键)
├── sku_code
├── specifications (JSON)
├── cost_price, sell_price, market_price
└── current_stock, min_stock, max_stock

product_images (图片)
├── id
├── spu_id (外键)
├── image_url
├── image_type (main/gallery)
└── sort_order

product_attributes (属性定义)
├── id
├── name
├── type
└── options

product_spu_attributes (属性值)
├── spu_id
├── attribute_id
└── value_text/value_number/value_boolean
```

---

## ⚠️ 重要提示

### 数据丢失警告
⚠️ **此次升级会删除所有现有产品数据!**

- 迁移前务必备份
- 迁移后需重新录入产品
- 或使用提供的示例数据

### 代码兼容性
❌ 旧的API已废弃,需要更新代码:

```typescript
// 旧API - 已废弃
getProducts()
createProduct()
updateProduct()

// 新API - 请使用
getProductSPUs()
createProductSPU()
updateProductSPU()
```

### Rust后端待实现
前端TypeScript代码已完成,但Rust后端命令尚未实现。

**参考文档**: `docs/RUST_BACKEND_SPU_SKU_GUIDE.md`

预计工作量: 约3小时

---

## 📝 示例数据

迁移脚本会自动创建3个示例商品:

### 1. iPhone 15 Pro
- **SPU Code**: SPU-IPHONE15PRO
- **SKU数量**: 4个
  - 黑色/128GB - ¥7,999
  - 黑色/256GB - ¥8,999
  - 蓝色/128GB - ¥7,999
  - 蓝色/256GB - ¥8,999

### 2. Nike Air Max 270
- **SPU Code**: SPU-NIKE-AIRMAX
- **SKU数量**: 4个
  - 黑色/40码 - ¥899
  - 黑色/41码 - ¥899
  - 黑色/42码 - ¥899
  - 白色/40码 - ¥899

### 3. Cherry MX机械键盘
- **SPU Code**: SPU-MECH-KB-001
- **SKU数量**: 3个
  - 红轴/87键 - ¥599
  - 青轴/87键 - ¥599
  - 茶轴/104键 - ¥649

---

## 🔧 开发指南

### 创建商品SPU

```typescript
import { createProductSPU } from '@/lib/productService';

const result = await createProductSPU(
  // SPU数据
  {
    spu_code: 'SPU-EXAMPLE',
    name: '示例商品',
    subtitle: '副标题',
    description: '商品描述',
    category_id: 'cat_123',
    brand_id: 'brand_456',
    unit: '件',
    weight: 1.5,
    is_on_sale: true,
    is_featured: false,
  },
  // SKU数组
  [
    {
      sku_code: 'SKU-EXAMPLE-001',
      specifications: { '颜色': '红色', '尺寸': 'L' },
      spec_text: '红色/L',
      cost_price: 50,
      sell_price: 99,
      market_price: 129,
      current_stock: 100,
      min_stock: 10,
      barcode: 'BARCODE123',
      is_default: true,
    },
    // ... 更多SKU
  ],
  // 图片URL数组
  [
    'https://example.com/main.jpg',
    'https://example.com/gallery1.jpg',
    'https://example.com/gallery2.jpg',
  ]
);
```

### 获取商品详情

```typescript
import { getProductSPUById } from '@/lib/productService';

const spu = await getProductSPUById('spu_id_here');
console.log(spu.name);
console.log(spu.skus); // SKU数组
console.log(spu.images); // 图片数组
```

### 管理商品属性

```typescript
import { getProductAttributes } from '@/lib/attributeService';

const attributes = await getProductAttributes();
// 返回: [{ id, name, type, options, ... }]
```

---

## 📚 相关文档

- [升级详细说明](./ECOMMERCE_UPGRADE_NOTES.md)
- [升级总结报告](./ECOMMERCE_UPGRADE_SUMMARY.md)
- [Rust后端实现指南](./RUST_BACKEND_SPU_SKU_GUIDE.md)
- [数据库Schema](../database/complete_schema.sql)
- [迁移脚本](../database/migrate_to_ecommerce.sql)
- [快速开始](./guides/QUICKSTART.md)

---

## 🎯 完成度

| 任务 | 状态 | 进度 |
|------|------|------|
| 数据库Schema升级 | ✅ 完成 | 100% |
| TypeScript类型定义 | ✅ 完成 | 100% |
| 辅助服务 | ✅ 完成 | 100% |
| 迁移脚本 | ✅ 完成 | 100% |
| 文档编写 | ✅ 完成 | 100% |
| Rust后端实现 | ⏸️ 待开发 | 0% |
| 前端页面重构 | ⏸️ 待开发 | 0% |

**总体进度**: 约60%

---

## 🆘 常见问题

### Q1: 迁移后旧产品数据去哪了?
A: 旧products表已被删除,数据无法恢复。请提前备份或使用示例数据重新开始。

### Q2: 如何批量导入商品?
A: 目前需要手动创建或编写导入脚本。后续版本将支持CSV/Excel批量导入。

### Q3: Rust后端什么时候实现?
A: 参考 `docs/RUST_BACKEND_SPU_SKU_GUIDE.md`,预计需要3小时开发时间。

### Q4: 前端页面何时更新?
A: ProductsPage.tsx需要完全重构,预计需要6小时开发时间。

---

## 📞 技术支持

如有问题,请查阅:
1. [升级详细说明](./ECOMMERCE_UPGRADE_NOTES.md)
2. [Rust后端实现指南](./RUST_BACKEND_SPU_SKU_GUIDE.md)
3. 提交Issue到GitHub

---

**最后更新**: 2026-04-15  
**维护者**: ProClaw Team  
**许可证**: MIT
