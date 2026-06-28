/**
 * InventoryService - 库存数据查询服务
 * P2 项 2：从 SchemaManager 已有的 product_spu/product_sku/inventory_transactions 三表聚合出库存概览。
 *
 * 职责划分：
 *  - 库存状态分级（classifyStockStatus）：纯函数，便于单测
 *  - 库存概览查询（getInventoryOverview）：join SPU + SKU，返回带状态的列表
 *  - 低库存预警（getLowStockItems）：out + low 状态 SKU
 *  - 库存统计（getInventoryStats）：聚合卡片用数据
 *
 * 复用：database/getDatabase() 获取当前身份数据库实例。
 */

import type { IDatabase } from './DatabaseFactory';
import { logger } from '../utils/logger';

/** 库存状态：缺货 / 低库存 / 正常 / 接近满仓 */
export type StockStatus = 'out' | 'low' | 'normal' | 'over';

/** 库存概览条目（join SPU + SKU） */
export interface InventoryItem {
  skuId: string;
  spuId: string;
  skuCode: string;
  specText: string | null;
  productName: string;
  spuCode: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  sellPrice: number;
  status: StockStatus;
}

/** 库存统计（顶部聚合卡片） */
export interface InventoryStats {
  totalSkus: number;        // 在库 SKU 总数（active）
  outOfStockCount: number;  // 缺货 SKU 数
  lowStockCount: number;    // 低库存 SKU 数（含缺货）
  recentTransactions: number; // 近 7 天交易笔数
  totalStockValue: number;  // 总库存价值（current_stock * sell_price 之和）
}

/**
 * 库存状态分级纯函数
 *  - out:   current_stock === 0
 *  - low:   0 < current_stock <= min_stock
 *  - normal: min_stock < current_stock <= max_stock * 0.8
 *  - over:  current_stock > max_stock * 0.8
 *
 * 边界：
 *  - min_stock <= 0 时，永远不会进入 'low'（避免 max_stock=999999 时误判）
 *  - current_stock < 0 视为 out（数据异常兜底）
 */
export function classifyStockStatus(
  currentStock: number,
  minStock: number,
  maxStock: number
): StockStatus {
  if (currentStock <= 0) return 'out';
  if (minStock > 0 && currentStock <= minStock) return 'low';
  // 满仓预警阈值：max_stock * 0.8
  // 如果 max_stock 无效（<= 0），使用 999999 的默认值
  const effectiveMax = maxStock > 0 ? maxStock : 999999;
  const overThreshold = effectiveMax * 0.8;
  if (currentStock > overThreshold) return 'over';
  return 'normal';
}

/**
 * 获取库存概览列表（join SPU + SKU，按 current_stock 升序，让低库存优先显示）
 */
export const getInventoryOverview = async (db: IDatabase): Promise<InventoryItem[]> => {
  try {
    const rows = await db.getAllAsync(
      `SELECT
         sku.id              AS skuId,
         sku.spu_id          AS spuId,
         sku.sku_code        AS skuCode,
         sku.spec_text       AS specText,
         spu.name            AS productName,
         spu.spu_code        AS spuCode,
         sku.current_stock   AS currentStock,
         sku.min_stock       AS minStock,
         sku.max_stock       AS maxStock,
         sku.sell_price      AS sellPrice
       FROM product_sku sku
       INNER JOIN product_spu spu ON spu.id = sku.spu_id
       WHERE sku.is_active = 1
         AND spu.deleted_at IS NULL
       ORDER BY sku.current_stock ASC, sku.sku_code ASC`
    );

    return (rows as Array<Record<string, unknown>>).map((row) => {
      const currentStock = Number(row.currentStock ?? 0);
      const minStock = Number(row.minStock ?? 0);
      const maxStock = Number(row.maxStock ?? 999999);
      return {
        skuId: String(row.skuId),
        spuId: String(row.spuId),
        skuCode: String(row.skuCode),
        specText: row.specText ? String(row.specText) : null,
        productName: String(row.productName ?? ''),
        spuCode: String(row.spuCode ?? ''),
        currentStock,
        minStock,
        maxStock,
        sellPrice: Number(row.sellPrice ?? 0),
        status: classifyStockStatus(currentStock, minStock, maxStock),
      };
    });
  } catch (error) {
    logger.warn('[InventoryService] Failed to get inventory overview:', error);
    return [];
  }
};

/**
 * 获取低库存 SKU（status 为 out 或 low）
 */
export const getLowStockItems = async (db: IDatabase): Promise<InventoryItem[]> => {
  const items = await getInventoryOverview(db);
  return items.filter((i) => i.status === 'out' || i.status === 'low');
};

/**
 * 获取库存聚合统计（顶部卡片用）
 */
export const getInventoryStats = async (db: IDatabase): Promise<InventoryStats> => {
  const stats: InventoryStats = {
    totalSkus: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    recentTransactions: 0,
    totalStockValue: 0,
  };

  try {
    const items = await getInventoryOverview(db);
    stats.totalSkus = items.length;
    stats.outOfStockCount = items.filter((i) => i.status === 'out').length;
    stats.lowStockCount = items.filter((i) => i.status === 'out' || i.status === 'low').length;
    stats.totalStockValue = items.reduce(
      (sum, i) => sum + i.currentStock * i.sellPrice,
      0
    );

    // 近 7 天交易笔数（以秒为单位的时间戳）
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    const txRow = await db.getFirstAsync(
      `SELECT COUNT(*) AS cnt FROM inventory_transactions WHERE created_at >= ?`,
      [sevenDaysAgo]
    );
    stats.recentTransactions = Number((txRow as any)?.cnt ?? 0);
  } catch (error) {
    logger.warn('[InventoryService] Failed to get inventory stats:', error);
  }

  return stats;
};

export default {
  getInventoryOverview,
  getLowStockItems,
  getInventoryStats,
  classifyStockStatus,
};
