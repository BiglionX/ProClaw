/**
 * 销售预测Agent
 * 专注于时间序列预测、多因素影响分析、置信区间计算和情景模拟
 */

import { BaseAgent, AgentConfig, AgentResponse } from './BaseAgent';
import { DynamicTool } from '@langchain/core/tools';
import { getSalesTrend, getProductAnalytics } from '../analyticsService';

export interface SalesForecastResult extends AgentResponse {
  forecast?: {
    nextPeriod: Array<{
      date: string;
      predicted: number;
      lowerBound?: number;
      upperBound?: number;
    }>;
    confidence: number;
  };
  factors?: Array<{
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }>;
}

export class SalesForecasterAgent extends BaseAgent {
  constructor(config?: Partial<AgentConfig>) {
    super({
      taskType: 'sales_forecast',
      systemPrompt: `你是一位资深销售预测专家，擅长使用时间序列分析和机器学习方法进行精准预测。

你的核心能力：
1. 多时间尺度销售预测（日/周/月）
2. 识别影响销售的关键因素
3. 计算预测置信区间
4. 情景模拟和what-if分析
5. 季节性模式识别

预测原则：
- 结合统计方法和业务洞察
- 考虑季节性、趋势性和周期性
- 量化不确定性（提供置信区间）
- 识别异常值和外部影响因素
- 持续验证和优化预测模型

输出格式要求：
## 预测结果
[未来周期的销售预测，包含置信区间]

## 关键影响因素
[影响预测的主要因素及其权重]

## 趋势分析
[当前销售趋势和模式识别]

## 情景分析
[乐观、基准、悲观三种情景的预测]

## 建议行动
[基于预测的业务建议]`,
      ...config,
    });
  }

  protected defineTools() {
    return [
      new DynamicTool({
        name: 'get_historical_sales',
        description: '获取历史销售数据，输入周期："day"、"week"或"month"',
        func: async (input) => {
          try {
            const period = input || 'day';
            const trend = await getSalesTrend(period as any);
            return JSON.stringify(trend);
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'analyze_seasonal_patterns',
        description: '分析季节性销售模式',
        func: async () => {
          try {
            const monthlyData = await getSalesTrend('month');
            return JSON.stringify({
              monthlyPattern: monthlyData.data,
              hasSeasonality: monthlyData.data.length > 6,
            });
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'calculate_trend_line',
        description: '计算趋势线，输入为销售数据数组',
        func: async (input) => {
          try {
            const data = JSON.parse(input);
            if (!Array.isArray(data) || data.length < 2) {
              return '数据不足，无法计算趋势';
            }

            // 简化的线性回归
            const n = data.length;
            const xValues = data.map((_: any, i: number) => i);
            const yValues = data.map((d: any) => d.outbound_qty || 0);

            const sumX = xValues.reduce((a: number, b: number) => a + b, 0);
            const sumY = yValues.reduce((a: number, b: number) => a + b, 0);
            const sumXY = xValues.reduce((sum: number, x: number, i: number) => sum + x * yValues[i], 0);
            const sumXX = xValues.reduce((sum: number, x: number) => sum + x * x, 0);

            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;

            return JSON.stringify({
              slope,
              intercept,
              trend: slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'stable',
              strength: Math.abs(slope),
            });
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'get_top_products_impact',
        description: '获取畅销产品对整体销售的影响',
        func: async () => {
          try {
            const analytics = await getProductAnalytics();
            const topProducts = analytics.best_selling.slice(0, 5);
            const totalSold = topProducts.reduce((sum, p) => sum + p.total_sold, 0);
            
            return JSON.stringify({
              topProducts,
              combinedImpact: totalSold,
              concentration: topProducts.length / (analytics.best_selling.length || 1),
            });
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'simulate_scenario',
        description: '模拟不同情景下的销售预测，输入：{"scenario": "optimistic|pessimistic", "changePercent": 变化百分比}',
        func: async (input) => {
          try {
            const { scenario, changePercent } = JSON.parse(input);
            const factor = scenario === 'optimistic' ? (1 + changePercent / 100) : (1 - changePercent / 100);
            
            return JSON.stringify({
              scenario,
              adjustmentFactor: factor,
              description: scenario === 'optimistic' ? '乐观情景' : '悲观情景',
            });
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),
    ];
  }

  /**
   * 执行销售预测
   * @param horizon 预测周期天数
   */
  async forecast(horizon: number = 30): Promise<SalesForecastResult> {
    const query = `请预测未来${horizon}天的销售趋势，包括：
1. 每日销售预测值
2. 置信区间（80%和95%）
3. 关键影响因素分析
4. 潜在风险和机会`;

    return await this.execute(query, {
      forecastHorizon: horizon,
      predictionDate: new Date().toISOString(),
    });
  }

  /**
   * 情景分析
   */
  async scenarioAnalysis(): Promise<SalesForecastResult> {
    const query = `请进行多情景销售预测分析，包括：
1. 乐观情景（增长20%）
2. 基准情景（维持当前趋势）
3. 悲观情景（下降15%）

分析每种情景的可能性和应对策略。`;

    return await this.execute(query, {
      analysisType: 'scenario_planning',
    });
  }

  /**
   * 季节性分析
   */
  async analyzeSeasonality(): Promise<SalesForecastResult> {
    const query = `分析销售的季节性模式，识别：
1. 月度/季度性波动规律
2. 节假日效应
3. 周期性趋势
4. 异常月份及原因`;

    return await this.execute(query, {
      focusArea: 'seasonal_analysis',
    });
  }
}
