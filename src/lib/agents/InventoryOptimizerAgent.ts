/**
 * 库存优化Agent
 * 专注于安全库存计算、补货时机预测、滞销品识别和库存成本优化
 */

import { BaseAgent, AgentConfig, AgentResponse } from './BaseAgent';
import { DynamicTool } from '@langchain/core/tools';
import { getInventoryStats } from '../inventoryService';
import { getSalesTrend, getProductAnalytics } from '../analyticsService';

export interface InventoryOptimizationResult extends AgentResponse {
  recommendations?: Array<{
    productId?: string;
    productName: string;
    action: 'reorder' | 'reduce' | 'maintain' | 'clearance';
    priority: 'high' | 'medium' | 'low';
    reason: string;
    suggestedQuantity?: number;
  }>;
}

export class InventoryOptimizerAgent extends BaseAgent {
  constructor(config?: Partial<AgentConfig>) {
    super({
      taskType: 'inventory_optimization',
      systemPrompt: `你是一位库存管理专家，专注于优化库存水平和降低成本。

你的核心能力：
1. 安全库存水平计算和优化
2. 补货时机预测和建议
3. 滞销品识别和清理策略
4. 库存成本分析和优化
5. ABC分类管理和差异化策略

分析原则：
- 基于历史销售数据预测需求
- 考虑供应链lead time和不确定性
- 平衡库存成本和缺货风险
- 优先处理高价值和高周转产品
- 提供量化的优化建议

输出格式要求：
## 库存现状评估
[当前库存健康度评分和关键指标]

## 优化建议
[按优先级排序的具体行动建议]

## 预期效果
[实施建议后的预期改善，包括成本节省、周转率提升等]

## 风险提示
[潜在风险和应对措施]`,
      ...config,
    });
  }

  protected defineTools() {
    return [
      new DynamicTool({
        name: 'get_inventory_overview',
        description: '获取库存概览，包括总产品数、低库存、零库存等统计',
        func: async () => {
          try {
            const stats = await getInventoryStats();
            return JSON.stringify(stats);
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'get_low_stock_products',
        description: '获取低库存产品列表',
        func: async () => {
          try {
            const stats = await getInventoryStats();
            return JSON.stringify({
              lowStockCount: stats.low_stock_count,
              lowStockProducts: stats.low_stock_products || [],
            });
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'analyze_product_turnover',
        description: '分析产品周转率，按类别分组',
        func: async () => {
          try {
            const analytics = await getProductAnalytics();
            return JSON.stringify({
              turnoverByCategory: analytics.turnover_by_category,
              slowMoving: analytics.slow_moving.slice(0, 10),
            });
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'calculate_safety_stock',
        description: '计算安全库存，输入：{"avgDailySales": 日均销量, "leadTime": 采购提前期(天), "serviceLevel": 服务水平(0-1)}',
        func: async (input) => {
          try {
            const { avgDailySales, leadTime, serviceLevel } = JSON.parse(input);
            
            // 简化的安全库存计算
            // 实际应使用更复杂的公式考虑需求变异系数
            const zScore = serviceLevel === 0.95 ? 1.65 : serviceLevel === 0.99 ? 2.33 : 1.28;
            const safetyStock = Math.ceil(avgDailySales * leadTime * zScore);
            
            return JSON.stringify({
              safetyStock,
              reorderPoint: safetyStock + Math.ceil(avgDailySales * leadTime),
            });
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'get_sales_velocity',
        description: '获取产品销售速度（近期销售趋势）',
        func: async () => {
          try {
            const trend = await getSalesTrend('day');
            return JSON.stringify({
              recentTrend: trend.data.slice(-7),
              averageOutbound: trend.data.reduce((sum, d) => sum + d.outbound_qty, 0) / trend.data.length,
            });
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),
    ];
  }

  /**
   * 执行库存优化分析
   */
  async optimize(): Promise<InventoryOptimizationResult> {
    const query = `请对当前库存进行全面分析和优化建议，包括：
1. 识别需要立即补货的产品
2. 发现滞销和积压库存
3. 提出库存结构调整建议
4. 估算优化后的成本节省`;

    return await this.execute(query, {
      analysisType: 'full_optimization',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 生成补货建议
   */
  async generateReorderSuggestions(): Promise<InventoryOptimizationResult> {
    const query = `基于当前库存水平和销售速度，生成具体的补货建议清单，包括产品、数量、优先级和预计到货时间。`;

    return await this.execute(query, {
      focusArea: 'reorder_planning',
    });
  }

  /**
   * 分析滞销品
   */
  async analyzeSlowMoving(): Promise<InventoryOptimizationResult> {
    const query = `识别所有滞销产品，分析滞销原因，并提出清理策略（如促销、捆绑销售、退货等）。`;

    return await this.execute(query, {
      focusArea: 'slow_moving_analysis',
    });
  }

  /**
   * 计算最优库存水平
   */
  async calculateOptimalLevels(): Promise<InventoryOptimizationResult> {
    const query = `基于历史销售数据和业务目标，计算每个产品的最优库存水平，包括最小库存、最大库存和再订货点。`;

    return await this.execute(query, {
      focusArea: 'optimal_level_calculation',
    });
  }
}
