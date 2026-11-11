import { z } from 'zod';

/** P0-06：销售/采购明细 — quantity > 0，unit_price >= 0 */
export const orderItemSchema = z.object({
  product_id: z.string().min(1, '请选择商品'),
  quantity: z
    .number({ invalid_type_error: 'quantity 必须为数字' })
    .int('quantity 必须为正整数')
    .positive('quantity 必须大于 0'),
  unit_price: z
    .number({ invalid_type_error: 'unit_price 必须为数字' })
    .min(0, 'unit_price 不能为负数'),
  notes: z.string().optional(),
});

export const orderItemsSchema = z.array(orderItemSchema).min(1, '请至少添加一个商品');

/** P0-06：库存变动 — 非 adjustment 时 quantity > 0；adjustment 时 != 0 */
export const inventoryQuantitySchema = z.object({
  transaction_type: z.enum(['inbound', 'outbound', 'adjustment', 'transfer']),
  quantity: z.number({ invalid_type_error: 'quantity 必须为数字' }).int('quantity 必须为整数'),
}).superRefine((data, ctx) => {
  if (data.transaction_type === 'adjustment') {
    if (data.quantity === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'quantity 不能为 0',
        path: ['quantity'],
      });
    }
  } else if (data.quantity <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'quantity 必须大于 0',
      path: ['quantity'],
    });
  }
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;

/** 校验订单明细，失败返回首条可读错误（含字段路径） */
export function validateOrderItems(
  items: Array<{ product_id: string; quantity: number; unit_price: number }>
): { ok: true } | { ok: false; message: string; field?: string } {
  const parsed = orderItemsSchema.safeParse(items);
  if (parsed.success) return { ok: true };
  const issue = parsed.error.issues[0];
  const field = issue?.path?.length ? issue.path.join('.') : undefined;
  return {
    ok: false,
    message: issue?.message ?? '明细校验失败',
    field,
  };
}

export function validateInventoryQuantity(
  transaction_type: string,
  quantity: number
): { ok: true } | { ok: false; message: string; field: string } {
  const parsed = inventoryQuantitySchema.safeParse({ transaction_type, quantity });
  if (parsed.success) return { ok: true };
  const issue = parsed.error.issues[0];
  return {
    ok: false,
    message: issue?.message ?? '数量校验失败',
    field: 'quantity',
  };
}
