/**
 * 商品库字段别名词典 + 模糊匹配引擎
 *
 * - 完全一致 → 高置信 (1.0)
 * - 大小写/空格规范化后一致 → 高置信 (0.98)
 * - 别名词典命中 → 高置信 (0.95)
 * - string-similarity ≥ 0.85 → 高置信
 * - 0.6 ~ 0.85 → 中置信（需用户确认）
 * - < 0.6 → 未匹配
 */

import stringSimilarity from 'string-similarity';

import type { FieldMatchCandidate } from './types';

/** 目标字段 → 中英文别名集合（用于反向匹配） */
export const FIELD_ALIASES: Record<string, string[]> = {
  // ----- v1.0 MVP：商品库字段 -----
  name: ['商品名称', '名称', '品名', '产品名', '货品名', 'name', 'product_name', 'item', 'title'],
  spu_code: ['SPU 编号', 'SPU编号', '商品编号', 'spu_code', 'product_code', 'spu'],
  description: ['描述', '简介', '商品描述', 'description', 'desc', 'summary'],
  category_name: ['分类', '商品分类', '品类', 'category', 'type', 'category_name'],
  brand_name: ['品牌', 'brand', 'brand_name', 'manufacturer'],
  unit: ['单位', '主单位', 'unit', 'uom', 'measure'],
  sku_code: ['SKU 编号', 'SKU编号', '规格编号', 'sku', 'sku_code', 'spec_code', 'variant_code', 'SKU编码', '商品编码'],
  spec_text: ['规格', '规格名称', '型号', 'spec', 'model', 'variant', 'spec_text'],
  cost_price: ['成本价', '进价', '采购价', 'cost', 'cost_price', 'purchase_price'],
  sell_price: ['销售价', '零售价', '售价', '价格', 'price', 'sell_price', 'retail_price'],
  current_stock: ['库存', '库存数量', '当前库存', 'stock', 'qty', 'quantity', 'current_stock'],
  min_stock: ['最低库存', '安全库存', 'min_stock', 'safety_stock'],
  max_stock: ['最高库存', 'max_stock'],
  barcode: ['条形码', '条码', 'EAN', 'UPC', 'barcode', 'ean', 'upc'],
  weight: ['重量', '净重', 'weight', 'net_weight'],
  volume: ['体积', 'volume', 'capacity'],
  image_url: ['图片', '图片URL', '图片地址', '主图', 'image', 'image_url', 'photo', 'picture', 'img'],

  // ----- v1.2 P1：库存交易（PRD §3.2）-----
  transaction_type: ['类型', '出入库类型', '单据类型', '业务类型', 'transaction_type', 'type', 'txn_type'],
  quantity: ['数量', '变更数量', '库存数量', 'quantity', 'qty', 'amount'],
  unit_price: ['单价', '成本', '价格', 'unit_price', 'price', 'cost'],
  transaction_date: ['日期', '业务日期', '发生日期', '交易日期', 'transaction_date', 'date', 'biz_date'],
  reference_no: ['单号', '参考号', '关联单号', '引用号', 'reference_no', 'ref_no'],
  reason: ['原因', '出入库原因', 'reason', 'cause'],
  operator: ['操作员', '经手人', '操作人', 'operator', 'handler', 'by'],
  notes: ['备注', '说明', '描述', 'notes', 'remark', 'comment'],

  // ----- v1.2 P1：采购订单（PRD §3.3）-----
  po_number: ['采购单号', '单号', 'PO号', 'PONumber', '采购编号', 'po_number', 'po_no', 'purchase_no'],
  supplier_name: ['供应商', '供应商名称', '供应商公司', '供货商', 'supplier_name', 'supplier', 'vendor'],
  supplier_phone: ['供应商电话', '联系电话', 'phone', 'tel', 'mobile'],
  supplier_contact: ['联系人', '联系人姓名', 'contact_person'],
  supplier_email: ['邮箱', 'email', 'mail'],
  supplier_address: ['地址', '联系地址', 'address', 'addr'],
  supplier_payment_terms: ['付款条件', '账期', 'payment_terms'],
  supplier_tax_number: ['税号', '纳税人识别号', 'tax_number', 'tax_id'],
  order_date: ['订单日期', '采购日期', '制单日期', '订单时间', 'order_date', 'purchase_date'],
  expected_date: ['预计到货', '交期', '预计日期', '到货日期', 'expected_date', 'delivery_date', 'eta'],
  item_qty: ['采购数量', '数量', '明细数量', 'item_qty', 'qty', 'quantity'],
  item_unit_price: ['采购单价', '单价', '进价', 'item_unit_price', 'unit_price', 'price'],

  // ----- v1.2 P1：销售订单（PRD §3.4）-----
  so_number: ['销售单号', '单号', 'SO号', 'SONumber', '销售编号', 'so_number', 'so_no', 'sales_no'],
  customer_name: ['客户', '客户名称', '购买方', '顾客', 'customer_name', 'customer', 'client', 'buyer'],
  customer_phone: ['客户电话', '联系电话', 'phone', 'tel'],
  customer_contact: ['联系人', '收货人', 'contact_person'],
  customer_email: ['邮箱', 'email', 'mail'],
  customer_address: ['地址', '联系地址', 'address'],
  customer_tax_number: ['税号', '纳税人识别号', 'tax_number'],
  shipping_address: ['收货地址', '地址', '送达地址', '物流地址', 'shipping_address', 'ship_to', 'delivery_address'],
};

/** 构建反向查找表：任意别名 → 目标字段 */
function buildAliasIndex(): Map<string, string> {
  const idx = new Map<string, string>();
  for (const [target, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const key = normalize(alias);
      // 不覆盖已有：targetField 自身优先
      if (!idx.has(key)) {
        idx.set(key, target);
      }
    }
  }
  return idx;
}

/** 文本规范化：小写 + 去空白 + 去括号 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\-_]+/g, '')
    .replace(/[\(\)\[\]【】（）]/g, '')
    .replace(/[，,。.、]/g, '');
}

const ALIAS_INDEX = buildAliasIndex();

/**
 * 单个源列匹配
 * @returns { targetField, confidence, reason } | null
 */
export function matchColumn(sourceColumn: string): FieldMatchCandidate | null {
  const src = sourceColumn.trim();
  if (!src) return null;

  const normSrc = normalize(src);

  // 1. 完全一致（目标字段名）
  if (FIELD_ALIASES[src]) {
    return { sourceColumn: src, targetField: src, confidence: 1.0, reason: 'exact' };
  }

  // 2. 别名词典（规范化后）
  if (ALIAS_INDEX.has(normSrc)) {
    const target = ALIAS_INDEX.get(normSrc)!;
    return { sourceColumn: src, targetField: target, confidence: 0.95, reason: 'alias' };
  }

  // 3. string-similarity 模糊匹配（与所有已知字段名比对）
  const allTargets = Object.keys(FIELD_ALIASES);
  const allNormTargets = allTargets.map(normalize);

  // 也与别名比对（更好的命中率）
  const allAliasNormalized = Array.from(ALIAS_INDEX.keys());
  const bestAlias = stringSimilarity.findBestMatch(normSrc, allAliasNormalized);
  if (bestAlias.bestMatch.rating >= 0.85) {
    const target = ALIAS_INDEX.get(bestAlias.bestMatch.target)!;
    return {
      sourceColumn: src,
      targetField: target,
      confidence: bestAlias.bestMatch.rating,
      reason: 'fuzzy',
    };
  }

  // 4. 与字段名本身比对（兜底）
  const bestTarget = stringSimilarity.findBestMatch(normSrc, allNormTargets);
  if (bestTarget.bestMatch.rating >= 0.85) {
    return {
      sourceColumn: src,
      targetField: bestTarget.bestMatch.target,
      confidence: bestTarget.bestMatch.rating,
      reason: 'fuzzy',
    };
  }

  // 5. 中置信（0.6~0.85）仍返回，但前端标记为待确认
  if (bestAlias.bestMatch.rating >= 0.6 || bestTarget.bestMatch.rating >= 0.6) {
    const bestRating = Math.max(bestAlias.bestMatch.rating, bestTarget.bestMatch.rating);
    const target =
      bestAlias.bestMatch.rating >= bestTarget.bestMatch.rating
        ? ALIAS_INDEX.get(bestAlias.bestMatch.target)!
        : bestTarget.bestMatch.target;
    return { sourceColumn: src, targetField: target, confidence: bestRating, reason: 'fuzzy' };
  }

  return null;
}

/**
 * 批量匹配
 * @param headers 源列名数组
 * @returns { matched: Map<src, target>, unmatched: string[] }
 */
export function matchColumns(headers: string[]): {
  matched: Map<string, FieldMatchCandidate>;
  unmatched: string[];
} {
  const matched = new Map<string, FieldMatchCandidate>();
  const usedTargets = new Set<string>();
  const unmatched: string[] = [];

  // 高置信优先匹配：按 confidence 降序
  const candidates: FieldMatchCandidate[] = [];
  for (const h of headers) {
    const m = matchColumn(h);
    if (m) candidates.push(m);
    else unmatched.push(h);
  }
  candidates.sort((a, b) => b.confidence - a.confidence);

  for (const c of candidates) {
    // 同一目标字段只分配给一个源列（避免重复匹配）
    if (usedTargets.has(c.targetField)) {
      unmatched.push(c.sourceColumn);
    } else {
      matched.set(c.sourceColumn, c);
      usedTargets.add(c.targetField);
    }
  }

  return { matched, unmatched };
}

/**
 * 手动覆盖某个源列的目标字段
 */
export function manualMatch(sourceColumn: string, targetField: string): FieldMatchCandidate {
  return { sourceColumn, targetField, confidence: 1.0, reason: 'manual' };
}