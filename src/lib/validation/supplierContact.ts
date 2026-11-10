export interface SupplierContactInput {
  phone?: string;
  email?: string;
}

export interface SupplierContactErrors {
  phone?: string;
  email?: string;
}

const PHONE_PATTERN = /^\+?[0-9]+(?:-[0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PHONE_DIGITS = 6;
const MAX_PHONE_DIGITS = 15;

export function validateSupplierContact(input: SupplierContactInput): SupplierContactErrors {
  const errors: SupplierContactErrors = {};
  const phone = (input.phone ?? '').trim();
  if (phone) {
    const digits = phone.replace(/\D/g, '').length;
    const lengthOk = digits >= MIN_PHONE_DIGITS && digits <= MAX_PHONE_DIGITS && phone.length <= 20;
    if (!PHONE_PATTERN.test(phone) || !lengthOk) {
      errors.phone = '电话只能包含数字、+ 和 -，且数字长度为 6 到 15 位';
    }
  }

  const email = (input.email ?? '').trim();
  if (email && (!EMAIL_PATTERN.test(email) || email.length > 254)) {
    errors.email = '请输入有效的邮箱地址';
  }

  return errors;
}

export function hasSupplierContactErrors(errors: SupplierContactErrors): boolean {
  return Boolean(errors.phone || errors.email);
}
