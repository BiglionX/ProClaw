/**
 * 业务分析Agent
 * 专注于多维度业务数据分析、KPI趋势解读和业绩归因分析
 */

import { BaseAgent, AgentConfig, AgentResponse } from './BaseAgent';
import { DynamicTool } from '@langchain/core/tools';
import { getSalesTrend, getProductAnalytics } from '../analyticsService';
import { getInventoryStats } from '../inventoryService';

export interface BusinessAnalysisResult extends AgentResponse {
  kpis?: {
    revenue?: number;
    growth?: number;
    profitMargin?: number;
  };
  trends?: Array<{
    metric: string;
    direction: 'up' | 'down' | 'stable';
    magnitude: string;
  }>;
}

export class BusinessAnalystAgent extends BaseAgent {
  constructor(config?: Partial<AgentConfig>) {
    super({
      taskType: 'business_insight',
      systemPrompt: `你是一位经验丰富的商业分析师，擅长从数据中发现洞察。

你的核心能力：
1. 多维度业务数据分析（销售、库存、财务）
2. KPI趋势解读和业绩归因
3. 识别业务机会和风险
4. 提供可执行的战略建议

分析原则：
- 数据驱动，避免主观臆断
- 关注同比和环比变化
- 考虑季节性和市场因素
- 提供具体的数字支撑
- 建议要可量化、可执行

输出格式要求：
## 核心发现
[3-5个关键发现，每个附带数据支撑]

## 详细分析
[深入分析业务状况，包括趋势、模式、异常]

## 行动建议
[3-5条具体可执行的建议，按优先级排序]

## 风险提示
[潜在风险和应对策略]`,
      ...config,
    });
  }

  protected defineTools() {
    return [
      new DynamicTool({
        name: 'get_sales_data',
        description: '获取销售数据，包括销售趋势、畅销产品等',
        func: async (input) => {
          try {
            const period = input === 'week' ? 'week' : 'day';
            const salesTrend = await getSalesTrend(period);
            const productAnalytics = await getProductAnalytics();
            
            return JSON.stringify({
              salesTrend,
              bestSelling: productAnalytics.best_selling.slice(0, 5),
              slowMoving: productAnalytics.slow_moving.slice(0, 5),
            });
          } catch (error) {
            return `Error fetching sales data: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'get_inventory_status',
        description: '获取库存状态，包括库存统计、低库存预警等',
        func: async () => {
          try {
            const stats = await getInventoryStats();
            return JSON.stringify(stats);
          } catch (error) {
            return `Error fetching inventory data: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'calculate_growth_rate',
        description: '计算增长率，输入格式：{"current": 当前值, "previous": 上期值}',
        func: async (input) => {
          try {
            const { current, previous } = JSON.parse(input);
            if (!previous || previous === 0) {
              return '无法计算：上期值为0或缺失';
            }
            const growthRate = ((current - previous) / previous) * 100;
            return `${growthRate.toFixed(2)}%`;
          } catch (error) {
            return `Error calculating growth rate: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'analyze_product_performance',
        description: '分析产品表现，获取畅销和滞销产品信息',
        func: async () => {
          try {
            const analytics = await getProductAnalytics();
            return JSON.stringify({
              bestSelling: analytics.best_selling,
              slowMoving: analytics.slow_moving,
              turnoverByCategory: analytics.turnover_by_category,
            });
          } catch (error) {
            return `Error analyzing products: ${error}`;
          }
        },
      }),
    ];
  }

  /**
   * 执行业务分析
   */
  async analyzeBusiness(period: '7d' | '30d' | '90d' = '30d'): Promise<BusinessAnalysisResult> {
    const query = `请对最近${period}的业务进行全面分析，包括销售表现、库存状况、产品表现等维度。`;
    
    const context = {
      analysisPeriod: period,
      analysisDate: new Date().toISOString(),
    };

    const result = await this.execute(query, context);

    return {
      ...result,
      // 可以在此处添加额外的结构化数据解析
    };
  }

  /**
   * 分析特定KPI
   */
  async analyzeKPI(kpiName: string): Promise<BusinessAnalysisResult> {
    const query = `请深入分析${kpiName}的表现，包括趋势、影响因素和改进建议。`;
    
    return await this.execute(query, {
      kpiName,
      focusArea: 'kpi_analysis',
    });
  }

  /**
   * 生成业务报告
   */
  async generateReport(reportType: 'weekly' | 'monthly' | 'quarterly'): Promise<BusinessAnalysisResult> {
    const periodMap = {
      weekly: '7d',
      monthly: '30d',
      quarterly: '90d',
    };

    const query = `请生成一份${reportType === 'weekly' ? '周' : reportType === 'monthly' ? '月' : '季度'}业务报告，涵盖关键指标、主要成就、面临挑战和下阶段计划。`;

    return await this.execute(query, {
      reportType,
      period: periodMap[reportType],
    });
  }
}
