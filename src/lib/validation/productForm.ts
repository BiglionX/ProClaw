export interface ProductFormInput {
  name: string;
  cost_price: number;
  sell_price: number;
}

export interface ProductFormErrors {
  name?: string;
  cost_price?: string;
  sell_price?: string;
}

export function validateProductForm(input: ProductFormInput): ProductFormErrors {
  const errors: ProductFormErrors = {};
  if (!input.name.trim()) {
    errors.name = '产品名称不能为空';
  }
  if (!(input.cost_price >= 0)) {
    errors.cost_price = '成本价不能为负数';
  }
  if (!(input.sell_price >= 0)) {
    errors.sell_price = '销售价不能为负数';
  }
  return errors;
}

export function hasProductFormErrors(errors: ProductFormErrors): boolean {
  return Boolean(errors.name || errors.cost_price || errors.sell_price);
}
