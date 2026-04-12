import { supabase } from '../lib/supabase';

/**
 * 测试 Supabase 连接
 */
export async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');

    // 测试 1: 检查是否可以查询表
    const { data: tables, error: tableError } = await supabase
      .from('products')
      .select('count', { count: 'exact', head: true });

    if (tableError) {
      console.error('❌ Table query failed:', tableError);
      return {
        success: false,
        message: `Table query failed: ${tableError.message}`,
      };
    }

    console.log('✅ Table query successful');

    // 测试 2: 获取数据库信息
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'version'
    );

    if (!rpcError) {
      console.log('✅ Database version:', rpcResult);
    }

    return {
      success: true,
      message: 'Connection successful',
      productCount: tables,
    };
  } catch (error: any) {
    console.error('❌ Connection test failed:', error);
    return {
      success: false,
      message: error.message || 'Unknown error',
    };
  }
}

/**
 * 列出所有表
 */
export async function listTables() {
  try {
    const tables = [
      'users',
      'product_categories',
      'brands',
      'products',
      'inventory_transactions',
      'suppliers',
      'purchase_orders',
      'purchase_order_items',
      'customers',
      'sales_orders',
      'sales_order_items',
      'accounts',
      'financial_transactions',
    ];

    const results = [];

    for (const tableName of tables) {
      const { count, error } = await supabase
        .from(tableName as any)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.warn(`⚠️  Table ${tableName}: ${error.message}`);
        results.push({
          name: tableName,
          exists: false,
          error: error.message,
        });
      } else {
        console.log(`✅ Table ${tableName}: ${count} records`);
        results.push({
          name: tableName,
          exists: true,
          recordCount: count,
        });
      }
    }

    return results;
  } catch (error: any) {
    console.error('Failed to list tables:', error);
    throw error;
  }
}
