// ProClaw Cloud 托管版 - 多租户管理
// 实现 schema per tenant 模式

import { createServerSupabaseClient } from './supabase-server';

/**
 * 获取当前用户的 tenant schema 名称
 * 格式: tenant_{user_id_hash}
 */
export function getTenantSchema(userId: string): string {
  // 取 user_id 的前 8 位作为 schema 名的一部分
  const shortId = userId.replace(/-/g, '').substring(0, 8).toLowerCase();
  return `tenant_${shortId}`;
}

/**
 * 创建新用户的 tenant schema 和业务表
 */
export async function initializeTenantSchema(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const schema = getTenantSchema(userId);

  try {
    // 执行 schema 初始化 SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: generateTenantSchemaSQL(schema),
    });

    if (error) {
      console.error('初始化 tenant schema 失败:', error);
      return false;
    }

    // 记录租户创建
    await supabase.from('tenant_registry').upsert({
      user_id: userId,
      schema_name: schema,
      created_at: new Date().toISOString(),
      status: 'active',
    }, { onConflict: 'user_id' });

    return true;
  } catch (error) {
    console.error('初始化 tenant schema 失败:', error);
    return false;
  }
}

/**
 * 获取带 schema 前缀的表名
 */
export function schemaTable(schema: string, table: string): string {
  return `"${schema}"."${table}"`;
}

/**
 * 验证用户是否拥有指定 schema 的访问权限
 */
export function canAccessSchema(userId: string, schemaName: string): boolean {
  const expectedSchema = getTenantSchema(userId);
  return schemaName === expectedSchema;
}

/**
 * 生成 tenant schema 的完整建表 SQL
 */
function generateTenantSchemaSQL(schema: string): string {
  return `
    CREATE SCHEMA IF NOT EXISTS "${schema}";

    -- 商品 SPU 表
    CREATE TABLE IF NOT EXISTS "${schema}".products_spu (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      spu_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      category_id TEXT,
      brand_id TEXT,
      unit TEXT DEFAULT '件',
      weight NUMERIC,
      is_on_sale BOOLEAN DEFAULT true,
      is_featured BOOLEAN DEFAULT false,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'on_sale',
      images JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 商品 SKU 表
    CREATE TABLE IF NOT EXISTS "${schema}".products_sku (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      spu_id UUID REFERENCES "${schema}".products_spu(id) ON DELETE CASCADE,
      sku_code TEXT NOT NULL,
      specifications JSONB DEFAULT '{}',
      spec_text TEXT,
      cost_price NUMERIC DEFAULT 0,
      sell_price NUMERIC DEFAULT 0,
      market_price NUMERIC,
      current_stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 0,
      max_stock INTEGER DEFAULT 999999,
      barcode TEXT,
      is_default BOOLEAN DEFAULT false,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 供应商表
    CREATE TABLE IF NOT EXISTS "${schema}".suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      payment_terms TEXT,
      is_active BOOLEAN DEFAULT true,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 客户表
    CREATE TABLE IF NOT EXISTS "${schema}".customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      customer_type TEXT DEFAULT 'individual',
      credit_limit NUMERIC DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 采购订单表
    CREATE TABLE IF NOT EXISTS "${schema}".purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      po_number TEXT NOT NULL UNIQUE,
      supplier_id UUID REFERENCES "${schema}".suppliers(id),
      order_date DATE DEFAULT CURRENT_DATE,
      expected_delivery_date DATE,
      status TEXT DEFAULT 'draft',
      total_amount NUMERIC DEFAULT 0,
      paid_amount NUMERIC DEFAULT 0,
      payment_status TEXT DEFAULT 'unpaid',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 采购订单明细表
    CREATE TABLE IF NOT EXISTS "${schema}".purchase_order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES "${schema}".purchase_orders(id) ON DELETE CASCADE,
      product_id UUID REFERENCES "${schema}".products_spu(id),
      quantity INTEGER NOT NULL,
      unit_price NUMERIC NOT NULL,
      total_price NUMERIC,
      received_quantity INTEGER DEFAULT 0,
      notes TEXT
    );

    -- 销售订单表
    CREATE TABLE IF NOT EXISTS "${schema}".sales_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      so_number TEXT NOT NULL UNIQUE,
      customer_id UUID REFERENCES "${schema}".customers(id),
      order_date DATE DEFAULT CURRENT_DATE,
      expected_delivery_date DATE,
      status TEXT DEFAULT 'draft',
      total_amount NUMERIC DEFAULT 0,
      paid_amount NUMERIC DEFAULT 0,
      payment_status TEXT DEFAULT 'unpaid',
      shipping_address TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 销售订单明细表
    CREATE TABLE IF NOT EXISTS "${schema}".sales_order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES "${schema}".sales_orders(id) ON DELETE CASCADE,
      product_id UUID REFERENCES "${schema}".products_spu(id),
      quantity INTEGER NOT NULL,
      unit_price NUMERIC NOT NULL,
      total_price NUMERIC,
      shipped_quantity INTEGER DEFAULT 0,
      notes TEXT
    );

    -- 库存交易表
    CREATE TABLE IF NOT EXISTS "${schema}".inventory_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES "${schema}".products_spu(id),
      sku_id UUID REFERENCES "${schema}".products_sku(id),
      transaction_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reference_no TEXT,
      reason TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 联系人表（聊天用）
    CREATE TABLE IF NOT EXISTS "${schema}".contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      avatar_url TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 聊天消息表
    CREATE TABLE IF NOT EXISTS "${schema}".messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id UUID REFERENCES "${schema}".contacts(id),
      direction TEXT NOT NULL,
      content TEXT NOT NULL,
      content_type TEXT DEFAULT 'text',
      file_url TEXT,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 文件记录表
    CREATE TABLE IF NOT EXISTS "${schema}".files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      mime_type TEXT,
      public_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_${schema}_products_spu_status ON "${schema}".products_spu(status);
    CREATE INDEX IF NOT EXISTS idx_${schema}_products_sku_spu ON "${schema}".products_sku(spu_id);
    CREATE INDEX IF NOT EXISTS idx_${schema}_purchase_orders_status ON "${schema}".purchase_orders(status);
    CREATE INDEX IF NOT EXISTS idx_${schema}_sales_orders_status ON "${schema}".sales_orders(status);
    CREATE INDEX IF NOT EXISTS idx_${schema}_inventory_type ON "${schema}".inventory_transactions(transaction_type);
    CREATE INDEX IF NOT EXISTS idx_${schema}_messages_contact ON "${schema}".messages(contact_id, created_at DESC);
  `;
}
