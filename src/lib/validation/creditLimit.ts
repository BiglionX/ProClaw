export function validateCreditLimit(value: number | undefined): string | undefined {
  if (value == null) return undefined;
  if (!(value >= 0)) return '信用额度不能为负数';
  return undefined;
}
