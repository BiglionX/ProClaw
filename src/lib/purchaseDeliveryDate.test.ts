import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  changeExpectedDeliveryDate,
  changeOrderDate,
  createDeliveryDateState,
} from './purchaseDeliveryDate';

describe('purchaseDeliveryDate', () => {
  it('按日历日加一天，跨月和闰年都不借 UTC', () => {
    expect(addCalendarDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addCalendarDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addCalendarDays('2025-02-28', 1)).toBe('2025-03-01');
  });

  it('未手动改过时，预计交货始终是订单日期的次日', () => {
    const opened = createDeliveryDateState('2026-11-10');
    expect(opened.expectedTouched).toBe(false);
    expect(opened.expectedDeliveryDate).toBe('2026-11-11');

    const next = changeOrderDate(opened, '2026-12-01');
    expect(next.orderDate).toBe('2026-12-01');
    expect(next.expectedDeliveryDate).toBe('2026-12-02');
    expect(next.expectedTouched).toBe(false);
  });

  it('手动改过预计交货后，订单日期变化不再联动', () => {
    const opened = createDeliveryDateState('2026-11-10');
    const edited = changeExpectedDeliveryDate(opened, '2026-11-20');
    expect(edited.expectedTouched).toBe(true);
    expect(edited.expectedDeliveryDate).toBe('2026-11-20');

    const next = changeOrderDate(edited, '2026-12-01');
    expect(next.orderDate).toBe('2026-12-01');
    expect(next.expectedDeliveryDate).toBe('2026-11-20');
    expect(next.expectedTouched).toBe(true);
  });

  it('清空预计交货后恢复联动，并回到订单日期的次日', () => {
    const opened = createDeliveryDateState('2026-11-10');
    const edited = changeExpectedDeliveryDate(opened, '2026-11-20');
    const cleared = changeExpectedDeliveryDate(edited, '');
    expect(cleared.expectedTouched).toBe(false);
    expect(cleared.expectedDeliveryDate).toBe('2026-11-11');

    const next = changeOrderDate(cleared, '2026-12-01');
    expect(next.expectedDeliveryDate).toBe('2026-12-02');
    expect(next.expectedTouched).toBe(false);
  });
});
