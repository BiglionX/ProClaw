/**
 * AI数据分析服务
 * 提供销售预测、库存优化、异常检测、采购建议等智能分析功能
 */

import { getLLMForTask } from './llmProvider';
import { generatePrompt, extractInsights, validateAnalysis } from './aiTools';
import { getSalesTrend, getProductAnalytics } from './analyticsService';
import { getInventoryStats } from './inventoryService';

// ==================== 类型定义 ====================

export interface SalesForecastResult {
  historicalData: any;
  trend: {
    direction: 'upward' | 'downward' | 'stable';
    strength: number; // 0-1
    description: string;
  };
  forecast: {
    nextPeriod: any[];
    confidence: number;
  };
  insights: {
    keyFindings: string[];
    recommendations: string[];
    confidence: number;
  };
}

export interface InventoryOptimizationResult {
  currentStatus: any;
  recommendedActions: Array<{
    productId: string;
    productName: string;
    action: 'reorder' | 'reduce' | 'maintain' | 'clearance';
    quantity?: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: string;
  }>;
  safetyStockLevels: Array<{
    productId: string;
    currentMinStock: number;
    recommendedMinStock: number;
  }>;
  estimatedSavings: {
    amount: number;
    percentage: number;
    description: string;
  };
}

export interface AnomalyDetectionResult {
  anomalies: Array<{
    type: 'sales' | 'inventory' | 'financial';
    severity: 'critical' | 'warning' | 'info';
    description: string;
    affectedItems: string[];
    detectedAt: string;
    suggestedAction: string;
    confidence: number;
  }>;
  summary: {
    totalAnomalies: number;
    criticalCount: number;
    warningCount: number;
  };
}

export interface PurchaseSuggestion {
  productId: string;
  productName: string;
  sku: string;
  suggestedQuantity: number;
  unit: string;
  estimatedCost: number;
  urgency: 'urgent' | 'soon' | 'normal';
  reason: string;
  supplier?: {
    id: string;
    name: string;
  };
}

// ==================== 销售预测引擎 ====================

/**
 * 分析销售趋势并生成预测
 */
export async function analyzeSalesTrend(
  period: '7d' | '30d' | '90d' | '1y' = '30d'
): Promise<SalesForecastResult> {
  try {
    // 获取历史销售数据
    const periodMap: Record<string, 'day' | 'week' | 'month'> = {
      '7d': 'day',
      '30d': 'day',
      '90d': 'week',
      '1y': 'month',
    };
    
    const historicalData = await getSalesTrend(periodMap[period]);
    
    // 计算趋势（简化版，实际应使用更复杂的统计算法）
    const trend = calculateTrend(historicalData.data);
    
    // 调用LLM进行深度分析
    const llm = await getLLMForTask('sales_forecast');
    const prompt = generatePrompt(
      'sales_forecast',
      {
        analysisPeriod: period,
        dataPoints: historicalData.data.length,
      },
      {
        historicalData: historicalData.data,
        trend: trend,
      },
      `请分析${period}的销售数据，识别关键趋势和模式，预测未来走势。`
    );
    
    const response = await llm.invoke(prompt);
    const insights = extractInsights(response.content as string);
    
    // 验证分析结果
    const validation = validateAnalysis(insights, ['keyFindings', 'recommendations']);
    if (!validation.isValid) {
      console.warn('Analysis validation warnings:', validation.warnings);
    }
    
    return {
      historicalData,
      trend,
      forecast: {
        nextPeriod: generateForecast(historicalData.data, trend),
        confidence: insights.confidence,
      },
      insights,
    };
  } catch (error) {
    console.error('Sales trend analysis failed:', error);
    throw new Error(`销售分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// ==================== 库存优化引擎 ====================

/**
 * 优化库存水平并生成建议
 */
export async function optimizeInventory(): Promise<InventoryOptimizationResult> {
  try {
    // 获取库存数据和销售历史
    const inventory = await getInventoryStats();
    const salesHistory = await getSalesTrend('week');
    
    // 计算安全库存水平
    const safetyStockLevels = calculateSafetyStockLevels(inventory, salesHistory);
    
    // 调用LLM生成优化建议
    const llm = await getLLMForTask('inventory_optimization');
    const prompt = generatePrompt(
      'inventory_optimization',
      {
        totalProducts: inventory.total_products,
        lowStockCount: inventory.low_stock_count,
        zeroStockCount: inventory.zero_stock_count,
        totalValue: inventory.total_value,
      },
      {
        currentInventory: inventory,
        salesHistory: salesHistory.data,
        safetyStockLevels,
      },
      '基于当前库存和销售数据，提出库存优化建议，包括补货、清理滞销品等。'
    );
    
    const response = await llm.invoke(prompt);
    const insights = extractInsights(response.content as string);
    
    // 解析建议为结构化数据
    const recommendedActions = parseInventoryRecommendations(
      insights.recommendations,
      inventory
    );
    
    // 估算节省成本
    const estimatedSavings = estimateInventorySavings(recommendedActions, inventory);
    
    return {
      currentStatus: inventory,
      recommendedActions,
      safetyStockLevels,
      estimatedSavings,
    };
  } catch (error) {
    console.error('Inventory optimization failed:', error);
    throw new Error(`库存优化失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// ==================== 异常检测引擎 ====================

/**
 * 检测业务数据中的异常
 */
export async function detectAnomalies(): Promise<AnomalyDetectionResult> {
  try {
    // 收集多维度业务指标
    const [inventory, salesTrend, productAnalytics] = await Promise.all([
      getInventoryStats(),
      getSalesTrend('day'),
      getProductAnalytics(),
    ]);
    
    // 统计学异常检测
    const statisticalAnomalies = findStatisticalAnomalies({
      inventory,
      salesTrend,
      productAnalytics,
    });
    
    // LLM语义分析
    const llm = await getLLMForTask('anomaly_detection');
    const prompt = generatePrompt(
      'anomaly_detection',
      {
        analysisDate: new Date().toISOString(),
      },
      {
        inventory,
        salesTrend: salesTrend.data,
        bestSelling: productAnalytics.best_selling,
        slowMoving: productAnalytics.slow_moving,
      },
      '分析业务数据，识别任何异常模式或潜在问题。'
    );
    
    const response = await llm.invoke(prompt);
    const insights = extractInsights(response.content as string);
    
    // 合并统计分析和LLM分析结果
    const allAnomalies = mergeAnomalies(statisticalAnomalies, insights.keyFindings);
    
    return {
      anomalies: allAnomalies,
      summary: {
        totalAnomalies: allAnomalies.length,
        criticalCount: allAnomalies.filter(a => a.severity === 'critical').length,
        warningCount: allAnomalies.filter(a => a.severity === 'warning').length,
      },
    };
  } catch (error) {
    console.error('Anomaly detection failed:', error);
    throw new Error(`异常检测失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// ==================== 智能采购建议引擎 ====================

/**
 * 生成智能采购建议
 */
export async function generatePurchaseSuggestions(): Promise<PurchaseSuggestion[]> {
  try {
    // 构建采购上下文
    const [inventory, salesTrend, productAnalytics] = await Promise.all([
      getInventoryStats(),
      getSalesTrend('day'),
      getProductAnalytics(),
    ]);
    
    const context = {
      lowStockProducts: inventory.low_stock_products || [],
      bestSelling: productAnalytics.best_selling.slice(0, 10),
      salesVelocity: calculateSalesVelocity(salesTrend.data),
    };
    
    // 调用LLM生成采购建议
    const llm = await getLLMForTask('purchase_suggestion');
    const prompt = generatePrompt(
      'purchase_suggestion',
      {
        totalLowStock: inventory.low_stock_count,
        analysisDate: new Date().toISOString(),
      },
      context,
      '基于库存水平和销售速度，生成采购建议清单，包括产品、数量、优先级。'
    );
    
    const response = await llm.invoke(prompt);
    const insights = extractInsights(response.content as string);
    
    // 解析建议为结构化数据
    const suggestions = parsePurchaseSuggestions(insights.recommendations, context);
    
    return suggestions;
  } catch (error) {
    console.error('Purchase suggestion generation failed:', error);
    throw new Error(`采购建议生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// ==================== 辅助函数 ====================

/**
 * 计算销售趋势
 */
function calculateTrend(data: any[]): {
  direction: 'upward' | 'downward' | 'stable';
  strength: number;
  description: string;
} {
  if (data.length < 2) {
    return { direction: 'stable', strength: 0, description: '数据不足' };
  }
  
  // 简化版：比较前后两半的平均值
  const midPoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midPoint);
  const secondHalf = data.slice(midPoint);
  
  const firstAvg = firstHalf.reduce((sum, d) => sum + (d.outbound_qty || 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + (d.outbound_qty || 0), 0) / secondHalf.length;
  
  const changeRate = (secondAvg - firstAvg) / firstAvg;
  
  let direction: 'upward' | 'downward' | 'stable';
  let description: string;
  
  if (changeRate > 0.1) {
    direction = 'upward';
    description = `增长趋势明显，增长率 ${(changeRate * 100).toFixed(1)}%`;
  } else if (changeRate < -0.1) {
    direction = 'downward';
    description = `下降趋势明显，下降率 ${(Math.abs(changeRate) * 100).toFixed(1)}%`;
  } else {
    direction = 'stable';
    description = '趋势平稳，波动在正常范围内';
  }
  
  return {
    direction,
    strength: Math.min(Math.abs(changeRate), 1),
    description,
  };
}

/**
 * 生成预测数据（简化版）
 */
function generateForecast(historicalData: any[], trend: any): any[] {
  if (historicalData.length === 0) return [];
  
  const lastDataPoint = historicalData[historicalData.length - 1];
  const forecast: any[] = [];
  
  // 基于趋势生成未来7天的预测
  for (let i = 1; i <= 7; i++) {
    const growthFactor = trend.direction === 'upward' ? 1.05 : 
                        trend.direction === 'downward' ? 0.95 : 1.0;
    
    forecast.push({
      date: `Day+${i}`,
      outbound_qty: Math.round(lastDataPoint.outbound_qty * Math.pow(growthFactor, i)),
      inbound_qty: lastDataPoint.inbound_qty,
      transaction_count: Math.round(lastDataPoint.transaction_count * Math.pow(growthFactor, i * 0.5)),
    });
  }
  
  return forecast;
}

/**
 * 计算安全库存水平
 */
function calculateSafetyStockLevels(_inventory: any, _salesHistory: any): Array<{
  productId: string;
  currentMinStock: number;
  recommendedMinStock: number;
}> {
  // 简化实现：基于平均日销量 * 7天
  return [];
}

/**
 * 解析库存建议
 */
function parseInventoryRecommendations(
  _recommendations: string[],
  _inventory: any
): InventoryOptimizationResult['recommendedActions'] {
  // 简化实现：返回空数组，实际需要解析LLM输出
  return [];
}

/**
 * 估算库存优化带来的节省
 */
function estimateInventorySavings(
  _actions: InventoryOptimizationResult['recommendedActions'],
  _inventory: any
): { amount: number; percentage: number; description: string } {
  return {
    amount: 0,
    percentage: 0,
    description: '需要更多数据来准确估算',
  };
}

/**
 * 查找统计学异常
 */
function findStatisticalAnomalies(data: {
  inventory: any;
  salesTrend: any;
  productAnalytics: any;
}): AnomalyDetectionResult['anomalies'] {
  const anomalies: AnomalyDetectionResult['anomalies'] = [];
  
  // 检查零库存产品
  if (data.inventory.zero_stock_count > 0) {
    anomalies.push({
      type: 'inventory',
      severity: 'critical',
      description: `发现 ${data.inventory.zero_stock_count} 个产品库存为零`,
      affectedItems: [],
      detectedAt: new Date().toISOString(),
      suggestedAction: '立即检查并补货',
      confidence: 0.95,
    });
  }
  
  // 检查低库存产品
  if (data.inventory.low_stock_count > data.inventory.total_products * 0.2) {
    anomalies.push({
      type: 'inventory',
      severity: 'warning',
      description: `低库存产品占比过高 (${data.inventory.low_stock_count}/${data.inventory.total_products})`,
      affectedItems: [],
      detectedAt: new Date().toISOString(),
      suggestedAction: '审查库存策略，增加安全库存',
      confidence: 0.85,
    });
  }
  
  return anomalies;
}

/**
 * 合并统计分析与LLM分析结果
 */
function mergeAnomalies(
  statistical: AnomalyDetectionResult['anomalies'],
  llmFindings: string[]
): AnomalyDetectionResult['anomalies'] {
  const merged = [...statistical];
  
  // 将LLM的发现转换为异常记录
  llmFindings.forEach(finding => {
    merged.push({
      type: 'sales',
      severity: 'warning',
      description: finding,
      affectedItems: [],
      detectedAt: new Date().toISOString(),
      suggestedAction: '进一步调查',
      confidence: 0.7,
    });
  });
  
  return merged;
}

/**
 * 计算销售速度
 */
function calculateSalesVelocity(_salesData: any[]): Record<string, number> {
  const velocity: Record<string, number> = {};
  // 简化实现
  return velocity;
}

/**
 * 解析采购建议
 */
function parsePurchaseSuggestions(
  _recommendations: string[],
  _context: any
): PurchaseSuggestion[] {
  // 简化实现：返回空数组
  return [];
}
