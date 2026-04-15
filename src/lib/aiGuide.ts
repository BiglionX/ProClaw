/**
 * AI智能引导系统
 * 检测LLM连接状态，识别用户意图并提供智能引导
 * 包含：连接检测、意图识别、错误处理、个性化推荐、功能发现
 */

import { getAIConfig } from './aiConfig';
import { recordUserQuery } from './faqService';

// 意图类型
export type IntentType = 
  | 'llm_connection'      // LLM连接相关
  | 'deployment'         // 部署相关
  | 'pricing'           // 费用相关
  | 'business_query'    // 业务查询
  | 'general_chat'      // 一般对话
  | 'setup_guide'       // 设置引导
  | 'error_troubleshoot' // 错误排查
  | 'feature_discovery'  // 功能发现
  | 'data_operation'     // 数据操作（导入/导出）
  | 'unknown';          // 未知

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  suggestedAction?: string;
  suggestedResponse?: string;
}

// 关键词映射
const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  llm_connection: ['连接', 'api', 'key', '密钥', '大模型', '模型', 'ai', 'llm', 'openai', 'anthropic', 'claude', 'ollama', 'token'],
  deployment: ['部署', '安装', '配置', '设置', 'docker', '服务器', '云端', '本地'],
  pricing: ['费用', '价格', '成本', '收费', '付费', '免费', '用量', '多少钱', 'token', 'quota'],
  business_query: ['产品', '库存', '销售', '订单', '客户', '供应商', '报表', '分析', '查询', '统计'],
  setup_guide: ['如何', '怎么', '教程', '指南', '帮助', '文档', '说明'],
  error_troubleshoot: ['错误', '失败', '无法', '不能', '问题', 'bug', '异常', '报错', '不工作'],
  feature_discovery: ['功能', '支持', '可以', '能不能', '有没有', '特性'],
  data_operation: ['导入', '导出', '批量', 'excel', 'csv', '备份', '恢复', '迁移'],
  general_chat: ['你好', '嗨', '谢谢', '再见', '早上好', '下午好', '晚上好'],
  unknown: [],
};

// 用户行为记录
interface UserBehavior {
  queryHistory: string[];
  lastActivePage: string;
  featureUsage: Record<string, number>;
}

// 常见错误模式
const ERROR_PATTERNS = [
  { pattern: /api.*key.*错误|key.*invalid/i, solution: 'api_key_invalid' },
  { pattern: /连接.*失败|connection.*failed/i, solution: 'connection_failed' },
  { pattern: /模型.*不存在|model.*not found/i, solution: 'model_not_found' },
  { pattern: /权限.*不足|permission.*denied/i, solution: 'permission_denied' },
  { pattern: /超时|timeout/i, solution: 'timeout_error' },
];

// 功能发现推荐
const FEATURE_RECOMMENDATIONS = [
  {
    keywords: ['库存', '预警', '提醒'],
    feature: '智能库存预警',
    description: '自动监控库存水平，低于安全库存时主动提醒',
    path: '/inventory',
  },
  {
    keywords: ['销售', '分析', '趋势', '报表'],
    feature: '销售数据分析',
    description: 'AI驱动的销售趋势分析和预测',
    path: '/analytics',
  },
  {
    keywords: ['采购', '供应商', '订单'],
    feature: '智能采购建议',
    description: '基于销售预测自动生成采购建议',
    path: '/purchase',
  },
  {
    keywords: ['导入', '批量', 'excel'],
    feature: '批量数据导入',
    description: '支持Excel/CSV批量导入产品和库存数据',
    path: '/products',
  },
];

/**
 * 检测LLM连接状态
 */
export async function checkLLMConnectionStatus(): Promise<{
  isConnected: boolean;
  providers: string[];
  message: string;
}> {
  try {
    const config = await getAIConfig();
    
    // 检查是否有活跃的提供商
    const hasActiveProvider = config.providers.some(p => p.isActive && p.apiKey);
    
    if (!hasActiveProvider) {
      // 检查默认提供商（ProClaw集成LLM）
      const defaultProvider = config.providers.find(p => p.type === 'default');
      if (defaultProvider && defaultProvider.isActive) {
        return {
          isConnected: true,
          providers: ['default'],
          message: '使用 ProClaw 集成 LLM',
        };
      }
      
      return {
        isConnected: false,
        providers: [],
        message: '未连接任何LLM提供商',
      };
    }
    
    const activeProviders = config.providers
      .filter(p => p.isActive && p.apiKey)
      .map(p => p.name);
    
    return {
      isConnected: true,
      providers: activeProviders,
      message: `已连接: ${activeProviders.join(', ')}`,
    };
  } catch (error) {
    return {
      isConnected: false,
      providers: [],
      message: '检查连接状态失败',
    };
  }
}

/**
 * 识别用户意图
 */
export function detectIntent(userInput: string): IntentResult {
  const input = userInput.toLowerCase();
  
  // 计算每个意图的匹配分数
  const scores: Record<IntentType, number> = {
    llm_connection: 0,
    deployment: 0,
    pricing: 0,
    business_query: 0,
    setup_guide: 0,
    error_troubleshoot: 0,
    feature_discovery: 0,
    data_operation: 0,
    general_chat: 0,
    unknown: 0,
  };
  
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (input.includes(keyword.toLowerCase())) {
        scores[intent as IntentType] += 1;
      }
    }
  }
  
  // 找到最高分的意图
  let maxScore = 0;
  let detectedIntent: IntentType = 'unknown';
  
  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedIntent = intent as IntentType;
    }
  }
  
  // 如果分数太低，认为是未知意图
  if (maxScore < 1) {
    detectedIntent = 'unknown';
  }
  
  // 生成建议响应
  const suggestion = generateSuggestion(detectedIntent, userInput);
  
  return {
    intent: detectedIntent,
    confidence: Math.min(maxScore / 3, 1), // 归一化到0-1
    ...suggestion,
  };
}

/**
 * 根据意图生成建议和响应
 */
function generateSuggestion(intent: IntentType, _userInput: string): {
  suggestedAction?: string;
  suggestedResponse?: string;
} {
  switch (intent) {
    case 'llm_connection':
      return {
        suggestedAction: 'check_connection',
        suggestedResponse: '我注意到您可能在询问LLM连接相关的问题。让我帮您检查一下当前的连接状态...',
      };
    
    case 'deployment':
      return {
        suggestedAction: 'show_deployment_guide',
        suggestedResponse: '看起来您对部署感兴趣。ProClaw 支持本地部署和云端部署，我可以为您提供详细指南。',
      };
    
    case 'pricing':
      return {
        suggestedAction: 'show_pricing_info',
        suggestedResponse: '关于费用问题，ProClaw 本身是开源免费的。AI功能需要使用您自己的API密钥，费用由模型提供商收取。',
      };
    
    case 'setup_guide':
      return {
        suggestedAction: 'show_setup_guide',
        suggestedResponse: '我可以为您提供设置指南。请问您想了解哪个方面的设置？',
      };
    
    case 'error_troubleshoot':
      return {
        suggestedAction: 'troubleshoot_error',
        suggestedResponse: undefined, // 由具体错误处理函数生成
      };
    
    case 'feature_discovery':
      return {
        suggestedAction: 'discover_features',
        suggestedResponse: undefined, // 由功能发现函数生成
      };
    
    case 'data_operation':
      return {
        suggestedAction: 'show_data_operations',
        suggestedResponse: undefined, // 由数据操作函数生成
      };
    
    case 'business_query':
      return {
        suggestedAction: 'execute_business_query',
        suggestedResponse: undefined, // 业务查询直接执行
      };
    
    case 'general_chat':
      return {
        suggestedAction: 'chat',
        suggestedResponse: undefined, // 一般对话正常处理
      };
    
    default:
      return {
        suggestedAction: undefined,
        suggestedResponse: undefined,
      };
  }
}

/**
 * 获取连接引导消息
 */
export async function getConnectionGuideMessage(): Promise<string> {
  const status = await checkLLMConnectionStatus();
  
  if (!status.isConnected) {
    return `🔌 **检测到您还未连接大模型**

目前 ProClaw 支持以下AI服务提供商：
• OpenAI (GPT-4/GPT-3.5)
• Anthropic Claude
• 阿里云通义千问
• 智谱清言
• Ollama (本地部署)

💡 **如何配置？**
1. 前往"设置"页面
2. 选择"AI设置"标签
3. 添加您的API密钥
4. 测试连接

是否需要我帮您跳转到设置页面？`;
  }
  
  return `✅ **AI连接状态正常**

当前连接: ${status.message}

您可以开始使用AI功能了！`;
}

/**
 * 错误排查处理
 */
function troubleshootError(userInput: string): string {
  // 检测错误模式
  for (const { pattern, solution } of ERROR_PATTERNS) {
    if (pattern.test(userInput)) {
      switch (solution) {
        case 'api_key_invalid':
          return `🔑 **API密钥问题排查**

可能的原因：
1. API密钥格式不正确
2. API密钥已过期或被撤销
3. 密钥对应服务未开通

✅ **解决步骤：**
1. 前往"设置 > AI设置"
2. 重新输入正确的API密钥
3. 点击"测试连接"验证
4. 确保账户余额充足

需要我帮您检查当前的配置吗？`;
        
        case 'connection_failed':
          return `🌐 **网络连接问题排查**

可能的原因：
1. 网络连接不稳定
2. 防火墙或代理阻止请求
3. API服务地址配置错误

✅ **解决步骤：**
1. 检查网络连接
2. 如果使用代理，请配置代理设置
3. 验证API端点地址是否正确
4. 尝试ping API服务器

当前支持的网络诊断功能：
• 连接测试
• 延迟检测
• 防火墙检测`;
        
        case 'model_not_found':
          return `🤖 **模型不存在问题排查**

可能的原因：
1. 模型名称拼写错误
2. 该模型在您账户中未开通
3. 模型已下线或改名

✅ **解决步骤：**
1. 检查模型名称是否正确
2. 前往提供商官网确认可用模型列表
3. 在设置中重新选择模型

当前可用的模型：
• OpenAI: gpt-4, gpt-3.5-turbo
• Anthropic: claude-3-sonnet, claude-3-haiku
• Ollama: llama2, mistral`;
        
        case 'permission_denied':
          return `🔒 **权限不足问题排查**

可能的原因：
1. API密钥权限不足
2. 账户等级限制
3. 组织权限设置

✅ **解决步骤：**
1. 检查API密钥的权限设置
2. 联系管理员提升权限
3. 升级账户等级
4. 使用更高权限的密钥`;
        
        case 'timeout_error':
          return `⏱️ **超时问题排查**

可能的原因：
1. 网络延迟过高
2. 服务器负载过高
3. 请求数据量过大

✅ **解决步骤：**
1. 检查网络连接速度
2. 减少请求的数据量
3. 重试请求
4. 考虑使用本地模型(Ollama)`;
        
        default:
          return '';
      }
    }
  }
  
  return '';
}

/**
 * 功能发现推荐
 */
function discoverFeatures(userInput: string): string {
  const input = userInput.toLowerCase();
  const matchedFeatures = FEATURE_RECOMMENDATIONS.filter((rec: any) =>
    rec.keywords.some((keyword: string) => input.includes(keyword))
  );
  
  if (matchedFeatures.length > 0) {
    let response = '🎯 **为您推荐以下功能**\n\n';
    matchedFeatures.forEach((feature: any, index: number) => {
      response += `${index + 1}. **${feature.feature}**\n`;
      response += `   ${feature.description}\n`;
      response += `   📍 路径: ${feature.path}\n\n`;
    });
    response += '💡 您可以直接点击上述路径体验功能，或告诉我您想了解哪个功能的详情。';
    return response;
  }
  
  return '';
}

/**
 * 数据操作指南
 */
function showDataOperations(userInput: string): string {
  const input = userInput.toLowerCase();
  
  if (input.includes('导入') || input.includes('excel') || input.includes('csv')) {
    return `📥 **数据导入指南**

ProClaw 支持多种数据导入方式：

**1. Excel/CSV导入**
• 支持格式: .xlsx, .csv
• 支持批量导入产品、库存、客户、供应商
• 自动数据验证和错误提示

**导入步骤：**
1. 准备数据文件（遵循模板格式）
2. 进入对应页面（如商品库）
3. 点击"导入"按钮
4. 选择文件并映射字段
5. 预览并确认导入

**2. API批量导入**
• 支持通过API批量创建数据
• 适合技术团队和自动化场景

**3. 从其他系统迁移**
• 支持从常见ERP系统迁移
• 提供数据转换工具

需要我提供Excel导入模板吗？`;
  }
  
  if (input.includes('导出') || input.includes('备份')) {
    return `📤 **数据导出指南**

ProClaw 支持完整的数据导出：

**可导出的数据：**
• 产品列表（含图片、价格、库存）
• 库存交易记录
• 销售订单和记录
• 客户和供应商信息
• 财务报表

**导出格式：**
• Excel (.xlsx)
• CSV
• JSON（适合技术备份）

**导出步骤：**
1. 进入对应管理页面
2. 筛选需要的数据
3. 点击"导出"按钮
4. 选择格式和字段
5. 下载文件

**自动备份：**
• 支持定时自动备份
• 可配置备份频率
• 备份文件加密存储`;
  }
  
  return '';
}

/**
 * 个性化推荐（基于用户行为）
 */
export function getPersonalizedRecommendations(): string {
  try {
    const behavior = localStorage.getItem('proclaw-user-behavior');
    if (!behavior) return '';
    
    const data: UserBehavior = JSON.parse(behavior);
    const recommendations: string[] = [];
    
    // 基于查询历史推荐
    if (data.queryHistory.length > 0) {
      const lastQuery = data.queryHistory[data.queryHistory.length - 1];
      if (lastQuery.includes('库存')) {
        recommendations.push('📦 **智能库存预警**\n您可以设置库存预警规则，系统会在库存低于安全线时自动提醒。');
      }
      if (lastQuery.includes('销售')) {
        recommendations.push('📊 **销售预测**\n基于历史数据，AI可以预测未来销售趋势，帮助您优化采购计划。');
      }
    }
    
    // 基于功能使用推荐
    if (data.featureUsage) {
      const mostUsed = Object.entries(data.featureUsage)
        .sort(([, a]: any, [, b]: any) => b - a)[0];
      
      if (mostUsed && mostUsed[0] === 'products') {
        recommendations.push('🏷️ **产品分类管理**\n您可以为产品设置品牌和分类，便于批量管理和快速查询。');
      }
    }
    
    if (recommendations.length > 0) {
      return '💡 **为您推荐**\n\n' + recommendations.join('\n\n');
    }
  } catch (error) {
    console.error('Failed to get personalized recommendations:', error);
  }
  
  return '';
}

/**
 * 记录用户行为
 */
export function recordUserBehavior(action: string, page?: string) {
  try {
    const behaviorStr = localStorage.getItem('proclaw-user-behavior');
    const behavior: UserBehavior = behaviorStr 
      ? JSON.parse(behaviorStr)
      : { queryHistory: [], lastActivePage: '', featureUsage: {} };
    
    if (action === 'query') {
      behavior.queryHistory.push(new Date().toISOString());
      // 只保留最近20条记录
      if (behavior.queryHistory.length > 20) {
        behavior.queryHistory = behavior.queryHistory.slice(-20);
      }
    }
    
    if (page) {
      behavior.lastActivePage = page;
      behavior.featureUsage[page] = (behavior.featureUsage[page] || 0) + 1;
    }
    
    localStorage.setItem('proclaw-user-behavior', JSON.stringify(behavior));
  } catch (error) {
    console.error('Failed to record user behavior:', error);
  }
}

/**
 * 处理用户输入并返回智能响应
 */
export async function handleUserInput(userInput: string): Promise<{
  shouldRedirect: boolean;
  redirectPath?: string;
  response: string;
}> {
  const intent = detectIntent(userInput);
  
  // 记录用户查询（用于FAQ自动收集）
  recordUserQuery(userInput, {
    queryType: 'chat',
    context: {
      currentPage: window.location.pathname,
      timestamp: new Date().toISOString(),
    },
  });
  
  // 检查LLM连接状态
  const connectionStatus = await checkLLMConnectionStatus();
  
  // 如果没有连接LLM且用户询问AI相关功能
  if (!connectionStatus.isConnected && 
      (intent.intent === 'llm_connection' || intent.intent === 'unknown')) {
    const guideMessage = await getConnectionGuideMessage();
    return {
      shouldRedirect: false,
      response: guideMessage,
    };
  }
  
  // 根据意图返回相应处理
  switch (intent.intent) {
    case 'deployment':
      return {
        shouldRedirect: false,
        response: `📦 **ProClaw 部署指南**

ProClaw 支持多种部署方式：

**1. 桌面应用（推荐）**
• 直接下载安装包
• 支持 Windows/macOS/Linux
• 数据本地存储，完全自主可控

**2. 云端部署**
• 使用 Docker 部署
• 支持多用户协作
• 数据云端同步

**3. 自托管**
• 完整的源代码
• 可自定义修改
• 适合技术团队

您想了解哪种部署方式的详细步骤？`,
      };
    
    case 'pricing':
      return {
        shouldRedirect: false,
        response: `💰 **ProClaw 费用说明**

**ProClaw 本身完全免费**
• 开源项目，遵循 GPL-3.0 协议
• 所有功能免费使用
• 社区支持

**AI功能费用**
• 使用您自己的API密钥
• 费用由模型提供商收取
• ProClaw 不收取任何额外费用

**预估费用参考**：
• OpenAI GPT-3.5: ~$0.002/1K tokens
• OpenAI GPT-4: ~$0.06/1K tokens
• 正常业务使用每月约 $5-20

**免费选项**：
• Ollama 本地模型（完全免费）
• 需要自备GPU资源

需要了解如何降低AI使用成本吗？`,
      };
    
    case 'setup_guide':
      return {
        shouldRedirect: false,
        response: `📖 **ProClaw 快速入门指南**

**第一步：安装**
1. 下载适合您系统的安装包
2. 运行安装程序
3. 首次启动应用

**第二步：配置AI**
1. 进入"设置"页面
2. 选择"AI设置"标签
3. 添加API密钥（或使用本地模型）
4. 测试连接

**第三步：开始使用**
1. 添加产品到商品库
2. 管理库存
3. 使用AI智能体查询数据

💡 **提示**：
• 支持自然语言查询
• 例如："查询上周销量最好的产品"

需要我详细说明哪个步骤？`,
      };
    
    case 'error_troubleshoot':
      const errorResponse = troubleshootError(userInput);
      if (errorResponse) {
        return {
          shouldRedirect: false,
          response: errorResponse,
        };
      }
      break;
    
    case 'feature_discovery':
      const featureResponse = discoverFeatures(userInput);
      if (featureResponse) {
        return {
          shouldRedirect: false,
          response: featureResponse,
        };
      }
      break;
    
    case 'data_operation':
      const dataOpResponse = showDataOperations(userInput);
      if (dataOpResponse) {
        return {
          shouldRedirect: false,
          response: dataOpResponse,
        };
      }
      break;
    
    default:
      return {
        shouldRedirect: false,
        response: '', // 其他情况由commandParser处理
      };
  }
  
  return {
    shouldRedirect: false,
    response: '',
  };
}
