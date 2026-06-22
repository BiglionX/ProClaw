import { ipcInvoke as invoke } from './tauri';
import { isTauri } from './tauri';

// ==================== 类型定义 ====================

/**
 * 库存置信度等级（PRD v12.0 §3.4）
 * - high   : 7天内有微盘点
 * - medium : 7天内有进货但无微盘点
 * - low    : 15天无校准 或 存在负库存且未冲销
 */
export type StockConfidence = 'high' | 'medium' | 'low';

/**
 * 校准类型（PRD v12.0 §3.3）
 * - micro_count   : 微盘点（部分盘/快速盘）
 * - supplement    : 补充进货（冲销负库存）
 * - force_clear   : 强制清零（盘点时清零差额）
 */
export type CalibrationType = 'micro_count' | 'supplement' | 'force_clear';

/**
 * 微盘点触发场景
 * - post_sales    : 销售完成后（满足3天未校准+热销+收银间隔>3秒）
 * - post_purchase : 进货完成后
 * - manual        : 用户手动触发（库存列表/商品详情）
 */
export type CalibrationTrigger = 'post_sales' | 'post_purchase' | 'manual';

export interface StockCalibrationInput {
  product_id: string;
  calibration_type: CalibrationType;
  expected_stock?: number; // 微盘点时的目标库存
  actual_stock?: number;   // 实际盘点库存
  supplement_quantity?: number; // 补充进货数量
  reason?: string;
  triggered_by: CalibrationTrigger;
}

export interface StockCalibrationRecord {
  id: string;
  product_id: string;
  product_name?: string;
  spu_code?: string;
  calibration_type: CalibrationType;
  expected_stock: number | null;
  actual_stock: number | null;
  difference: number;
  supplement_quantity: number | null;
  reason: string | null;
  triggered_by: CalibrationTrigger;
  performed_by: string | null;
  created_at: string;
}

export interface StockConfidenceInfo {
  product_id: string;
  product_name: string;
  spu_code: string;
  current_stock: number;
  allow_negative_stock: boolean;
  stock_confidence: StockConfidence;
  last_calibrated_at: string | null;
  negative_since: string | null;
  aging_days: number; // 距离上次校准天数
  should_calibrate: boolean; // 是否建议微盘点
  reason: string; // 置信度判断理由
}

export interface CalibrationReminder {
  product_id: string;
  product_name: string;
  spu_code: string;
  current_stock: number;
  reminder_type:
    | 'negative_aging_3d'    // 负库存超过3天
    | 'long_no_calibration' // 长期未校准
    | 'high_sales_low_conf'  // 高销量低置信度
    | 'replenishment_suggestion'; // 补货建议
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  suggested_action: 'calibrate' | 'replenish' | 'review' | 'dismiss';
  created_at: string;
}

export interface PostSalesCheckResult {
  should_trigger: boolean;
  product_id: string;
  reason: string;
  days_since_last_calibration: number;
  is_hot_seller: boolean;
  cashier_interval_ok: boolean; // 收银间隔>3秒
}

export interface PostPurchaseCheckResult {
  should_trigger: boolean;
  product_id: string;
  has_negative_stock: boolean;
  reason: string;
  current_stock: number;
}

// ==================== 命令封装 ====================

/**
 * 执行微盘点
 *
 * 流程：
 * 1. 销售/进货完成后建议弹窗 → 触发该命令
 * 2. 写入 inventory_calibrations 表
 * 3. 更新 product_sku/products 的 last_calibrated_at + stock_confidence
 * 4. 微盘点：实际库存=0 且 期望库存>0 时，差额会被 force_clear
 * 5. 冲销：传入 supplement_quantity，会自动补货（生成 inbound transaction）
 */
export async function calibrateStock(
  input: StockCalibrationInput
): Promise<{ id: string; message: string; new_stock: number }> {
  return await invoke('calibrate_stock', { input });
}

/**
 * 获取指定商品的库存置信度
 */
export async function getStockConfidence(
  productId: string
): Promise<StockConfidenceInfo> {
  return await invoke('get_stock_confidence', { productId });
}

/**
 * 获取校准历史
 */
export async function getCalibrationHistory(
  options?: {
    product_id?: string;
    calibration_type?: CalibrationType;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }
): Promise<StockCalibrationRecord[]> {
  return await invoke('get_calibration_history', { options });
}

/**
 * 强制清零负库存（盘点时使用）
 */
export async function forceClearNegative(
  productId: string,
  expectedStock: number,
  reason?: string
): Promise<{ id: string; message: string; new_stock: number }> {
  return await invoke('force_clear_negative', {
    productId,
    expectedStock,
    reason,
  });
}

/**
 * 补充进货（冲销负库存）
 */
export async function supplementInbound(
  productId: string,
  supplementQuantity: number,
  reason?: string
): Promise<{ id: string; message: string; new_stock: number }> {
  return await invoke('supplement_inbound', {
    productId,
    supplementQuantity,
    reason,
  });
}

/**
 * 检查负库存老化
 */
export async function checkNegativeAging(
  productId?: string
): Promise<Array<{
  product_id: string;
  product_name: string;
  spu_code: string;
  current_stock: number;
  negative_since: string;
  aging_days: number;
  severity: 'warning' | 'critical';
}>> {
  return await invoke('check_negative_aging', { productId });
}

/**
 * 计算所有需要 AI 提醒的产品
 */
export async function computeReminders(): Promise<CalibrationReminder[]> {
  return await invoke('compute_reminders');
}

/**
 * 标记提醒已处理
 */
export async function markReminderDismissed(
  productId: string,
  reminderType: CalibrationReminder['reminder_type']
): Promise<{ id: string; message: string }> {
  return await invoke('mark_reminder_dismissed', {
    productId,
    reminderType,
  });
}

/**
 * 获取低置信度商品列表（库存页面展示用）
 */
export async function getLowConfidenceProducts(): Promise<StockConfidenceInfo[]> {
  if (!isTauri()) {
    return [];
  }
  return await invoke('get_low_confidence_products_cmd');
}

/**
 * 销售完成后检查是否需要微盘点
 *
 * 触发条件（PRD v12.0 §3.3）：
 * - 距离上次校准 ≥ 3 天
 * - 该商品是热销品（近7天有销售）
 * - 收银间隔 > 3 秒（避免误触发）
 */
export async function shouldTriggerPostSalesCalibration(
  productId: string
): Promise<PostSalesCheckResult> {
  return await invoke('should_trigger_post_sales_calibration_cmd', { productId });
}

/**
 * 进货完成后检查是否需要微盘点
 *
 * 触发条件（PRD v12.0 §3.3）：
 * - 进货后库存仍为负
 * - 或进货数量明显大于实际库存
 */
export async function shouldTriggerPostPurchaseCalibration(
  productId: string
): Promise<PostPurchaseCheckResult> {
  return await invoke('should_trigger_post_purchase_calibration_cmd', { productId });
}

// ==================== 工具函数 ====================

/**
 * 置信度对应的中文标签
 */
export const CONFIDENCE_LABEL: Record<StockConfidence, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

/**
 * 置信度对应的 MUI 颜色
 */
export const CONFIDENCE_COLOR: Record<StockConfidence, 'success' | 'warning' | 'error'> = {
  high: 'success',
  medium: 'warning',
  low: 'error',
};

/**
 * 校准类型对应的中文标签
 */
export const CALIBRATION_TYPE_LABEL: Record<CalibrationType, string> = {
  micro_count: '微盘点',
  supplement: '补充进货',
  force_clear: '强制清零',
};

/**
 * 提醒类型对应的中文标签
 */
export const REMINDER_TYPE_LABEL: Record<CalibrationReminder['reminder_type'], string> = {
  negative_aging_3d: '负库存超期',
  long_no_calibration: '长期未校准',
  high_sales_low_conf: '高销量低置信度',
  replenishment_suggestion: '补货建议',
};

/**
 * 严重程度对应的 MUI 颜色
 */
export const REMINDER_SEVERITY_COLOR: Record<CalibrationReminder['severity'], 'info' | 'warning' | 'error'> = {
  info: 'info',
  warning: 'warning',
  critical: 'error',
};
