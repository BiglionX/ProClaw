export interface SupplierContactInput {
  phone?: string;
  email?: string;
  website?: string;
}

export interface SupplierContactErrors {
  phone?: string;
  email?: string;
  website?: string;
}

const PHONE_PATTERN = /^\+?[0-9]+(?:-[0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const MIN_PHONE_DIGITS = 6;
const MAX_PHONE_DIGITS = 15;

function isWebsite(value: string): boolean {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
    } catch {
      return false;
    }
  }
  return DOMAIN_PATTERN.test(value);
}

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

  const website = (input.website ?? '').trim();
  if (website && !isWebsite(website)) {
    errors.website = '网站需以 http:// 或 https:// 开头，或填写如 www.example.com 的域名';
  }

  return errors;
}

export function hasSupplierContactErrors(errors: SupplierContactErrors): boolean {
  return Boolean(errors.phone || errors.email || errors.website);
}
