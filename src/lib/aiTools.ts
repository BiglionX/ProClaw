/**
 * AI工具函数库
 * 提供数据格式化、洞察提取、提示词生成等通用功能
 */

/**
 * 格式化业务数据为LLM友好的JSON格式
 * 压缩数值精度，移除冗余信息
 */
export function formatBusinessData(data: any, maxItems?: number): string {
  const compressed = compressNumbers(data);
  
  // 如果指定了最大条目数，进行采样
  if (maxItems && Array.isArray(compressed)) {
    const sampled = sampleData(compressed, maxItems);
    return JSON.stringify(sampled, null, 2);
  }
  
  return JSON.stringify(compressed, null, 2);
}

/**
 * 从LLM响应中提取结构化洞察
 * 尝试解析JSON，如果失败则提取关键信息
 */
export function extractInsights(response: string): {
  keyFindings: string[];
  recommendations: string[];
  confidence: number;
  rawAnalysis: string;
} {
  try {
    // 尝试解析JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        keyFindings: parsed.key_findings || parsed.keyFindings || [],
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 0.8,
        rawAnalysis: response,
      };
    }
  } catch (error) {
    console.warn('Failed to parse JSON from LLM response, using text extraction');
  }

  // 降级方案：从文本中提取
  const findings = extractSection(response, ['核心发现', '关键发现', 'Key Findings', '主要发现']);
  const recommendations = extractSection(response, ['建议', '行动建议', 'Recommendations', '改进建议']);

  return {
    keyFindings: findings,
    recommendations: recommendations,
    confidence: 0.6, // 降低置信度
    rawAnalysis: response,
  };
}

/**
 * 验证AI输出的合理性
 * 检查必要字段、数值范围等
 */
export function validateAnalysis(analysis: any, requiredFields: string[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查必需字段
  for (const field of requiredFields) {
    if (!analysis[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // 检查数值合理性
  if (analysis.confidence !== undefined) {
    if (analysis.confidence < 0 || analysis.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    } else if (analysis.confidence < 0.5) {
      warnings.push('Low confidence level detected');
    }
  }

  // 检查建议数量
  if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
    if (analysis.recommendations.length === 0) {
      warnings.push('No recommendations provided');
    } else if (analysis.recommendations.length > 10) {
      warnings.push('Too many recommendations, consider prioritizing');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 动态生成提示词模板
 * 根据任务类型和数据上下文构建提示词
 */
export function generatePrompt(
  taskType: string,
  context: Record<string, any>,
  data: any,
  customInstructions?: string
): string {
  const basePrompts: Record<string, string> = {
    sales_forecast: `你是一位资深销售分析师，擅长从历史数据中发现趋势和模式。`,
    inventory_optimization: `你是一位库存管理专家，专注于优化库存水平和降低成本。`,
    anomaly_detection: `你是一位数据异常检测专家，能够识别业务数据中的异常模式。`,
    purchase_suggestion: `你是一位采购顾问，擅长制定最优采购策略。`,
    business_insight: `你是一位商业智能分析师，能够从多维度数据中提取有价值的洞察。`,
  };

  const basePrompt = basePrompts[taskType] || basePrompts.business_insight;

  let prompt = `${basePrompt}

## 分析任务
${customInstructions || getDefaultInstructions(taskType)}

## 业务上下文
${formatContext(context)}

## 数据
${formatBusinessData(data, 50)}

## 输出要求
请以JSON格式返回分析结果，包含以下字段：
- key_findings: 数组，3-5个关键发现
- detailed_analysis: 字符串，详细分析
- recommendations: 数组，具体可执行的建议
- confidence: 数字，0-1之间的置信度
- supporting_data: 对象，支撑结论的关键数据点

确保分析：
1. 数据驱动，避免主观臆断
2. 关注同比和环比变化
3. 考虑季节性和外部因素
4. 提供具体的数字支撑
5. 建议要可执行、可量化`;

  return prompt;
}

/**
 * 估算文本的token数量
 * 粗略估算：1个中文字符≈1.5 tokens，1个英文单词≈1.3 tokens
 */
export function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const otherChars = text.length - chineseChars - englishWords;

  return Math.ceil(chineseChars * 1.5 + englishWords * 1.3 + otherChars * 0.5);
}

/**
 * 智能截断文本以适应token限制
 */
export function smartTruncate(text: string, maxTokens: number): string {
  const currentTokens = estimateTokens(text);
  if (currentTokens <= maxTokens) return text;

  // 按比例截断
  const ratio = maxTokens / currentTokens;
  const truncatedLength = Math.floor(text.length * ratio * 0.9); // 留10%余量

  return text.substring(0, truncatedLength) + '\n...[内容已截断]';
}

/**
 * 从文本中提取特定章节的内容
 */
function extractSection(text: string, headers: string[]): string[] {
  const results: string[] = [];
  
  for (const header of headers) {
    const regex = new RegExp(`${header}[：:]?\\s*\\n([\\s\\S]*?)(?=\\n##|\\n#|$)`, 'i');
    const match = text.match(regex);
    if (match) {
      const content = match[1].trim();
      // 按行分割并过滤空行
      const lines = content.split('\n').filter(line => line.trim());
      results.push(...lines.map(line => line.replace(/^[-•*]\s*/, '').trim()));
    }
  }

  return results.slice(0, 5); // 最多返回5条
}

/**
 * 压缩数值精度以减少token使用
 */
function compressNumbers(obj: any): any {
  if (typeof obj === 'number') {
    // 保留2位小数
    return Math.round(obj * 100) / 100;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => compressNumbers(item));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = compressNumbers(value);
    }
    return result;
  }
  
  return obj;
}

/**
 * 数据采样，保持代表性
 */
function sampleData(data: any[], maxItems: number): any[] {
  if (data.length <= maxItems) return data;

  // 分层采样：取开头、中间、结尾的数据
  const result: any[] = [];
  const step = Math.floor(data.length / maxItems);
  
  for (let i = 0; i < maxItems; i++) {
    const index = Math.min(i * step, data.length - 1);
    result.push(data[index]);
  }

  return result;
}

/**
 * 格式化业务上下文
 */
function formatContext(context: Record<string, any>): string {
  return Object.entries(context)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');
}

/**
 * 获取任务的默认指令
 */
function getDefaultInstructions(taskType: string): string {
  const instructions: Record<string, string> = {
    sales_forecast: '分析销售趋势，预测未来走势，识别影响因素',
    inventory_optimization: '评估当前库存水平，提出优化建议，计算安全库存',
    anomaly_detection: '识别数据异常，分析可能原因，评估影响程度',
    purchase_suggestion: '基于库存和销售数据，生成采购建议清单',
    business_insight: '综合分析业务数据，提取关键洞察和行动建议',
  };

  return instructions[taskType] || instructions.business_insight;
}
