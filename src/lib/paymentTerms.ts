export type SettlementType = 'cash' | 'monthly' | 'custom';

export interface PaymentTermsState {
  type: SettlementType;
  days: number;
  customText: string;
}

export function parsePaymentTerms(value: string | undefined): PaymentTermsState {
  const text = (value ?? '').trim();
  if (!text || text === '现结' || /^cod$/i.test(text)) {
    return { type: 'cash', days: 30, customText: '' };
  }
  const monthly = text.match(/^月结\s*(\d+)\s*天?$/);
  if (monthly) {
    return { type: 'monthly', days: Number(monthly[1]), customText: '' };
  }
  if (text === '月结') {
    return { type: 'monthly', days: 30, customText: '' };
  }
  return { type: 'custom', days: 30, customText: text };
}

export function formatPaymentTerms(state: PaymentTermsState): string {
  if (state.type === 'cash') return '现结';
  if (state.type === 'monthly') {
    const days = Number.isFinite(state.days) ? Math.trunc(state.days) : 0;
    return `月结${days}天`;
  }
  return state.customText.trim();
}

export function creditLimitApplies(type: SettlementType): boolean {
  return type === 'monthly' || type === 'custom';
}

export function paymentTermsError(state: PaymentTermsState): string | undefined {
  if (state.type === 'monthly' && (!Number.isInteger(state.days) || state.days <= 0)) {
    return '账期天数必须是大于 0 的整数';
  }
  if (state.type === 'custom' && !state.customText.trim()) {
    return '请填写自定义付款条件';
  }
  return undefined;
}
