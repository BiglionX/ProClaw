import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCommand, executeCommand } from '../lib/commandParser';
import { getProductSPUs, getProducts } from '../lib/productService';
import { createInventoryTransaction } from '../lib/inventoryService';
import { calibrateStock } from '../lib/inventoryCalibrationService';

// Mock 依赖的模块
vi.mock('../lib/productService', () => ({
  getProductSPUs: vi.fn().mockResolvedValue([]),
  getProducts: vi.fn().mockResolvedValue([]),
}));

vi.mock('../lib/inventoryService', () => ({
  getInventoryStats: vi.fn().mockResolvedValue({
    total_products: 0,
    total_stock: 0,
    low_stock_count: 0,
    zero_stock_count: 0,
    today_transactions: 0,
    total_value: 0,
    low_stock_products: [],
  }),
  getInventoryTransactions: vi.fn().mockResolvedValue([]),
  createInventoryTransaction: vi.fn(),
}));

vi.mock('../lib/inventoryCalibrationService', () => ({
  getLowConfidenceProducts: vi.fn().mockResolvedValue([]),
  checkNegativeAging: vi.fn().mockResolvedValue([]),
  calibrateStock: vi.fn(),
}));

describe('commandParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProductSPUs).mockResolvedValue([]);
    vi.mocked(getProducts).mockResolvedValue([]);
  });

  describe('parseCommand', () => {
    it('应该识别添加产品命令', () => {
      const result = parseCommand('添加产品 iPhone 15');
      expect(result.action).toBe('create_product');
      expect(result.params.name).toBe('iPhone');
      expect(result.confidence).toBe(0.9);
    });

    it('应该识别新建产品命令', () => {
      const result = parseCommand('新建产品 MacBook Pro');
      expect(result.action).toBe('create_product');
      expect(result.params.name).toBe('MacBook');
    });

    it('应该识别创建产品命令（英文）', () => {
      const result = parseCommand('create product iPad');
      expect(result.action).toBe('create_product');
    });

    it('应该识别查询产品命令', () => {
      const result = parseCommand('查询产品 iPhone');
      expect(result.action).toBe('query_products');
      expect(result.params.search).toBe('iPhone');
    });

    it('应该识别搜索产品命令', () => {
      const result = parseCommand('搜索产品 Mac');
      expect(result.action).toBe('query_products');
      expect(result.params.search).toBe('Mac');
    });

    it('应该识别查询库存命令', () => {
      const result = parseCommand('查询库存');
      expect(result.action).toBe('query_inventory');
      expect(result.params.type).toBe('inventory');
    });

    it('应该识别查看库存命令', () => {
      const result = parseCommand('查看库存');
      expect(result.action).toBe('query_inventory');
    });

    it('应该识别添加入库命令', () => {
      const result = parseCommand('添加库存 100个');
      expect(result.action).toBe('add_stock');
      expect(result.params.quantity).toBe(100);
    });

    it('应该识别入库操作命令', () => {
      const result = parseCommand('入库操作 50件');
      expect(result.action).toBe('add_stock');
      expect(result.params.quantity).toBe(50);
    });

    it('应该识别减少库存命令', () => {
      const result = parseCommand('减少库存 20个');
      expect(result.action).toBe('remove_stock');
      expect(result.params.quantity).toBe(20);
    });

    it('应该识别出库命令', () => {
      const result = parseCommand('出库 30箱');
      expect(result.action).toBe('remove_stock');
      expect(result.params.quantity).toBe(30);
    });

    it('应该识别销售分析命令', () => {
      const result = parseCommand('销售分析 本月');
      expect(result.action).toBe('analyze_sales');
      expect(result.params.period).toBe('本月');
    });

    it('应该识别销售报告命令', () => {
      const result = parseCommand('销售报告 本周');
      expect(result.action).toBe('analyze_sales');
      expect(result.params.period).toBe('本周');
    });

    it('应该识别生成报表命令', () => {
      const result = parseCommand('生成报表 库存报表');
      expect(result.action).toBe('generate_report');
      expect(result.params.reportType).toBe('库存');
    });

    it('应该识别创建报表命令', () => {
      const result = parseCommand('创建报表 销售报表');
      expect(result.action).toBe('generate_report');
      expect(result.params.reportType).toBe('销售');
    });

    it('应该识别库存预警命令', () => {
      const result = parseCommand('库存预警');
      expect(result.action).toBe('check_stock_alert');
    });

    it('应该识别低库存命令', () => {
      const result = parseCommand('低库存检查');
      expect(result.action).toBe('check_stock_alert');
    });

    it('应该识别库存不足命令', () => {
      const result = parseCommand('库存不足提醒');
      expect(result.action).toBe('check_stock_alert');
    });

    it('对于未知命令应该返回 unknown', () => {
      const result = parseCommand('这是一个未知命令');
      expect(result.action).toBe('unknown');
      expect(result.confidence).toBe(0.3);
      expect(result.params.originalText).toBe('这是一个未知命令');
    });

    it('应该处理空字符串', () => {
      const result = parseCommand('');
      expect(result.action).toBe('unknown');
      expect(result.confidence).toBe(0.3);
    });

    it('应该忽略大小写', () => {
      const result = parseCommand('ADD PRODUCT Test');
      expect(result.action).toBe('create_product');
    });

    it('应该处理多余空格', () => {
      const result = parseCommand('  添加产品   Test  ');
      expect(result.action).toBe('create_product');
    });

    it('导出库存表不会被当成出库', () => {
      const result = parseCommand('帮我导出库存表，我要盘点');
      expect(result.action).toBe('export_inventory');
      expect(result.action).not.toBe('remove_stock');
    });

    it('出库命令仍然是出库', () => {
      const result = parseCommand('出库 iPad 5件');
      expect(result.action).toBe('remove_stock');
      expect(result.params.quantity).toBe(5);
      expect(result.params.productName).toBe('iPad');
    });

    it('出入库不写成入库', () => {
      const result = parseCommand('出入库');
      expect(result.action).toBe('clarify_stock_io');
      expect(result.action).not.toBe('add_stock');
    });

    it('待盘点是查询，带实际数量才是写入', () => {
      const listed = parseCommand('待盘点');
      expect(listed.action).toBe('stocktake');
      expect(listed.params.mode).toBe('list');

      const written = parseCommand('盘点 iPad 实际 12件');
      expect(written.action).toBe('stocktake');
      expect(written.params.mode).toBe('write');
      expect(written.params.productName).toBe('iPad');
      expect(written.params.quantity).toBe(12);
    });
  });

  describe('executeCommand', () => {
    it('应该执行创建产品命令', async () => {
      const command = {
        action: 'create_product',
        params: { name: 'Test Product' },
        confidence: 0.9,
        message: '已识别指令: create_product',
      };
      const result = await executeCommand(command);
      expect(result).toContain('添加产品');
      expect(result).toContain('添加产品');
    });

    it('应该执行查询产品命令', async () => {
      const command = {
        action: 'query_products',
        params: { search: 'iPhone' },
        confidence: 0.9,
        message: '已识别指令: query_products',
      };
      const result = await executeCommand(command);
      expect(result).toContain('产品');
    });

    it('应该执行查询库存命令', async () => {
      const command = {
        action: 'query_inventory',
        params: { type: 'inventory' },
        confidence: 0.9,
        message: '已识别指令: query_inventory',
      };
      const result = await executeCommand(command);
      expect(result).toContain('库存统计');
    });

    it('应该执行添加入库命令', async () => {
      const command = {
        action: 'add_stock',
        params: { quantity: 100, productName: 'Test' },
        confidence: 0.9,
        message: '已识别指令: add_stock',
      };
      const result = await executeCommand(command);
      // 测试环境中找不到产品，返回未找到产品错误
      expect(result).toContain('未找到');
    });

    it('应该执行减少库存命令', async () => {
      const command = {
        action: 'remove_stock',
        params: { quantity: 50, productName: 'Test' },
        confidence: 0.9,
        message: '已识别指令: remove_stock',
      };
      const result = await executeCommand(command);
      // 测试环境中找不到产品，返回未找到产品错误
      expect(result).toContain('未找到');
    });

    it('应该执行销售分析命令', async () => {
      const command = {
        action: 'analyze_sales',
        params: { period: '本月' },
        confidence: 0.9,
        message: '已识别指令: analyze_sales',
      };
      const result = await executeCommand(command);
      expect(result).toContain('销售分析');
    });

    it('应该执行生成报表命令', async () => {
      const command = {
        action: 'generate_report',
        params: { reportType: '库存' },
        confidence: 0.9,
        message: '已识别指令: generate_report',
      };
      const result = await executeCommand(command);
      expect(result).toContain('报表');
    });

    it('应该执行库存预警命令', async () => {
      const command = {
        action: 'check_stock_alert',
        params: { type: 'inventory' },
        confidence: 0.9,
        message: '已识别指令: check_stock_alert',
      };
      const result = await executeCommand(command);
      expect(result).toContain('库存');
    });

    it('应该处理未知命令', async () => {
      const command = {
        action: 'unknown',
        params: { originalText: 'test' },
        confidence: 0.3,
        message: '抱歉,我无法理解您的指令',
      };
      const result = await executeCommand(command);
      expect(result).toBe('抱歉,我无法理解您的指令');
    });

    it('多个 SPU 时不调用出入库和盘点写入', async () => {
      vi.mocked(getProductSPUs).mockResolvedValue([
        { id: '1', name: 'iPad', spu_code: 'A', unit: '件', skus: [{ id: 's1', sku_code: 'A1', current_stock: 10, is_default: true }] },
        { id: '2', name: 'iPad Pro', spu_code: 'B', unit: '件', skus: [{ id: 's2', sku_code: 'B1', current_stock: 3, is_default: true }] },
      ] as any);

      const outbound = await executeCommand({
        action: 'remove_stock',
        params: { quantity: 1, productName: 'iPad' },
        confidence: 0.9,
        message: '',
      });
      expect(outbound).toContain('iPad Pro');
      expect(createInventoryTransaction).not.toHaveBeenCalled();

      const counted = await executeCommand({
        action: 'stocktake',
        params: { mode: 'write', quantity: 12, productName: 'iPad' },
        confidence: 0.9,
        message: '',
      });
      expect(counted).toContain('iPad Pro');
      expect(calibrateStock).not.toHaveBeenCalled();
    });

    it('唯一匹配时才盘点写入', async () => {
      vi.mocked(getProductSPUs).mockResolvedValue([
        {
          id: '1',
          name: 'iPad',
          spu_code: 'A',
          unit: '件',
          skus: [{ id: 's1', sku_code: 'A1', current_stock: 10, is_default: true }],
        },
      ] as any);
      vi.mocked(calibrateStock).mockResolvedValue({ id: 'c1', message: 'ok', new_stock: 12 });

      const result = await executeCommand({
        action: 'stocktake',
        params: { mode: 'write', quantity: 12, productName: 'iPad' },
        confidence: 0.9,
        message: '',
      });
      expect(calibrateStock).toHaveBeenCalledWith(expect.objectContaining({
        product_id: 's1',
        actual_stock: 12,
        triggered_by: 'manual',
      }));
      expect(result).toContain('盘点已记录');
    });
  });
});
