# SPU-SKU 结构适配 - 剩余文件修复计划

## 📋 待修复文件清单

根据代码扫描,以下文件仍使用旧的Product结构:

### 优先级1: 核心文件 (必须修复)

| 文件 | 问题 | 工作量 | 状态 |
|------|------|--------|------|
| `src/db/database.ts` | Product类型定义过时 | 2小时 | ⏸️ |
| `src/pages/ProductsPage.tsx` | 完全重构以支持SPU-SKU | 6小时 | ⏸️ |
| `src/lib/productService.test.ts` | 测试用例需重写 | 3小时 | ⏸️ |

### 优先级2: 可能需要检查

| 文件 | 潜在问题 | 状态 |
|------|---------|------|
| `src/lib/salesService.ts` | 可能引用Product类型 | 🔍 |
| `src/lib/purchaseService.ts` | 可能引用Product类型 | 🔍 |
| `src/lib/analyticsService.ts` | 产品统计需更新 | 🔍 |

---

## 🔧 详细修复方案

### 1. database.ts - 数据类型层

**当前问题**:
```typescript
// 旧结构
export interface Product {
  id: string;
  sku: string;
  name: string;
  current_stock: number;
  // ...
}

static async getProducts(): Promise<Product[]>
static async getProductById(id: string): Promise<Product | null>
static async getProductBySku(sku: string): Promise<Product | null>
```

**需要修改为**:
```typescript
// 新结构 - 导出SPU和SKU类型
export { ProductSPU, ProductSKU } from '../lib/productService';

// 或者重新定义(如果database.ts需要独立)
export interface ProductSPU {
  id: string;
  spu_code: string;
  name: string;
  // ... SPU字段
  skus?: ProductSKU[];
}

export interface ProductSKU {
  id: string;
  spu_id: string;
  sku_code: string;
  current_stock: number;
  // ... SKU字段
}

// 方法重命名
static async getProductSPUs(): Promise<ProductSPU[]>
static async getProductSPUById(id: string): Promise<ProductSPU | null>
static async getProductSKUById(id: string): Promise<ProductSKU | null>
```

**影响范围**:
- 所有调用Database.getProducts()的地方
- 所有使用Product类型的地方

---

### 2. ProductsPage.tsx - 产品管理页面

**当前问题**: 这是最复杂的页面,需要完全重构

**需要实现的功能**:

#### A. SPU列表视图
```typescript
// 显示SPU卡片/表格
- SPU名称、编码
- SKU数量
- 总库存(所有SKU之和)
- 价格范围(最低SKU价格 - 最高SKU价格)
- 主图
- 状态(上架/下架)
```

#### B. SKU管理
```typescript
// 点击SPU后展开/跳转到SKU管理
- SKU列表表格
- 规格组合展示
- 每个SKU的库存、价格
- 批量编辑功能
```

#### C. 创建/编辑SPU表单
```typescript
// 基本信息
- SPU Code (自动生成/手动输入)
- 商品名称
- 副标题
- 描述
- 分类、品牌
- 单位、重量、尺寸

// 多图上传
- 主图
- 轮播图(最多9张)

// SEO信息
- SEO标题
- SEO描述
- SEO关键词
```

#### D. SKU编辑器
```typescript
// 规格定义
- 规格名(如:颜色、尺寸)
- 规格值(如:红色、蓝色、S、M、L)
- 自动生成规格组合

// SKU表格
- 每行一个SKU
- SKU Code (自动生成)
- 成本价、售价、市场价
- 库存(当前、最低、最高)
- 条形码
- 是否默认SKU
```

**预计代码量**: 
- 新增: ~800行
- 删除: ~400行(旧代码)
- 修改: ~200行

---

### 3. productService.test.ts - 单元测试

**当前测试用例**:
```typescript
describe('createProduct', ...)
describe('getProducts', ...)
describe('getProductById', ...)
describe('getProductBySku', ...)
describe('updateProduct', ...)
describe('deleteProduct', ...)
```

**需要改为**:
```typescript
describe('createProductSPU', ...)
  - 测试自动生成SPU Code
  - 测试自动生成SKU Code
  - 测试事务完整性

describe('getProductSPUs', ...)
  - 测试筛选功能
  - 测试分页
  - 测试包含skus和images

describe('getProductSPUById', ...)
  - 测试关联数据加载

describe('updateProductSPU', ...)
  - 测试部分更新

describe('deleteProductSPU', ...)
  - 测试级联删除SKU和images

describe('辅助函数', ...)
  - generateSPUCode()
  - generateSKUCode()
  - generateSpecText()
```

**预计工作量**: 完全重写测试文件

---

## 📊 修复优先级建议

### Phase 1: 基础层 (立即执行)
1. ✅ **database.ts** - 更新类型定义
   - 导出新的SPU/SKU类型
   - 重命名或废弃旧方法
   - 保持向后兼容(可选)

### Phase 2: 核心页面 (近期执行)
2. ⏸️ **ProductsPage.tsx** - 完全重构
   - 设计新的UI布局
   - 实现SPU列表
   - 实现SKU管理
   - 实现创建/编辑表单

### Phase 3: 测试保障 (最后执行)
3. ⏸️ **productService.test.ts** - 重写测试
   - 覆盖所有新功能
   - 测试边界情况
   - 确保代码质量

---

## 🎯 快速修复选项

如果时间紧张,可以采用**渐进式迁移**策略:

### 选项A: 兼容性层 (推荐)
在productService.ts中添加兼容函数:

```typescript
// 兼容旧代码
export async function getProducts(options?: any): Promise<any[]> {
  const spus = await getProductSPUs(options);
  // 将SPU转换为旧Product格式(取第一个SKU)
  return spus.map(spu => ({
    id: spu.id,
    sku: spu.skus?.[0]?.sku_code || '',
    name: spu.name,
    current_stock: spu.skus?.reduce((sum, s) => sum + s.current_stock, 0) || 0,
    // ... 其他字段映射
  }));
}
```

**优点**: 
- 无需立即修改所有文件
- 可以逐步迁移
- 降低风险

**缺点**:
- 临时方案,最终仍需重构
- 性能开销(数据转换)

### 选项B: 分支开发
1. 创建feature/spu-sku-migration分支
2. 完成所有文件重构
3. 充分测试后合并到主分支

**优点**:
- 不影响主分支稳定性
- 可以完整测试

**缺点**:
- 开发周期长
- 合并冲突风险

---

## 📝 具体执行步骤

### Step 1: 修复database.ts (30分钟)

```bash
# 1. 更新Product类型为ProductSPU和ProductSKU
# 2. 添加新方法getProductSPUs等
# 3. 保留旧方法但标记为@deprecated
# 4. 导出新类型供其他模块使用
```

### Step 2: 创建ProductsPage新版本 (4-6小时)

```bash
# 1. 备份原文件: ProductsPage.tsx.bak
# 2. 创建新文件: ProductsPageNew.tsx
# 3. 实现SPU列表视图
# 4. 实现SKU管理界面
# 5. 实现创建/编辑表单
# 6. 测试无误后替换原文件
```

### Step 3: 重写测试 (2-3小时)

```bash
# 1. 备份原测试文件
# 2. 创建新的测试用例
# 3. 覆盖所有核心功能
# 4. 运行测试确保通过
```

### Step 4: 清理和验证 (1小时)

```bash
# 1. 删除备份文件
# 2. 运行TypeScript编译检查
# 3. 运行所有测试
# 4. 手动测试关键流程
```

---

## ⚠️ 风险评估

### 高风险
- **ProductsPage.tsx**: 复杂度高,容易引入bug
- **建议**: 充分测试,考虑A/B测试

### 中风险  
- **database.ts**: 影响面广
- **建议**: 保持向后兼容,逐步迁移

### 低风险
- **productService.test.ts**: 只影响测试
- **建议**: 可以直接重写

---

## 📚 参考文档

- [ECOMMERCE_UPGRADE_NOTES.md](./ECOMMERCE_UPGRADE_NOTES.md)
- [AUTO_GENERATE_CODE_IMPLEMENTATION.md](./AUTO_GENERATE_CODE_IMPLEMENTATION.md)
- [RUST_BACKEND_SPU_SKU_GUIDE.md](./RUST_BACKEND_SPU_SKU_GUIDE.md)
- [COMMAND_PARSER_SPU_SKU_FIX.md](./COMMAND_PARSER_SPU_SKU_FIX.md)
- [INVENTORY_PAGE_SPU_SKU_FIX.md](./INVENTORY_PAGE_SPU_SKU_FIX.md)

---

## 🚀 建议行动方案

**推荐**: 采用**选项A - 兼容性层** + **渐进式迁移**

1. **今天**: 添加兼容函数,让现有代码继续工作
2. **本周**: 重构ProductsPage.tsx
3. **下周**: 重写测试,清理兼容代码

**预计总工作量**: 8-10小时

---

**创建时间**: 2026-04-15  
**状态**: 待执行  
**负责人**: 待分配

