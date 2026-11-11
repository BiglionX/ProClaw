import type { Product } from './productService';

export interface ProductsCsvFile {
  filename: string;
  content: string;
  rowCount: number;
}

/** 简单商品表只有 is_active，没有 status。缺 status 时按 is_active 判断。 */
export function isProductActive(product: { status?: string; is_active?: boolean }): boolean {
  if (product.status === 'active' || product.status === 'inactive') {
    return product.status === 'active';
  }
  return Boolean(product.is_active);
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildProductsCsv(products: Product[], now = new Date()): ProductsCsvFile {
  const headers = [
    'SKU',
    '产品名称',
    '成本价',
    '销售价',
    '当前库存',
    '最低库存',
    '最高库存',
    '单位',
    '状态',
  ];

  const rows = products.map(product => [
    product.sku,
    product.name,
    Number(product.cost_price || 0).toFixed(2),
    Number(product.sell_price || 0).toFixed(2),
    product.current_stock,
    product.min_stock,
    product.max_stock,
    product.unit,
    isProductActive(product) ? '活跃' : '停用',
  ]);

  const content = [
    headers.join(','),
    ...rows.map(row => row.map(cell => csvCell(cell)).join(',')),
  ].join('\n');

  const filename = `products_${now.toISOString().split('T')[0]}.csv`;
  return { filename, content, rowCount: products.length };
}

export function downloadProductsCsv(file: ProductsCsvFile): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return;
  }
  try {
    const blob = new Blob([`\ufeff${file.content}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', file.filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch {
    // 无下载能力时，调用方仍用文件名和行数回复
  }
}
