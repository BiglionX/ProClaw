import { describe, expect, it } from 'vitest';
import {
  buildPurchaseDraftUpdate,
  buildSalesDraftUpdate,
  canEditDraftOrder,
  draftOrderTotal,
  linesFromOrderItems,
  validateDraftOrderLines,
  type DraftOrderLine,
} from './draftOrderEdit';

const lines: DraftOrderLine[] = [
  { product_id: 'p1', product_name: '电池', quantity: 2, unit_price: 10.5 },
  { product_id: 'p2', product_name: '数据线', quantity: 1, unit_price: 3 },
];

describe('draftOrderEdit', () => {
  it('只有草稿可以改明细', () => {
    expect(canEditDraftOrder('draft')).toBe(true);
    expect(canEditDraftOrder('confirmed')).toBe(false);
    expect(canEditDraftOrder('shipped')).toBe(false);
    expect(canEditDraftOrder('received')).toBe(false);
    expect(canEditDraftOrder('cancelled')).toBe(false);
  });

  it('总价按数量乘单价重算', () => {
    expect(draftOrderTotal(lines)).toBe(24);
    expect(draftOrderTotal([])).toBe(0);
  });

  it('拒绝空明细、非正整数数量和负单价', () => {
    expect(validateDraftOrderLines([])).toBe('请至少保留一个商品');
    expect(validateDraftOrderLines([{ ...lines[0], quantity: 0 }])).toBe('数量必须是大于 0 的整数');
    expect(validateDraftOrderLines([{ ...lines[0], quantity: 1.5 }])).toBe('数量必须是大于 0 的整数');
    expect(validateDraftOrderLines([{ ...lines[0], unit_price: -1 }])).toBe('单价不能为负数');
    expect(validateDraftOrderLines(lines)).toBeNull();
  });

  it('采购草稿保存带上供应商和全部明细，总价与重算一致', () => {
    const payload = buildPurchaseDraftUpdate({
      supplier_id: 'sup-1',
      order_date: '2026-11-10',
      expected_delivery_date: '2026-11-11',
      notes: '加急',
    }, lines);
    expect(payload.supplier_id).toBe('sup-1');
    expect(payload.items).toEqual([
      { product_id: 'p1', quantity: 2, unit_price: 10.5 },
      { product_id: 'p2', quantity: 1, unit_price: 3 },
    ]);
    const recomputed = payload.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    expect(recomputed).toBe(draftOrderTotal(lines));
  });

  it('销售草稿保存带上客户和收货地址', () => {
    const payload = buildSalesDraftUpdate({
      customer_id: 'cust-1',
      shipping_address: '仓库 A',
      order_date: '2026-11-10',
    }, linesFromOrderItems([{ product_id: 'p1', product_name: '电池', quantity: 4, unit_price: 8 }]));
    expect(payload.customer_id).toBe('cust-1');
    expect(payload.shipping_address).toBe('仓库 A');
    expect(payload.items).toEqual([{ product_id: 'p1', quantity: 4, unit_price: 8 }]);
    expect(draftOrderTotal(linesFromOrderItems(payload.items.map(item => ({
      ...item,
      product_name: '电池',
    }))))).toBe(32);
  });
});
