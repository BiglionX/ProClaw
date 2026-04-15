# 产品库电商化升级说明

## 📋 升级概述

**版本**: 2.0.0 → 3.0.0  
**日期**: 2026-04-15  
**类型**: 重大架构升级

本次升级将简单的产品库改造为标准电商商品管理系统,采用SPU-SKU层级结构,支持多规格、多图管理、商品属性等电商核心功能。

---

## 🔄 主要变更

### 1. 数据库结构变更

#### 删除的表
- ❌ `products` - 旧的产品表(单SKU模式)

#### 新增的表
- ✅ `product_spu` - 商品SPU表(标准产品单位)
- ✅ `product_sku` - 商品SKU表(库存量单位)
- ✅ `product_images` - 商品图片表
- ✅ `product_attributes` - 商品属性定义表
- ✅ `product_spu_attributes` - SPU属性值关联表

#### 修改的表
- `inventory_transactions.product_id` → 引用 `product_sku.id`
- `purchase_order_items.product_id` → 引用 `product_sku.id`
- `sales_order_items.product_id` → 引用 `product_sku.id`

### 2. TypeScript接口变更

**文件**: `src/lib/productService.ts`

#### 废弃的接口
```typescript
// 旧接口 - 已废弃
interface Product { ... }
interface CreateProductInput { ... }
interface UpdateProductInput { ... }
```

#### 新增的接口
```typescript
// SPU (标准产品单位)
interface ProductSPU {
  id: string;
  spu_code: string;
  name: string;
  subtitle?: string;
  description?: string;
  category_id?: string;
  brand_id?: string;
  unit: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  is_on_sale: boolean;
  is_featured: boolean;
  sort_order: number;
  status: 'draft' | 'on_sale' | 'off_sale' | 'deleted';
  images?: ProductImage[];
  skus?: ProductSKU[];
  attributes?: SPUAttributeValue[];
  created_at: string;
  updated_at: string;
}

// SKU (库存量单位)
interface ProductSKU {
  id: string;
  spu_id: string;
  sku_code: string;
  specifications: Record<string, string>;
  spec_text: string;
  cost_price: number;
  sell_price: number;
  market_price?: number;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  barcode?: string;
  is_default: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// 商品图片
interface ProductImage {
  id: string;
  spu_id: string;
  image_url: string;
  image_type: 'main' | 'gallery';
  sort_order: number;
  alt_text?: string;
}

// 商品属性
interface ProductAttribute {
  id: string;
  name: string;
  type: 'text' | 'select' | 'number' | 'boolean';
  options?: string[];
  is_required: boolean;
  sort_order: number;
}
```

#### 新增的服务函数
```typescript
// SPU管理
createProductSPU(spuData, skus, images)
getProductSPUs(options)
getProductSPUById(id)
getProductSPUByCode(spuCode)
updateProductSPU(id, updates)
deleteProductSPU(id)

// SKU管理
createProductSKU(spuId, skuData)
updateProductSKU(id, updates)
deleteProductSKU(id)

// 图片管理
uploadProductImages(spuId, imageUrls)
deleteProductImage(imageId)
```

#### 废弃的服务函数
```typescript
// 以下函数已废弃,请使用新的SPU/SKU函数
createProduct()      → createProductSPU()
getProducts()        → getProductSPUs()
getProductById()     → getProductSPUById()
getProductBySku()    → getProductSPUByCode()
updateProduct()      → updateProductSPU()
deleteProduct()      → deleteProductSPU()
```

### 3. 新增辅助服务

**文件**: `src/lib/attributeService.ts`

提供商品属性的CRUD操作:
```typescript
getProductAttributes()
createProductAttribute(attribute)
updateProductAttribute(id, updates)
deleteProductAttribute(id)
```

---

## 📦 迁移脚本

**文件**: `database/migrate_to_ecommerce.sql`

该脚本包含:
1. 删除旧的products表
2. 创建新的SPU/SKU/图片/属性表
3. 更新外键引用
4. 配置RLS策略
5. 插入示例数据

### 示例数据

脚本会自动创建3个示例SPU商品:

1. **iPhone 15 Pro**
   - 4个SKU (黑色/蓝色 × 128GB/256GB)
   - 价格区间: ¥7,999 - ¥8,999

2. **Nike Air Max 270运动鞋**
   - 4个SKU (黑色/白色 × 40/41/42码)
   - 价格: ¥899

3. **Cherry MX机械键盘**
   - 3个SKU (红轴/青轴/茶轴)
   - 价格区间: ¥599 - ¥649

同时创建5个商品属性模板:
- 颜色 (select)
- 尺寸 (select)
- 材质 (select)
- 重量 (number)
- 保修期 (text)

---

## 🚀 执行迁移

### 方式1: Supabase Dashboard (推荐)

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 复制 `database/migrate_to_ecommerce.sql` 全部内容
4. 粘贴并执行
5. 确认成功消息

### 方式2: psql命令行

```bash
psql -h db.xxx.supabase.co -U postgres -d postgres -f database/migrate_to_ecommerce.sql
```

---

## ⚠️ 注意事项

### 数据丢失警告
- ⚠️ **此迁移会删除所有现有产品数据**
- ⚠️ 请确保已备份重要数据
- ⚠️ 迁移后需要重新录入产品

### 代码兼容性
- ❌ 旧的 `Product` 接口已废弃
- ❌ 旧的产品服务函数已废弃
- ✅ 需要更新所有引用产品的代码
- ✅ Rust后端命令需要相应更新(待实现)

### 前端页面
- 🔄 ProductsPage.tsx 需要完全重构以支持SPU-SKU结构
- 🔄 需要添加SKU管理器、多图上传器等新组件
- 🔄 列表页需要显示价格区间和总库存

---

## 📊 升级优势

### 功能增强
✅ 支持商品多规格(SPU-SKU)  
✅ 多图管理(主图+轮播图)  
✅ 灵活的商品属性系统  
✅ SEO优化字段支持  
✅ 物流信息(重量尺寸)  
✅ 更专业的商品展示  

### 业务价值
✅ 符合电商平台标准  
✅ 支持复杂商品结构  
✅ 便于与第三方平台对接  
✅ 提升用户体验  

---

## 🔧 后续工作

### 待完成任务
- [ ] Rust后端命令实现 (commands.rs, database.rs)
- [ ] 前端页面重构 (ProductsPage.tsx)
- [ ] SKU管理组件开发
- [ ] 多图上传组件开发
- [ ] 商品属性管理界面
- [ ] 更新相关文档

### 预计工作量
- Rust后端: ~3小时
- 前端重构: ~6小时
- 测试调试: ~3小时
- **总计: ~12小时**

---

## 📝 版本历史

- **v3.0.0** (2026-04-15): 电商化升级,SPU-SKU结构
- **v2.0.0** (2026-04-14): 合并营销网站和主应用Schema
- **v1.0.0** (2026-04-11): 初始版本,基础产品管理

---

**文档最后更新**: 2026-04-15  
**维护者**: ProClaw Team
