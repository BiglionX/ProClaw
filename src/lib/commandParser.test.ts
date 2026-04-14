import { describe, it, expect } from 'vitest';
import { parseCommand, executeCommand } from '../lib/commandParser';

describe('commandParser', () => {
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
      expect(result).toContain('正在创建产品');
      expect(result).toContain('Test Product');
    });

    it('应该执行查询产品命令', async () => {
      const command = {
        action: 'query_products',
        params: { search: 'iPhone' },
        confidence: 0.9,
        message: '已识别指令: query_products',
      };
      const result = await executeCommand(command);
      expect(result).toContain('正在查询产品列表');
    });

    it('应该执行查询库存命令', async () => {
      const command = {
        action: 'query_inventory',
        params: { type: 'inventory' },
        confidence: 0.9,
        message: '已识别指令: query_inventory',
      };
      const result = await executeCommand(command);
      expect(result).toContain('正在查询库存信息');
    });

    it('应该执行添加入库命令', async () => {
      const command = {
        action: 'add_stock',
        params: { quantity: 100 },
        confidence: 0.9,
        message: '已识别指令: add_stock',
      };
      const result = await executeCommand(command);
      expect(result).toContain('正在添加入库记录');
      expect(result).toContain('100');
    });

    it('应该执行减少库存命令', async () => {
      const command = {
        action: 'remove_stock',
        params: { quantity: 50 },
        confidence: 0.9,
        message: '已识别指令: remove_stock',
      };
      const result = await executeCommand(command);
      expect(result).toContain('正在添加出库记录');
      expect(result).toContain('50');
    });

    it('应该执行销售分析命令', async () => {
      const command = {
        action: 'analyze_sales',
        params: { period: '本月' },
        confidence: 0.9,
        message: '已识别指令: analyze_sales',
      };
      const result = await executeCommand(command);
      expect(result).toContain('正在生成本月销售分析');
    });

    it('应该执行生成报表命令', async () => {
      const command = {
        action: 'generate_report',
        params: { reportType: '库存' },
        confidence: 0.9,
        message: '已识别指令: generate_report',
      };
      const result = await executeCommand(command);
      expect(result).toContain('正在生成库存报表');
    });

    it('应该执行库存预警命令', async () => {
      const command = {
        action: 'check_stock_alert',
        params: { type: 'inventory' },
        confidence: 0.9,
        message: '已识别指令: check_stock_alert',
      };
      const result = await executeCommand(command);
      expect(result).toContain('正在检查库存预警');
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
  });
});
