import { describe, expect, it } from 'vitest';
import {
  hasSupplierContactErrors,
  validateSupplierContact,
} from './supplierContact';

describe('validateSupplierContact', () => {
  it('电话和邮箱都为空时通过', () => {
    expect(validateSupplierContact({ phone: '', email: '' })).toEqual({});
    expect(validateSupplierContact({ phone: '   ', email: '  ' })).toEqual({});
  });

  it('接受常见电话格式', () => {
    for (const phone of ['13800138000', '+8613800138000', '+86-138-0013-8000', '010-12345678']) {
      expect(validateSupplierContact({ phone, email: '' }).phone, phone).toBeUndefined();
    }
  });

  it('拒绝含字母、空格、括号或长度不合理的电话', () => {
    for (const phone of ['138abc', '138 0013 8000', '(010)12345678', '12345', '1234567890123456', '+86--123456', '86+1234567', '13800138000a']) {
      const errors = validateSupplierContact({ phone, email: '' });
      expect(errors.phone, phone).toBeTruthy();
    }
  });

  it('接受基础邮箱并拒绝明显错误格式', () => {
    expect(validateSupplierContact({ email: 'buyer@example.com' }).email).toBeUndefined();
    expect(validateSupplierContact({ email: 'a.b+c@sub.example.co' }).email).toBeUndefined();
    for (const email of ['not-an-email', 'a@b', 'a@.com', '@example.com', 'a b@example.com', 'a@example']) {
      expect(validateSupplierContact({ email }).email, email).toBeTruthy();
    }
  });

  it('有任一字段错误时阻止提交', () => {
    expect(hasSupplierContactErrors(validateSupplierContact({ phone: 'abc', email: 'buyer@example.com' }))).toBe(true);
    expect(hasSupplierContactErrors(validateSupplierContact({ phone: '13800138000', email: 'buyer@example.com' }))).toBe(false);
  });
});
