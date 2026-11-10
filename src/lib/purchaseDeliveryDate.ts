export interface DeliveryDateState {
  orderDate: string;
  expectedDeliveryDate: string;
  expectedTouched: boolean;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayLocalIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createDeliveryDateState(orderDate: string): DeliveryDateState {
  return {
    orderDate,
    expectedDeliveryDate: addCalendarDays(orderDate, 1),
    expectedTouched: false,
  };
}

export function changeOrderDate(state: DeliveryDateState, orderDate: string): DeliveryDateState {
  if (state.expectedTouched) {
    return { ...state, orderDate };
  }
  return createDeliveryDateState(orderDate);
}

export function changeExpectedDeliveryDate(state: DeliveryDateState, expected: string): DeliveryDateState {
  if (!expected) {
    return createDeliveryDateState(state.orderDate);
  }
  return {
    ...state,
    expectedDeliveryDate: expected,
    expectedTouched: true,
  };
}
