import { describe, expect, it } from 'vitest';
import { validateCreditLimit } from './creditLimit';

describe('validateCreditLimit', () => {
  it('拒绝负数，允许 0 和空值', () => {
    expect(validateCreditLimit(-1)).toBe('信用额度不能为负数');
    expect(validateCreditLimit(0)).toBeUndefined();
    expect(validateCreditLimit(1000)).toBeUndefined();
    expect(validateCreditLimit(undefined)).toBeUndefined();
  });
});
