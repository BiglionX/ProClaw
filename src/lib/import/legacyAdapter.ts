/**
 * ProClaw v1.3 老系统数据迁移 - 适配器层
 *
 * 职责：
 * - 把后端 LegacyParseResult 适配成前端 v1.2 P1 的 ParseResult 风格
 * - 把 LegacyPreviewRequest / LegacyExecuteRequest / RollbackResponse 封装成业务友好 API
 * - 提供 legacyAdapter 单一入口，前端组件不直接 import 后端 schema
 *
 * 设计：
 * - 不假设具体的 Tauri IPC 调用方式（让 importService 注入）
 * - 所有函数是纯数据转换或异步调用包装
 */

import type {
  CustomerAggregate,
  CustomerContactRecord,
  FieldMap,
  ImportTarget,
  LegacyExecuteRequest,
  LegacyExecuteResponse,
  LegacyParseResult,
  LegacyPreviewRequest,
  ProductAggregate,
  ProductSkuRecord,
  RollbackResponse,
} from '../../types/import';

// ============================================
// 1. Tauri IPC 抽象（依赖注入，由 importService 实现）
// ============================================

/** Tauri invoke 抽象，避免组件层直接依赖 @tauri-apps/api */
export interface LegacyIPC {
  previewLegacy(req: LegacyPreviewRequest): Promise<LegacyParseResult>;
  executeLegacy(req: LegacyExecuteRequest): Promise<LegacyExecuteResponse>;
  rollbackBatch(batchId: string): Promise<RollbackResponse>;
}

// ============================================
// 2. 解析结果适配：LegacyParseResult → ParseResult 兼容形态
// ============================================

/**
 * 把 LegacyParseResult 的 customer_groups 展平成 FieldMap[] （用于 Step 1 预览 / Step 3 映射）
 *
 * 设计：
 * - 每条 customer aggregate 拆出基础字段 + 多个 contacts 的行
 * - 第 1 行：基础字段 + 第一个 contact（is_primary）
 * - 第 N 行：仅 contact 字段，前缀加 "__contact_<N>__"
 *
 * 注意：这是简化展示，真实聚合执行在 backend.commands::import_execute_legacy 中完成
 */
export function flattenCustomerGroupsForPreview(groups: CustomerAggregate[]): Array<{
  group_key: string;
  primary: FieldMap;
  contact_count: number;
}> {
  return groups.map((g) => {
    const primary: FieldMap = { ...g.base_fields };
    primary['__primary_contact_name__'] = g.contacts.find((c) => c.is_primary)?.contact_name ?? '';
    primary['__primary_contact_phone__'] = g.contacts.find((c) => c.is_primary)?.phone ?? '';
    primary['__contact_count__'] = String(g.contacts.length);
    return {
      group_key: g.code || g.name,
      primary,
      contact_count: g.contacts.length,
    };
  });
}

/** 把 ProductAggregate 拆成主行 + SKU 变体列表（用于 Step 4 聚合规则编辑器） */
export function flattenProductGroupsForPreview(groups: ProductAggregate[]): Array<{
  group_key: string;
  primary: FieldMap;
  sku_count: number;
}> {
  return groups.map((g) => ({
    group_key: g.sku,
    primary: {
      商品编号: g.sku,
      商品名称: g.name,
      商品类别: g.category ?? '',
      规格: g.spec ?? '',
      标签: g.tag ?? '',
      __sku_count__: String(g.variants.length),
    },
    sku_count: g.variants.length,
  }));
}

// ============================================
// 3. 聚合预览：把扁平行聚合成 Customer/Product Aggregate
// ============================================

/**
 * 检测一组列名里是否包含"客户多联系人"特征
 *  - 含 客户编号 + 联系人 + 联系电话 这 3 列 → true
 *  - 否则 → false（按单行处理）
 */
export function looksLikeCustomerMultiContact(headers: string[]): boolean {
  const norm = headers.map((h) => h.trim());
  return (
    norm.some((h) => /客户编号|客户编码|customer_code/i.test(h)) &&
    norm.some((h) => /联系人|contact_name|contact_person/i.test(h)) &&
    norm.some((h) => /联系电话|手机|tel|phone|mobile/i.test(h))
  );
}

/**
 * 检测一组列名里是否包含"商品 SPU/SKU"特征
 *  - 含 商品编号 + 规格 + 型号 这 3 列 → true
 */
export function looksLikeProductSpuSku(headers: string[]): boolean {
  const norm = headers.map((h) => h.trim());
  return (
    norm.some((h) => /商品编号|商品编码|sku|item_code/i.test(h)) &&
    norm.some((h) => /规格|规格型号|型号|spec/i.test(h))
  );
}

// ============================================
// 4. 类别建档审核清单生成
// ============================================

export interface CategoryReviewItem {
  category_type: 'product' | 'supplier' | 'customer';
  name: string;
  occurrences: number;
  action: 'create' | 'reuse' | 'skip';
}

/**
 * 把后端 categories_to_create 转成审核清单 UI 友好结构
 */
export function buildCategoryReviewList(
  categoriesToCreate: Record<string, string[]>,
): CategoryReviewItem[] {
  const out: CategoryReviewItem[] = [];
  const typeLabelMap: Record<string, 'product' | 'supplier' | 'customer'> = {
    product: 'product',
    supplier: 'supplier',
    customer: 'customer',
  };

  for (const [catType, names] of Object.entries(categoriesToCreate)) {
    const normType = typeLabelMap[catType] ?? 'product';
    // 统计每个类别名出现次数（这里只显示去重后的，实际 occurrences 由后端统计）
    const unique = Array.from(new Set(names));
    for (const name of unique) {
      out.push({
        category_type: normType,
        name,
        occurrences: names.filter((n) => n === name).length,
        action: 'create',
      });
    }
  }

  return out;
}

// ============================================
// 5. 默认值合并：把 base_fields 默认值合并到 contact fields
// ============================================

/**
 * 把聚合默认（如"客户类别=零售"）应用到所有聚合组
 */
export function applyAggregationDefaults(
  groups: CustomerAggregate[],
  defaults: FieldMap,
): CustomerAggregate[] {
  return groups.map((g) => {
    const merged: FieldMap = { ...g.base_fields };
    for (const [k, v] of Object.entries(defaults)) {
      if (!merged[k] || merged[k].trim() === '') {
        merged[k] = v;
      }
    }
    return { ...g, base_fields: merged };
  });
}

/**
 * 同上，商品聚合
 */
export function applyProductAggregationDefaults(
  groups: ProductAggregate[],
  defaults: FieldMap,
): ProductAggregate[] {
  return groups.map((g) => {
    const merged: FieldMap = {
      商品名称: g.name,
      商品类别: g.category ?? '',
      规格: g.spec ?? '',
    };
    for (const [k, v] of Object.entries(defaults)) {
      if (!merged[k] || merged[k].trim() === '') {
        merged[k] = v;
      }
    }
    return {
      ...g,
      name: merged['商品名称'] || g.name,
      category: merged['商品类别'] || g.category,
      spec: merged['规格'] || g.spec,
    };
  });
}

// ============================================
// 6. Execute Request 构造器
// ============================================

export interface BuildLegacyExecuteRequestParams {
  batch_id: string;
  column_mapping: Record<string, string>;
  default_values?: Record<string, string>;
  skip_errors?: boolean;
  aggregation_rules?: LegacyExecuteRequest['aggregation_rules'];
  skip_category_auto_create?: boolean;
}

/** 构造 LegacyExecuteRequest（参数对象方式，可读性更好） */
export function buildLegacyExecuteRequest(
  params: BuildLegacyExecuteRequestParams,
): LegacyExecuteRequest {
  return {
    batch_id: params.batch_id,
    column_mapping: params.column_mapping,
    default_values: params.default_values,
    skip_errors: params.skip_errors,
    aggregation_rules: params.aggregation_rules,
    skip_category_auto_create: params.skip_category_auto_create,
  };
}

// ============================================
// 7. 主入口：legacyAdapter 单例
// ============================================

export class LegacyAdapter {
  constructor(private readonly ipc: LegacyIPC) {}

  /** 上传文件后 → 预览（拿到聚合组 + 类别清单） */
  async preview(sourcePath: string, targetType: ImportTarget): Promise<LegacyParseResult> {
    return this.ipc.previewLegacy({ source_path: sourcePath, target_type: targetType });
  }

  /** 用户确认聚合规则后 → 执行 */
  async execute(req: LegacyExecuteRequest): Promise<LegacyExecuteResponse> {
    return this.ipc.executeLegacy(req);
  }

  /** 不限时撤销（删除 customer_contacts / product_sku / categories） */
  async rollback(batchId: string): Promise<RollbackResponse> {
    return this.ipc.rollbackBatch(batchId);
  }

  /** 静态方法：生成类别审核清单（无依赖） */
  static buildCategoryReviewList = buildCategoryReviewList;

  /** 静态方法：客户聚合应用默认值 */
  static applyAggregationDefaults = applyAggregationDefaults;

  /** 静态方法：商品聚合应用默认值 */
  static applyProductAggregationDefaults = applyProductAggregationDefaults;

  /** 静态方法：构造 execute request */
  static buildRequest = buildLegacyExecuteRequest;
}

// ============================================
// 8. 业务语义工具函数
// ============================================

/** 统计聚合组的多联系人 / 多 SKU 总数（用于 Step 5 摘要） */
export function countAggregationTotals(result: LegacyParseResult): {
  customer_groups: number;
  customer_contacts: number;
  product_groups: number;
  product_skus: number;
} {
  return {
    customer_groups: result.customer_groups.length,
    customer_contacts: result.customer_groups.reduce(
      (sum, g) => sum + g.contacts.length,
      0,
    ),
    product_groups: result.product_groups.length,
    product_skus: result.product_groups.reduce(
      (sum, g) => sum + g.variants.length,
      0,
    ),
  };
}

/** 判断 LegacyParseResult 是否需要用户在 Step 4 编辑聚合规则 */
export function needsAggregationReview(result: LegacyParseResult): boolean {
  // 任意聚合组有 > 1 个 contact 或 > 1 个 SKU 时，需要确认
  return (
    result.customer_groups.some((g) => g.contacts.length > 1) ||
    result.product_groups.some((g) => g.variants.length > 1)
  );
}

// 重新导出关键类型，方便调用方
export type {
  CustomerAggregate,
  CustomerContactRecord,
  LegacyExecuteRequest,
  LegacyExecuteResponse,
  LegacyParseResult,
  LegacyPreviewRequest,
  ProductAggregate,
  ProductSkuRecord,
  RollbackResponse,
};
