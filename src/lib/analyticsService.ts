import { invoke } from '@tauri-apps/api/core';

export interface SalesTrendData {
  period: 'day' | 'week' | 'month';
  data: Array<{
    date: string;
    transaction_count: number;
    outbound_qty: number;
    inbound_qty: number;
  }>;
}

export interface ProductAnalytics {
  best_selling: Array<{
    id: string;
    name: string;
    sku: string;
    total_sold: number;
  }>;
  slow_moving: Array<{
    id: string;
    name: string;
    sku: string;
    current_stock: number;
    stock_value: number;
  }>;
  turnover_by_category: Array<{
    category: string;
    product_count: number;
    total_stock: number;
    total_sold: number;
    turnover_rate: string;
  }>;
}

/**
 * 获取销售趋势数据
 */
export async function getSalesTrend(period?: 'day' | 'week' | 'month'): Promise<SalesTrendData> {
  return await invoke('get_sales_trend', { period });
}

/**
 * 获取产品分析数据
 */
export async function getProductAnalytics(): Promise<ProductAnalytics> {
  return await invoke('get_product_analytics');
}
