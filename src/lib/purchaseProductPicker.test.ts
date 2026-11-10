import { describe, expect, it } from 'vitest';
import {
  defaultPickerTab,
  filterPickerProducts,
  historyToPickerProduct,
  mergePickedProducts,
  rememberRecentProductIds,
  resolveRecentProducts,
  spuToPickerProduct,
  type PickerProduct,
} from './purchaseProductPicker';

const battery: PickerProduct = { id: 'p1', name: '电池', code: 'SPU-BAT', unitPrice: 10 };
const cable: PickerProduct = { id: 'p2', name: '数据线', code: 'SKU-CBL', unitPrice: 5 };

describe('purchaseProductPicker', () => {
  it('按名称或编码搜索，忽略大小写和首尾空格', () => {
    const all = [battery, cable];
    expect(filterPickerProducts(all, '  bat ')).toEqual([battery]);
    expect(filterPickerProducts(all, 'sku-cbl')).toEqual([cable]);
    expect(filterPickerProducts(all, '没有')).toEqual([]);
    expect(filterPickerProducts(all, '   ')).toEqual(all);
  });

  it('已选供应商时默认停在历史交易，否则看全部商品', () => {
    expect(defaultPickerTab('sup-1')).toBe('history');
    expect(defaultPickerTab('  ')).toBe('all');
  });

  it('新商品按数量 1 带入，已存在的商品数量加 1 且保留原单价', () => {
    const lines = [{ product_id: 'p1', product_name: '电池', quantity: 2, unit_price: 8 }];
    const merged = mergePickedProducts(lines, [
      { ...battery, unitPrice: 99 },
      cable,
    ]);
    expect(lines[0].quantity).toBe(2);
    expect(merged).toEqual([
      { product_id: 'p1', product_name: '电池', quantity: 3, unit_price: 8 },
      { product_id: 'p2', product_name: '数据线', quantity: 1, unit_price: 5 },
    ]);
  });

  it('最近使用去重、把本次选择放到最前，并丢掉已删除的商品', () => {
    expect(rememberRecentProductIds(['p1', 'p3'], ['p2', 'p1'], 3)).toEqual(['p1', 'p2', 'p3']);
    expect(rememberRecentProductIds(['a', 'b', 'c'], ['d'], 3)).toEqual(['d', 'a', 'b']);
    expect(resolveRecentProducts(['p2', 'missing', 'p1'], [battery, cable])).toEqual([cable, battery]);
  });

  it('历史成交价和默认 SKU 成本都能变成选择器里的单价', () => {
    expect(historyToPickerProduct({
      id: 'p1',
      name: '电池',
      code: 'SPU-BAT',
      last_unit_price: 12.5,
      last_order_date: '2026-03-01',
      order_count: 2,
      total_quantity: 6,
    })).toMatchObject({ id: 'p1', unitPrice: 12.5, lastOrderDate: '2026-03-01', orderCount: 2 });

    expect(spuToPickerProduct({
      id: 'p9',
      name: '新商品',
      spu_code: 'SPU-NEW',
      skus: [
        { is_default: false, cost_price: 3 },
        { is_default: true, cost_price: 7 },
      ],
    }).unitPrice).toBe(7);
  });
});
