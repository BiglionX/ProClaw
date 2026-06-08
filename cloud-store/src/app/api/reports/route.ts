/* eslint-disable @typescript-eslint/no-explicit-any */
// ProClaw Shop - 数据报表 API
// 提供销售、库存、财务等经营数据分析

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantSchema } from '@/lib/tenant';
import { checkAndDeductToken } from '@/lib/tokenApi';

export const dynamic = 'force-dynamic';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

type ReportType = 'sales' | 'inventory' | 'finance' | 'customer';

interface DateRange {
  start: string;
  end: string;
}

function getDateRange(period: string): DateRange {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  let start: Date;

  switch (period) {
    case 'today':
      start = now;
      break;
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return {
    start: start.toISOString().split('T')[0],
    end: today,
  };
}

/**
 * 获取销售报表
 */
async function getSalesReport(
  supabase: any,
  schema: string,
  dateRange: DateRange
): Promise<Record<string, unknown>> {
  // 销售订单统计
  const { data: salesOrders } = await supabase.from(`"${schema}"."sales_orders"`).select('*').gte('order_date', dateRange.start).lte('order_date', dateRange.end);

  // 计算统计数据
  const totalOrders = salesOrders?.length || 0;
  const totalAmount = salesOrders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
  const paidAmount = salesOrders?.reduce((sum: number, o: any) => sum + (o.paid_amount || 0), 0) || 0;
  const unpaidAmount = totalAmount - paidAmount;

  // 按状态分组
  const byStatus = {
    draft: 0,
    pending: 0,
    confirmed: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0,
  };
  salesOrders?.forEach((o: any) => {
    const status = o.status || 'draft';
    byStatus[status as keyof typeof byStatus] = (byStatus[status as keyof typeof byStatus] || 0) + 1;
  });

  // 按日期分组
  const byDate: Record<string, { count: number; amount: number }> = {};
  salesOrders?.forEach((o: any) => {
    const date = o.order_date;
    if (!byDate[date]) {
      byDate[date] = { count: 0, amount: 0 };
    }
    byDate[date].count++;
    byDate[date].amount += o.total_amount || 0;
  });

  // 获取畅销商品
  const { data: salesItems } = await supabase.from(`"${schema}"."sales_order_items"`).select('*, product_id').order('created_at', { ascending: true });

  const productSales: Record<string, { quantity: number; amount: number }> = {};
  salesItems?.forEach((item: any) => {
    if (!productSales[item.product_id]) {
      productSales[item.product_id] = { quantity: 0, amount: 0 };
    }
    productSales[item.product_id].quantity += item.quantity || 0;
    productSales[item.product_id].amount += item.total_price || 0;
  });

  // 获取商品名称
  const productIds = Object.keys(productSales);
  const { data: products } = await supabase.from(`"${schema}"."products_spu"`).select('id, name').in('id', productIds);

  const productMap = new Map(products?.map((p: any) => [p.id, p.name]) || []);

  const topProducts = productIds
    .map(id => ({
      id,
      name: productMap.get(id) || '未知商品',
      quantity: productSales[id].quantity,
      amount: productSales[id].amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return {
    summary: {
      totalOrders,
      totalAmount,
      paidAmount,
      unpaidAmount,
      averageOrderValue: totalOrders > 0 ? totalAmount / totalOrders : 0,
    },
    byStatus,
    byDate,
    topProducts,
  };
}

/**
 * 获取库存报表
 */
async function getInventoryReport(
  supabase: any,
  schema: string
): Promise<Record<string, unknown>> {
  // 获取所有 SKU
  const { data: skus, error: skuError } = await supabase
    .from(`"${schema}"."products_sku"`)
    .select('*');

  if (skuError) throw skuError;

  // 计算库存统计
  const totalSKUs = skus?.length || 0;
  const totalStock = skus?.reduce((sum: number, s: any) => sum + (s.current_stock || 0), 0) || 0;
  const lowStockItems = skus?.filter((s: any) => s.current_stock <= s.min_stock) || [];
  const overStockItems = skus?.filter((s: any) => s.current_stock >= s.max_stock) || [];
  const outOfStockItems = skus?.filter((s: any) => s.current_stock === 0) || [];

  // 库存价值
  const inventoryValue = skus?.reduce((sum: number, s: any) => {
    return sum + (s.current_stock || 0) * (s.cost_price || 0);
  }, 0) || 0;

  // 获取商品信息
  const skuData = skus?.map((s: any) => ({
    ...s,
    stockLevel: s.current_stock <= s.min_stock ? 'low' : 
                s.current_stock >= s.max_stock ? 'high' : 'normal',
  })) || [];

  return {
    summary: {
      totalSKUs,
      totalStock,
      inventoryValue,
      lowStockCount: lowStockItems.length,
      overStockCount: overStockItems.length,
      outOfStockCount: outOfStockItems.length,
    },
    lowStockItems: lowStockItems.slice(0, 10),
    outOfStockItems: outOfStockItems.slice(0, 10),
    stockDistribution: {
      normal: skuData.filter((s: any) => s.stockLevel === 'normal').length,
      low: lowStockItems.length,
      over: overStockItems.length,
      out: outOfStockItems.length,
    },
    skuData: skuData.slice(0, 50),
  };
}

/**
 * 获取财务报表
 */
async function getFinanceReport(
  supabase: any,
  schema: string,
  dateRange: DateRange
): Promise<Record<string, unknown>> {
  // 销售数据
  const { data: salesOrders } = await supabase
    .from(`"${schema}"."sales_orders"`)
    .select('*')
    .gte('order_date', dateRange.start)
    .lte('order_date', dateRange.end);

  // 采购数据
  const { data: purchaseOrders } = await supabase
    .from(`"${schema}"."purchase_orders"`)
    .select('*')
    .gte('order_date', dateRange.start)
    .lte('order_date', dateRange.end);

  // 计算收入
  const salesRevenue = salesOrders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
  const receivedPayment = salesOrders?.reduce((sum: number, o: any) => sum + (o.paid_amount || 0), 0) || 0;
  const pendingPayment = salesRevenue - receivedPayment;

  // 计算支出
  const purchaseCost = purchaseOrders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
  const paidPurchase = purchaseOrders?.reduce((sum: number, o: any) => sum + (o.paid_amount || 0), 0) || 0;

  // 预计利润
  const estimatedProfit = salesRevenue - purchaseCost;
  const actualProfit = receivedPayment - paidPurchase;

  // 按月统计
  const byMonth: Record<string, { revenue: number; cost: number; profit: number }> = {};
  
  const processOrder = (date: string, amount: number, type: 'revenue' | 'cost') => {
    const month = date.substring(0, 7); // YYYY-MM
    if (!byMonth[month]) {
      byMonth[month] = { revenue: 0, cost: 0, profit: 0 };
    }
    if (type === 'revenue') {
      byMonth[month].revenue += amount;
    } else {
      byMonth[month].cost += amount;
    }
    byMonth[month].profit = byMonth[month].revenue - byMonth[month].cost;
  };

  salesOrders?.forEach((o: any) => {
    if (o.order_date) processOrder(o.order_date, o.total_amount || 0, 'revenue');
  });

  purchaseOrders?.forEach((o: any) => {
    if (o.order_date) processOrder(o.order_date, o.total_amount || 0, 'cost');
  });

  return {
    summary: {
      salesRevenue,
      receivedPayment,
      pendingPayment,
      purchaseCost,
      paidPurchase,
      pendingPurchase: purchaseCost - paidPurchase,
      estimatedProfit,
      actualProfit,
      profitMargin: salesRevenue > 0 ? (estimatedProfit / salesRevenue) * 100 : 0,
    },
    byMonth,
  };
}

/**
 * 获取客户分析报表
 */
async function getCustomerReport(
  supabase: any,
  schema: string,
  dateRange: DateRange
): Promise<Record<string, unknown>> {
  // 获取客户列表
  const { data: customers, error: customerError } = await supabase
    .from(`"${schema}"."customers"`)
    .select('*');

  if (customerError) throw customerError;

  // 获取销售订单
  const { data: salesOrders } = await supabase
    .from(`"${schema}"."sales_orders"`)
    .select('*')
    .gte('order_date', dateRange.start)
    .lte('order_date', dateRange.end);

  // 计算客户统计
  const totalCustomers = customers?.length || 0;
  const activeCustomers = new Set(salesOrders?.map((o: any) => o.customer_id) || []);
  
  // 按客户分组计算消费
  const customerStats: Record<string, { count: number; amount: number }> = {};
  salesOrders?.forEach((o: any) => {
    if (!o.customer_id) return;
    if (!customerStats[o.customer_id]) {
      customerStats[o.customer_id] = { count: 0, amount: 0 };
    }
    customerStats[o.customer_id].count++;
    customerStats[o.customer_id].amount += o.total_amount || 0;
  });

  // 计算平均订单价值
  const avgOrderValue = salesOrders?.length ? 
    (salesOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) / salesOrders.length) : 0;

  // 获取客户名称
  const customerMap = new Map(customers?.map((c: any) => [c.id, c.name]) || []);

  // 优质客户
  const topCustomers = Object.entries(customerStats)
    .map(([id, stats]) => ({
      id,
      name: customerMap.get(id) || '未知客户',
      orderCount: stats.count,
      totalAmount: stats.amount,
      avgOrderValue: stats.count > 0 ? stats.amount / stats.count : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  // 新客户 vs 老客户
  const newCustomersThreshold = new Date(dateRange.start);
  const newCustomers = customers?.filter((c: any) => {
    const created = new Date(c.created_at);
    return created >= newCustomersThreshold;
  }).length || 0;

  return {
    summary: {
      totalCustomers,
      activeCustomers: activeCustomers.size,
      inactiveCustomers: totalCustomers - activeCustomers.size,
      newCustomers,
      avgOrderValue,
      customerActivity: totalCustomers > 0 ? (activeCustomers.size / totalCustomers) * 100 : 0,
    },
    topCustomers,
    customerStats,
  };
}

/**
 * GET /api/reports - 获取报表数据
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') as ReportType || 'sales';
    const period = searchParams.get('period') || 'month';

    // Token 扣费检查 (10 token/次)
    const tokenResult = await checkAndDeductToken(
      session.user.id,
      'report_view',
      1,
      'GET /api/reports',
      { type: reportType, period }
    );

    if (!tokenResult.success) {
      return NextResponse.json(
        { error: tokenResult.error || 'Token 余额不足' },
        { status: 402 }
      );
    }

    const schema = getTenantSchema(session.user.id);
    const dateRange = getDateRange(period);

    let reportData: Record<string, unknown>;

    switch (reportType) {
      case 'sales':
        reportData = await getSalesReport(supabase, schema, dateRange);
        break;
      case 'inventory':
        reportData = await getInventoryReport(supabase, schema);
        break;
      case 'finance':
        reportData = await getFinanceReport(supabase, schema, dateRange);
        break;
      case 'customer':
        reportData = await getCustomerReport(supabase, schema, dateRange);
        break;
      default:
        return NextResponse.json({ error: '不支持的报表类型' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        type: reportType,
        period,
        dateRange,
        ...reportData,
      },
      tokensUsed: 10,
    });
  } catch (error: unknown) {
    console.error('获取报表失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
