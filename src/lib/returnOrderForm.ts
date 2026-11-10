export interface ReturnLineDraft {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  max_quantity?: number;
  line_note: string;
}

export function formatReturnNumber(prefix: string, date: Date, suffix: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${prefix}-${year}${month}${day}-${suffix}`;
}

function roundMoney(value: number): number {
  return Number((Math.round(value * 100) / 100).toFixed(2));
}

export function summarizeReturnLines(lines: Array<{ quantity: number; unit_price: number }>): {
  quantity: number;
  amount: number;
} {
  return lines.reduce((sum, line) => {
    if (!(line.quantity > 0)) return sum;
    return {
      quantity: sum.quantity + line.quantity,
      amount: roundMoney(sum.amount + line.quantity * line.unit_price),
    };
  }, { quantity: 0, amount: 0 });
}
