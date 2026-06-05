import type { AIInsightItem } from '../components/DataCenter/AIInsights';

interface InsightInput {
  lowStockCount: number;
  zeroStockCount: number;
  totalProducts: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  bestSellingProducts?: Array<{ name: string; total_sold: number }>;
  lowStockProducts?: Array<{ name: string; total_stock: number }>;
  accountsReceivable: number;
  accountsPayable: number;
}

/**
 * 规则引擎：基于经营数据生成 AI 洞察
 * 后续可升级为 LLM 驱动
 */
export function generateAIInsights(data: InsightInput): AIInsightItem[] {
  const insights: AIInsightItem[] = [];

  // 1. 好消息 - 销售/利润
  if (data.monthlyRevenue > 0) {
    const profitRatio = data.monthlyProfit / data.monthlyRevenue;
    if (profitRatio >= 0.2) {
      insights.push({
        type: 'good',
        message: `毛利率稳定在 ${(profitRatio * 100).toFixed(1)}% 以上，经营状况良好`,
      });
    }
  }

  // 2. 好消息 - 畅销产品
  if (data.bestSellingProducts && data.bestSellingProducts.length > 0) {
    const top = data.bestSellingProducts[0];
    if (top.total_sold > 5) {
      insights.push({
        type: 'good',
        message: `"${top.name}" 销量持续领先，本月已售 ${top.total_sold} 件`,
      });
    }
  }

  // 3. 预警 - 低库存
  if (data.lowStockCount > 0 && data.lowStockProducts) {
    const lowItems = data.lowStockProducts
      .filter(p => p.total_stock < 10)
      .slice(0, 3);
    if (lowItems.length > 0) {
      const names = lowItems.map(p => `"${p.name}"`).join('、');
      insights.push({
        type: 'warning',
        message: `${names} 库存不足，建议本周内安排补货以免影响销售`,
        action: { label: '立即补货', path: '/inventory' },
      });
    }
  }

  // 4. 趋势发现 - 财务健康
  if (data.accountsPayable > 0 && data.accountsReceivable > 0) {
    const ratio = (data.accountsReceivable / data.accountsPayable);
    if (ratio > 1.2) {
      insights.push({
        type: 'trend',
        message: `应收/应付比 ${ratio.toFixed(1)}x，回款能力良好，现金流充裕`,
      });
    } else if (ratio < 0.8) {
      insights.push({
        type: 'warning',
        message: `应收/应付比 ${ratio.toFixed(1)}x，建议加快账款回收，改善现金流`,
        action: { label: '查看财务', path: '/datacenter' },
      });
    }
  }

  // 5. 趋势发现 - 缺货
  if (data.zeroStockCount > 0) {
    insights.push({
      type: 'trend',
      message: `有 ${data.zeroStockCount} 个产品已缺货，建议优先补货以减少销售机会损失`,
      action: { label: '查看库存预警', path: '/inventory' },
    });
  }

  // 6. 好消息 - 产品总数
  if (data.totalProducts > 50) {
    insights.push({
      type: 'good',
      message: `产品库已收录 ${data.totalProducts} 个产品，品类丰富度良好`,
    });
  }

  return insights;
}
