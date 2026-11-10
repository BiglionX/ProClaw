import { describe, expect, it } from 'vitest';
import { formatReturnNumber, summarizeReturnLines } from './returnOrderForm';

describe('returnOrderForm', () => {
  it('退货单号用本地日历，不取 UTC 日期', () => {
    const evening = new Date(2026, 10, 10, 23, 30);
    expect(formatReturnNumber('PR', evening, 'A3F7')).toBe('PR-20261110-A3F7');
    expect(formatReturnNumber('SR', evening, '9K2M')).toBe('SR-20261110-9K2M');
  });

  it('汇总只计入数量大于 0 的行', () => {
    expect(summarizeReturnLines([
      { quantity: 0, unit_price: 10 },
      { quantity: 2, unit_price: 10.5 },
      { quantity: 1, unit_price: 3 },
    ])).toEqual({ quantity: 3, amount: 24 });
    expect(summarizeReturnLines([{ quantity: 3, unit_price: 0.1 }]).amount).toBe(0.3);
  });
});
