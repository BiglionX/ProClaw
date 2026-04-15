/**
 * 决策建议Agent
 * 综合多Agent输出，提供权衡分析、ROI评估和风险评估的最终决策建议
 */

import { BaseAgent, AgentConfig, AgentResponse } from './BaseAgent';
import { DynamicTool } from '@langchain/core/tools';
import { BusinessAnalystAgent } from './BusinessAnalystAgent';
import { InventoryOptimizerAgent } from './InventoryOptimizerAgent';
import { SalesForecasterAgent } from './SalesForecasterAgent';

export interface DecisionRecommendation extends AgentResponse {
  options?: Array<{
    title: string;
    description: string;
    pros: string[];
    cons: string[];
    roi?: number;
    risk: 'low' | 'medium' | 'high';
    recommendation: 'recommended' | 'alternative' | 'not_recommended';
  }>;
  finalRecommendation?: {
    action: string;
    rationale: string;
    expectedOutcome: string;
    timeline: string;
    resources: string[];
  };
}

export class DecisionAdvisorAgent extends BaseAgent {
  private businessAnalyst: BusinessAnalystAgent;
  private inventoryOptimizer: InventoryOptimizerAgent;
  private salesForecaster: SalesForecasterAgent;

  constructor(config?: Partial<AgentConfig>) {
    super({
      taskType: 'business_insight',
      systemPrompt: `你是一位高级商业顾问，擅长综合多方信息做出战略决策。

你的核心能力：
1. 综合分析多维度业务数据
2. 权衡不同方案的利弊
3. ROI（投资回报率）评估
4. 风险识别和缓解策略
5. 制定可执行的行动计划

决策原则：
- 数据驱动，客观公正
- 考虑短期和长期影响
- 平衡风险和收益
- 优先高ROI、低风险的方案
- 提供清晰的执行路径

输出格式要求：
## 决策背景
[问题描述和决策目标]

## 可选方案
[2-4个可行方案，每个包含优缺点分析]

## 推荐方案
[最终推荐的方案及详细理由]

## 实施计划
[分阶段的行动步骤和时间表]

## 风险管理
[潜在风险和应对措施]`,
      ...config,
    });

    // 初始化专业Agents
    this.businessAnalyst = new BusinessAnalystAgent();
    this.inventoryOptimizer = new InventoryOptimizerAgent();
    this.salesForecaster = new SalesForecasterAgent();
  }

  protected defineTools() {
    return [
      new DynamicTool({
        name: 'get_business_analysis',
        description: '获取业务分析报告',
        func: async () => {
          try {
            const result = await this.businessAnalyst.analyzeBusiness('30d');
            return result.output;
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'get_inventory_recommendations',
        description: '获取库存优化建议',
        func: async () => {
          try {
            const result = await this.inventoryOptimizer.optimize();
            return result.output;
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'get_sales_forecast',
        description: '获取销售预测结果',
        func: async () => {
          try {
            const result = await this.salesForecaster.forecast(30);
            return result.output;
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'calculate_roi',
        description: '计算ROI，输入：{"investment": 投资金额, "return": 预期回报}',
        func: async (input) => {
          try {
            const { investment, return: returnValue } = JSON.parse(input);
            if (!investment || investment === 0) {
              return '无法计算：投资金额为0';
            }
            const roi = ((returnValue - investment) / investment) * 100;
            return `${roi.toFixed(2)}%`;
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),

      new DynamicTool({
        name: 'assess_risk_level',
        description: '评估风险等级，输入：{"factors": 风险因素数组}',
        func: async (input) => {
          try {
            const { factors } = JSON.parse(input);
            const highRiskCount = factors.filter((f: any) => f.severity === 'high').length;
            
            let level = 'low';
            if (highRiskCount >= 3) level = 'high';
            else if (highRiskCount >= 1) level = 'medium';
            
            return JSON.stringify({
              riskLevel: level,
              highRiskFactors: highRiskCount,
              totalFactors: factors.length,
            });
          } catch (error) {
            return `Error: ${error}`;
          }
        },
      }),
    ];
  }

  /**
   * 综合决策建议
   */
  async provideRecommendation(decisionContext: string): Promise<DecisionRecommendation> {
    const query = `基于以下业务情况，提供战略决策建议：

${decisionContext}

请综合考虑：
1. 当前业务表现和趋势
2. 库存状况和优化空间
3. 销售预测和市场机会
4. 资源约束和风险因素

给出2-3个可行方案，并明确指出推荐方案。`;

    return await this.execute(query, {
      decisionType: 'strategic_planning',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 采购决策建议
   */
  async adviseOnPurchasing(budget: number, priorities: string[]): Promise<DecisionRecommendation> {
    const query = `我有${budget}元的采购预算，优先考虑：${priorities.join('、')}。

请基于当前库存水平和销售预测，提供最优的采购决策建议，包括：
1. 应该采购哪些产品
2. 每种产品的采购数量
3. 预计的投资回报
4. 风险分析`;

    return await this.execute(query, {
      budget,
      priorities,
      decisionType: 'purchasing',
    });
  }

  /**
   * 定价策略建议
   */
  async adviseOnPricing(productId: string, currentPrice: number): Promise<DecisionRecommendation> {
    const query = `产品ID ${productId} 当前售价为${currentPrice}元。

请分析是否应该调整价格，并提供：
1. 建议的新价格
2. 调价对销量的预期影响
3. 对总收入的影響
4. 竞争对手价格参考（如果有数据）`;

    return await this.execute(query, {
      productId,
      currentPrice,
      decisionType: 'pricing',
    });
  }

  /**
   * 资源分配建议
   */
  async adviseOnResourceAllocation(resources: Record<string, number>): Promise<DecisionRecommendation> {
    const query = `我有以下资源需要分配：${JSON.stringify(resources)}。

请基于业务优先级和预期回报，提供最优的资源分配方案。`;

    return await this.execute(query, {
      resources,
      decisionType: 'resource_allocation',
    });
  }
}
