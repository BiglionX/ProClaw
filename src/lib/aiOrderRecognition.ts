/**
 * AI 订单识别前端封装（任务 #8：AI 订单识别桌面端核心引擎）
 *
 * 调用 Tauri 后端 recognize_order 命令
 * 复用 aiTools.ts 的 estimateTokens
 */

import { safeInvoke, isTauri } from './tauri';

export interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  sku?: string;
}

export interface RecognizeOrderResult {
  items: OrderItem[];
  total_amount: number;
  confidence: number;
  raw_text: string;
  model_used: string;
  cost_tokens: number;
  duration_ms: number;
  draft_id?: string;
}

export interface OrderDraft {
  id: string;
  items_json: string;
  original_image_url?: string;
  ai_raw_response: string;
  confidence: number;
  created_at: number;
}

/** 将 File 对象转为 base64 字符串 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // 移除 "data:image/...;base64," 前缀
      const base64 = result.replace(/^data:image\/[a-z]+;base64,/, '');
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** 调用后端 AI 识别订单 */
export async function recognizeOrder(
  imageBase64: string,
  options?: {
    customerId?: string;
    saveDraft?: boolean;
  }
): Promise<RecognizeOrderResult> {
  if (!isTauri()) {
    throw new Error('AI 订单识别需在 Tauri 桌面环境运行');
  }

  return safeInvoke<RecognizeOrderResult>('recognize_order', {
    imageBase64,
    customerId: options?.customerId,
    saveDraft: options?.saveDraft ?? true,
  }).then((result) => {
    if (!result) throw new Error('AI 订单识别失败');
    return result;
  });
}

/** 列出订单草稿 */
export async function listOrderDrafts(limit = 20): Promise<OrderDraft[]> {
  if (!isTauri()) return [];
  try {
    const drafts = await safeInvoke<OrderDraft[]>('list_order_drafts', { limit });
    return drafts ?? [];
  } catch (err) {
    console.warn('listOrderDrafts failed:', err);
    return [];
  }
}

/** 删除订单草稿 */
export async function deleteOrderDraft(draftId: string): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const ok = await safeInvoke<boolean>('delete_order_draft', { draftId });
    return ok ?? false;
  } catch {
    return false;
  }
}

/** 验证识别结果 */
export function validateRecognition(items: OrderItem[]): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (items.length === 0) {
    warnings.push('未识别到任何商品');
    return { isValid: false, warnings };
  }

  for (const item of items) {
    if (!item.product_name || item.product_name.trim().length === 0) {
      warnings.push('存在空商品名称');
    }
    if (item.quantity <= 0) {
      warnings.push(`"${item.product_name}" 数量异常（${item.quantity}）`);
    }
    if (item.unit_price < 0) {
      warnings.push(`"${item.product_name}" 价格为负数`);
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

export const aiOrderRecognition = {
  fileToBase64,
  recognizeOrder,
  listOrderDrafts,
  deleteOrderDraft,
  validateRecognition,
};

export default aiOrderRecognition;
