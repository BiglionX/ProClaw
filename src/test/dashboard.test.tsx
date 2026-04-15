import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../pages/DashboardPage';
import * as inventoryService from '../lib/inventoryService';
import * as analyticsService from '../lib/analyticsService';
import * as financeService from '../lib/financeService';
import * as productService from '../lib/productService';

// Mock 所有服务
vi.mock('../lib/inventoryService');
vi.mock('../lib/analyticsService');
vi.mock('../lib/financeService');
vi.mock('../lib/productService');

describe('DashboardPage', () => {
  const mockInventoryStats = {
    total_products: 100,
    low_stock_count: 5,
    zero_stock_count: 2,
    today_transactions: 15,
    total_value: 50000,
    low_stock_products: [
      { 
        id: '1', 
        name: '产品A', 
        spu_code: 'SPU-20260415-A001', 
        total_stock: 3, 
        min_stock: 10,
        sku_count: 2
      },
      { 
        id: '2', 
        name: '产品B', 
        spu_code: 'SPU-20260415-B002', 
        total_stock: 0, 
        min_stock: 5,
        sku_count: 1
      },
    ],
  };

  const mockSalesTrend = {
    period: 'day' as const,
    data: [
      { date: '2024-04-09', transaction_count: 10, outbound_qty: 50, inbound_qty: 30 },
      { date: '2024-04-10', transaction_count: 12, outbound_qty: 60, inbound_qty: 40 },
      { date: '2024-04-11', transaction_count: 8, outbound_qty: 45, inbound_qty: 35 },
    ],
  };

  const mockProductAnalytics = {
    best_selling: [
      { id: '1', name: '畅销产品1', sku: 'SKU100', total_sold: 500 },
      { id: '2', name: '畅销产品2', sku: 'SKU101', total_sold: 450 },
      { id: '3', name: '畅销产品3', sku: 'SKU102', total_sold: 400 },
    ],
    slow_moving: [],
    turnover_by_category: [],
  };

  const mockFinancialSummary = {
    monthly_revenue: 100000,
    monthly_expense: 60000,
    monthly_profit: 40000,
    accounts_receivable: 25000,
    accounts_payable: 15000,
    inventory_value: 50000,
    working_capital: 60000,
  };

  const mockDbStats = {
    spu_count: 50,
    sku_count: 100,
    categories_count: 10,
    transactions_count: 500,
    pending_sync: 5,
  };

  beforeEach(() => {
    // 设置默认的 mock 返回值
    vi.mocked(inventoryService.getInventoryStats).mockResolvedValue(mockInventoryStats);
    vi.mocked(analyticsService.getSalesTrend).mockResolvedValue(mockSalesTrend);
    vi.mocked(analyticsService.getProductAnalytics).mockResolvedValue(mockProductAnalytics);
    vi.mocked(financeService.getFinancialSummary).mockResolvedValue(mockFinancialSummary);
    vi.mocked(productService.getDatabaseStats).mockResolvedValue(mockDbStats);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染仪表盘标题', async () => {
    render(<DashboardPage />);
    
    expect(screen.getByText('仪表盘')).toBeInTheDocument();
    expect(screen.getByText(/业务概览和关键指标/)).toBeInTheDocument();
  });

  it('应该显示加载状态', () => {
    render(<DashboardPage />);
    
    // 加载时应该显示进度条
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('应该显示关键指标卡片', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('产品总数')).toBeInTheDocument();
      expect(screen.getByText('本月销售额')).toBeInTheDocument();
      expect(screen.getByText('今日交易')).toBeInTheDocument();
      expect(screen.getByText('库存预警')).toBeInTheDocument();
    });
  });

  it('应该显示正确的产品总数', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  it('应该显示财务概览卡片', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('应收账款')).toBeInTheDocument();
      expect(screen.getByText('应付账款')).toBeInTheDocument();
      expect(screen.getByText('营运资金')).toBeInTheDocument();
    });
  });

  it('应该显示销售趋势图表标题', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/近7天销售趋势/)).toBeInTheDocument();
    });
  });

  it('应该显示库存状态分布图表标题', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/库存状态分布/)).toBeInTheDocument();
    });
  });

  it('应该显示畅销产品列表标题', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/畅销产品 TOP 5/)).toBeInTheDocument();
    });
  });

  it('应该显示低库存预警列表标题', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/低库存预警/)).toBeInTheDocument();
    });
  });

  it('应该显示刷新按钮', () => {
    render(<DashboardPage />);
    
    expect(screen.getByText('刷新数据')).toBeInTheDocument();
  });

  it('应该在数据加载完成后隐藏加载状态', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('应该并行加载所有数据', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(inventoryService.getInventoryStats).toHaveBeenCalledTimes(1);
      expect(analyticsService.getSalesTrend).toHaveBeenCalledWith('day');
      expect(analyticsService.getProductAnalytics).toHaveBeenCalledTimes(1);
      expect(financeService.getFinancialSummary).toHaveBeenCalledTimes(1);
      expect(productService.getDatabaseStats).toHaveBeenCalledTimes(1);
    });
  });

  it('应该正确处理空数据情况', async () => {
    // Mock 返回空数据
    vi.mocked(inventoryService.getInventoryStats).mockResolvedValue({
      ...mockInventoryStats,
      low_stock_products: [],
    });
    vi.mocked(analyticsService.getProductAnalytics).mockResolvedValue({
      ...mockProductAnalytics,
      best_selling: [],
    });

    render(<DashboardPage />);
    
    await waitFor(() => {
      // 应该显示空状态提示
      expect(screen.getByText(/暂无销售数据|库存充足，无预警/)).toBeInTheDocument();
    });
  });

  it('应该正确格式化货币值', async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      // 100000 应该显示为 ¥10.0万
      expect(screen.getByText(/¥[\d.]+万?/)).toBeInTheDocument();
    });
  });
});
