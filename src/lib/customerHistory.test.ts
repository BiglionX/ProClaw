import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { getCustomerHistoryProducts } from './salesService';

vi.mock('@tauri-apps/api/core');
vi.mock('./tauri', async () => {
  const core = await import('@tauri-apps/api/core');
  return {
    isTauri: () => true,
    ipcInvoke: core.invoke,
    ipcInvokeOrNull: core.invoke,
    safeInvoke: core.invoke,
    openExternalUrl: vi.fn(),
  };
});

describe('getCustomerHistoryProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('按客户查询历史购买商品', async () => {
    const rows = [{
      id: 'p1', name: '电池', code: 'SPU-BAT', last_unit_price: 20,
      last_order_date: '2026-03-01', order_count: 2, total_quantity: 3,
    }];
    (invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(rows);
    await expect(getCustomerHistoryProducts('cust-1')).resolves.toEqual(rows);
    expect(invoke).toHaveBeenCalledWith('get_customer_history_products', { customerId: 'cust-1' });
  });

  it('没有客户时不发起查询', async () => {
    await expect(getCustomerHistoryProducts('  ')).resolves.toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
  });
});
