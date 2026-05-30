// ProClaw Cloud 托管版 - 数据导出工具库
// 支持 JSON / CSV 格式，内置预设模板和自定义模板

export type ExportFormat = 'json' | 'csv';

export interface ExportField {
  key: string;
  label: string;
}

export interface ExportTableConfig {
  tableName: string;
  fields: ExportField[];
  filters?: Record<string, string>;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  tables: ExportTableConfig[];
}

export interface ExportRequest {
  templateId: string;
  format: ExportFormat;
  customTables?: ExportTableConfig[]; // 自定义模板时使用
  customName?: string; // 自定义模板名称
}

export interface ExportResult {
  success: boolean;
  data?: string;
  fileName?: string;
  format: ExportFormat;
  totalRecords?: number;
  error?: string;
}

// ========== 预设模板 ==========

export const PRESET_TEMPLATES: ExportTemplate[] = [
  {
    id: 'full',
    name: '全量数据',
    description: '导出所有业务数据（商品、采购、销售、库存、联系人、聊天记录）',
    tables: [
      {
        tableName: 'products_spu',
        fields: [
          { key: 'spu_code', label: '商品编码' },
          { key: 'name', label: '商品名称' },
          { key: 'subtitle', label: '副标题' },
          { key: 'description', label: '描述' },
          { key: 'category_id', label: '分类' },
          { key: 'unit', label: '单位' },
          { key: 'status', label: '状态' },
          { key: 'created_at', label: '创建时间' },
        ],
      },
      {
        tableName: 'products_sku',
        fields: [
          { key: 'sku_code', label: 'SKU编码' },
          { key: 'spec_text', label: '规格' },
          { key: 'cost_price', label: '成本价' },
          { key: 'sell_price', label: '售价' },
          { key: 'current_stock', label: '当前库存' },
          { key: 'min_stock', label: '最低库存' },
        ],
      },
      {
        tableName: 'purchase_orders',
        fields: [
          { key: 'po_number', label: '采购单号' },
          { key: 'order_date', label: '采购日期' },
          { key: 'status', label: '状态' },
          { key: 'total_amount', label: '总金额' },
          { key: 'payment_status', label: '付款状态' },
          { key: 'notes', label: '备注' },
          { key: 'created_at', label: '创建时间' },
        ],
      },
      {
        tableName: 'sales_orders',
        fields: [
          { key: 'so_number', label: '销售单号' },
          { key: 'order_date', label: '销售日期' },
          { key: 'status', label: '状态' },
          { key: 'total_amount', label: '总金额' },
          { key: 'payment_status', label: '付款状态' },
          { key: 'shipping_address', label: '收货地址' },
          { key: 'created_at', label: '创建时间' },
        ],
      },
      {
        tableName: 'inventory_transactions',
        fields: [
          { key: 'transaction_type', label: '交易类型' },
          { key: 'quantity', label: '数量' },
          { key: 'reference_no', label: '参考号' },
          { key: 'reason', label: '原因' },
          { key: 'created_at', label: '交易时间' },
        ],
      },
      {
        tableName: 'customers',
        fields: [
          { key: 'code', label: '客户编码' },
          { key: 'name', label: '客户名称' },
          { key: 'contact_person', label: '联系人' },
          { key: 'phone', label: '电话' },
          { key: 'email', label: '邮箱' },
          { key: 'address', label: '地址' },
          { key: 'created_at', label: '创建时间' },
        ],
      },
      {
        tableName: 'suppliers',
        fields: [
          { key: 'code', label: '供应商编码' },
          { key: 'name', label: '供应商名称' },
          { key: 'contact_person', label: '联系人' },
          { key: 'phone', label: '电话' },
          { key: 'email', label: '邮箱' },
          { key: 'address', label: '地址' },
          { key: 'created_at', label: '创建时间' },
        ],
      },
      {
        tableName: 'contacts',
        fields: [
          { key: 'name', label: '联系人' },
          { key: 'phone', label: '电话' },
          { key: 'email', label: '邮箱' },
          { key: 'notes', label: '备注' },
          { key: 'created_at', label: '创建时间' },
        ],
      },
    ],
  },
  {
    id: 'products',
    name: '仅商品数据',
    description: '导出商品 SPU 和 SKU 数据',
    tables: [
      {
        tableName: 'products_spu',
        fields: [
          { key: 'spu_code', label: '商品编码' },
          { key: 'name', label: '商品名称' },
          { key: 'subtitle', label: '副标题' },
          { key: 'description', label: '描述' },
          { key: 'category_id', label: '分类' },
          { key: 'unit', label: '单位' },
          { key: 'is_on_sale', label: '在售' },
          { key: 'status', label: '状态' },
          { key: 'created_at', label: '创建时间' },
          { key: 'updated_at', label: '更新时间' },
        ],
      },
      {
        tableName: 'products_sku',
        fields: [
          { key: 'sku_code', label: 'SKU编码' },
          { key: 'spec_text', label: '规格' },
          { key: 'cost_price', label: '成本价' },
          { key: 'sell_price', label: '售价' },
          { key: 'current_stock', label: '当前库存' },
          { key: 'min_stock', label: '最低库存' },
          { key: 'barcode', label: '条码' },
        ],
      },
    ],
  },
  {
    id: 'orders',
    name: '仅订单数据',
    description: '导出采购单和销售单数据',
    tables: [
      {
        tableName: 'purchase_orders',
        fields: [
          { key: 'po_number', label: '采购单号' },
          { key: 'supplier_id', label: '供应商' },
          { key: 'order_date', label: '采购日期' },
          { key: 'expected_delivery_date', label: '预计到货' },
          { key: 'status', label: '状态' },
          { key: 'total_amount', label: '总金额' },
          { key: 'paid_amount', label: '已付金额' },
          { key: 'payment_status', label: '付款状态' },
          { key: 'notes', label: '备注' },
          { key: 'created_at', label: '创建时间' },
        ],
      },
      {
        tableName: 'sales_orders',
        fields: [
          { key: 'so_number', label: '销售单号' },
          { key: 'customer_id', label: '客户' },
          { key: 'order_date', label: '销售日期' },
          { key: 'expected_delivery_date', label: '预计发货' },
          { key: 'status', label: '状态' },
          { key: 'total_amount', label: '总金额' },
          { key: 'paid_amount', label: '已付金额' },
          { key: 'payment_status', label: '付款状态' },
          { key: 'created_at', label: '创建时间' },
        ],
      },
    ],
  },
  {
    id: 'inventory',
    name: '仅库存数据',
    description: '导出库存交易记录',
    tables: [
      {
        tableName: 'inventory_transactions',
        fields: [
          { key: 'product_id', label: '商品ID' },
          { key: 'sku_id', label: 'SKU ID' },
          { key: 'transaction_type', label: '交易类型' },
          { key: 'quantity', label: '数量' },
          { key: 'reference_no', label: '参考号' },
          { key: 'reason', label: '原因' },
          { key: 'notes', label: '备注' },
          { key: 'created_at', label: '交易时间' },
        ],
      },
      {
        tableName: 'products_sku',
        fields: [
          { key: 'sku_code', label: 'SKU编码' },
          { key: 'spec_text', label: '规格' },
          { key: 'current_stock', label: '当前库存' },
          { key: 'min_stock', label: '最低库存' },
          { key: 'cost_price', label: '成本价' },
        ],
      },
    ],
  },
  {
    id: 'contacts',
    name: '联系人+聊天',
    description: '导出联系人和聊天记录',
    tables: [
      {
        tableName: 'contacts',
        fields: [
          { key: 'name', label: '联系人' },
          { key: 'phone', label: '电话' },
          { key: 'email', label: '邮箱' },
          { key: 'notes', label: '备注' },
          { key: 'created_at', label: '创建时间' },
        ],
      },
      {
        tableName: 'messages',
        fields: [
          { key: 'contact_id', label: '联系人ID' },
          { key: 'direction', label: '方向' },
          { key: 'content', label: '内容' },
          { key: 'content_type', label: '类型' },
          { key: 'created_at', label: '发送时间' },
        ],
      },
    ],
  },
];

// ========== 数据导出函数 ==========

/**
 * 获取所有可用数据表的信息（用于自定义模板）
 */
export const ALL_AVAILABLE_TABLES: { tableName: string; label: string; fields: ExportField[] }[] = [
  {
    tableName: 'products_spu',
    label: '商品(SPU)',
    fields: [
      { key: 'spu_code', label: '商品编码' },
      { key: 'name', label: '商品名称' },
      { key: 'subtitle', label: '副标题' },
      { key: 'description', label: '描述' },
      { key: 'category_id', label: '分类' },
      { key: 'brand_id', label: '品牌' },
      { key: 'unit', label: '单位' },
      { key: 'weight', label: '重量' },
      { key: 'is_on_sale', label: '在售' },
      { key: 'is_featured', label: '推荐' },
      { key: 'status', label: '状态' },
      { key: 'created_at', label: '创建时间' },
      { key: 'updated_at', label: '更新时间' },
    ],
  },
  {
    tableName: 'products_sku',
    label: '商品(SKU)',
    fields: [
      { key: 'sku_code', label: 'SKU编码' },
      { key: 'spec_text', label: '规格' },
      { key: 'cost_price', label: '成本价' },
      { key: 'sell_price', label: '售价' },
      { key: 'market_price', label: '市场价' },
      { key: 'current_stock', label: '当前库存' },
      { key: 'min_stock', label: '最低库存' },
      { key: 'max_stock', label: '最高库存' },
      { key: 'barcode', label: '条码' },
      { key: 'status', label: '状态' },
    ],
  },
  {
    tableName: 'purchase_orders',
    label: '采购单',
    fields: [
      { key: 'po_number', label: '采购单号' },
      { key: 'order_date', label: '采购日期' },
      { key: 'expected_delivery_date', label: '预计到货' },
      { key: 'status', label: '状态' },
      { key: 'total_amount', label: '总金额' },
      { key: 'paid_amount', label: '已付金额' },
      { key: 'payment_status', label: '付款状态' },
      { key: 'notes', label: '备注' },
      { key: 'created_at', label: '创建时间' },
    ],
  },
  {
    tableName: 'purchase_order_items',
    label: '采购单明细',
    fields: [
      { key: 'order_id', label: '采购单ID' },
      { key: 'product_id', label: '商品ID' },
      { key: 'quantity', label: '数量' },
      { key: 'unit_price', label: '单价' },
      { key: 'total_price', label: '总价' },
      { key: 'received_quantity', label: '已收数量' },
    ],
  },
  {
    tableName: 'sales_orders',
    label: '销售单',
    fields: [
      { key: 'so_number', label: '销售单号' },
      { key: 'order_date', label: '销售日期' },
      { key: 'expected_delivery_date', label: '预计发货' },
      { key: 'status', label: '状态' },
      { key: 'total_amount', label: '总金额' },
      { key: 'paid_amount', label: '已付金额' },
      { key: 'payment_status', label: '付款状态' },
      { key: 'shipping_address', label: '收货地址' },
      { key: 'notes', label: '备注' },
      { key: 'created_at', label: '创建时间' },
    ],
  },
  {
    tableName: 'sales_order_items',
    label: '销售单明细',
    fields: [
      { key: 'order_id', label: '销售单ID' },
      { key: 'product_id', label: '商品ID' },
      { key: 'quantity', label: '数量' },
      { key: 'unit_price', label: '单价' },
      { key: 'total_price', label: '总价' },
      { key: 'shipped_quantity', label: '已发数量' },
    ],
  },
  {
    tableName: 'inventory_transactions',
    label: '库存交易',
    fields: [
      { key: 'product_id', label: '商品ID' },
      { key: 'sku_id', label: 'SKU ID' },
      { key: 'transaction_type', label: '交易类型' },
      { key: 'quantity', label: '数量' },
      { key: 'reference_no', label: '参考号' },
      { key: 'reason', label: '原因' },
      { key: 'notes', label: '备注' },
      { key: 'created_at', label: '交易时间' },
    ],
  },
  {
    tableName: 'customers',
    label: '客户',
    fields: [
      { key: 'code', label: '客户编码' },
      { key: 'name', label: '客户名称' },
      { key: 'contact_person', label: '联系人' },
      { key: 'phone', label: '电话' },
      { key: 'email', label: '邮箱' },
      { key: 'address', label: '地址' },
      { key: 'customer_type', label: '客户类型' },
      { key: 'credit_limit', label: '信用额度' },
      { key: 'is_active', label: '启用' },
      { key: 'notes', label: '备注' },
    ],
  },
  {
    tableName: 'suppliers',
    label: '供应商',
    fields: [
      { key: 'code', label: '供应商编码' },
      { key: 'name', label: '供应商名称' },
      { key: 'contact_person', label: '联系人' },
      { key: 'phone', label: '电话' },
      { key: 'email', label: '邮箱' },
      { key: 'address', label: '地址' },
      { key: 'payment_terms', label: '付款条件' },
      { key: 'is_active', label: '启用' },
      { key: 'notes', label: '备注' },
    ],
  },
  {
    tableName: 'contacts',
    label: '联系人',
    fields: [
      { key: 'name', label: '名称' },
      { key: 'phone', label: '电话' },
      { key: 'email', label: '邮箱' },
      { key: 'notes', label: '备注' },
      { key: 'created_at', label: '创建时间' },
    ],
  },
  {
    tableName: 'messages',
    label: '聊天消息',
    fields: [
      { key: 'contact_id', label: '联系人ID' },
      { key: 'direction', label: '方向' },
      { key: 'content', label: '内容' },
      { key: 'content_type', label: '类型' },
      { key: 'is_read', label: '已读' },
      { key: 'created_at', label: '发送时间' },
    ],
  },
];

/**
 * 将数据转换为 CSV 格式
 */
export function toCsv(data: Record<string, unknown>[], fields: ExportField[]): string {
  const header = fields.map(f => escapeCsvField(f.label)).join(',');
  const rows = data.map(row => {
    return fields.map(f => {
      const value = row[f.key];
      return escapeCsvField(value != null ? String(value) : '');
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 将数据转换为 JSON 格式
 */
export function toJson(data: Record<string, unknown>[], fields: ExportField[]): string {
  const filtered = data.map(row => {
    const result: Record<string, unknown> = {};
    for (const f of fields) {
      result[f.label] = row[f.key];
    }
    return result;
  });
  return JSON.stringify(filtered, null, 2);
}

/**
 * 生成导出文件名
 */
export function generateExportFileName(templateName: string, format: ExportFormat): string {
  const date = new Date().toISOString().split('T')[0];
  return `ProClaw_${templateName}_${date}.${format}`;
}
