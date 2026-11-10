import { describe, expect, it } from 'vitest';
import {
  creditLimitApplies,
  formatPaymentTerms,
  parsePaymentTerms,
  paymentTermsError,
} from './paymentTerms';

describe('paymentTerms', () => {
  it('把现结、月结和自由文本拆开', () => {
    expect(parsePaymentTerms('')).toMatchObject({ type: 'cash' });
    expect(parsePaymentTerms('现结').type).toBe('cash');
    expect(parsePaymentTerms('COD').type).toBe('cash');
    expect(parsePaymentTerms('月结30天')).toEqual({ type: 'monthly', days: 30, customText: '' });
    expect(parsePaymentTerms('月结').days).toBe(30);
    expect(parsePaymentTerms('Net 45')).toMatchObject({ type: 'custom', customText: 'Net 45' });
  });

  it('再拼回原来的付款条件文本', () => {
    expect(formatPaymentTerms({ type: 'cash', days: 30, customText: '' })).toBe('现结');
    expect(formatPaymentTerms({ type: 'monthly', days: 45, customText: '' })).toBe('月结45天');
    expect(formatPaymentTerms({ type: 'custom', days: 30, customText: ' 货到付款 ' })).toBe('货到付款');
  });

  it('只有月结和自定义才使用信用额度', () => {
    expect(creditLimitApplies('cash')).toBe(false);
    expect(creditLimitApplies('monthly')).toBe(true);
    expect(creditLimitApplies('custom')).toBe(true);
  });

  it('月结天数和自定义文本不能空', () => {
    expect(paymentTermsError({ type: 'monthly', days: 0, customText: '' })).toBe('账期天数必须是大于 0 的整数');
    expect(paymentTermsError({ type: 'monthly', days: 1.5, customText: '' })).toBe('账期天数必须是大于 0 的整数');
    expect(paymentTermsError({ type: 'custom', days: 30, customText: '  ' })).toBe('请填写自定义付款条件');
    expect(paymentTermsError({ type: 'cash', days: 0, customText: '' })).toBeUndefined();
    expect(paymentTermsError({ type: 'monthly', days: 30, customText: '' })).toBeUndefined();
  });
});
