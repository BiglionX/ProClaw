/**
 * 服务分层配置
 * 
 * 定义服务按版本分层的映射关系
 */

/**
 * 功能 ID 类型
 */
export type ServiceFeatureId = 
  | 'common'
  | 'product'
  | 'purchase'
  | 'sales'
  | 'inventory'
  | 'finance'
  | 'team'
  | 'agent'
  | 'secretary'
  | 'finance_agent'
  | 'agent_market'
  | 'cloud_backup'
  | 'nvwax'
  | 'catering'
  | 'beauty'
  | 'pet'
  | 'cv'
  | 'lw'
  | 'pa'
  | 'ff'
  | 'ap'
  | 'hw'
  | 'dm'
  | 'gb';

/**
 * 服务版本映射
 */
export interface ServiceMapping {
  /** 服务名称 */
  name: string;
  /** 对应的功能 ID */
  featureId: ServiceFeatureId;
  /** 服务文件路径 */
  path: string;
  /** 服务描述 */
  description: string;
  /** 是否必需（非可选功能可以为空） */
  required: boolean;
}

/**
 * 服务分层映射表
 */
export const SERVICE_MAPPINGS: ServiceMapping[] = [
  // ==================== 通用服务 ====================
  // 所有版本都需要的核心服务

  {
    name: 'authStore',
    featureId: 'common',
    path: '@/lib/authStore',
    description: '认证状态管理',
    required: true,
  },
  {
    name: 'apiClient',
    featureId: 'common',
    path: '@/lib/apiClient',
    description: 'API 客户端',
    required: true,
  },
  {
    name: 'syncService',
    featureId: 'common',
    path: '@/lib/syncService',
    description: '数据同步服务',
    required: true,
  },
  {
    name: 'tauri',
    featureId: 'common',
    path: '@/lib/tauri',
    description: 'Tauri API 封装',
    required: true,
  },

  // ==================== Light 版服务 ====================
  // Light 版基础服务

  {
    name: 'productService',
    featureId: 'product',
    path: '@/lib/productService',
    description: '产品管理服务',
    required: true,
  },
  {
    name: 'brandService',
    featureId: 'product',
    path: '@/lib/brandService',
    description: '品牌管理服务',
    required: false,
  },
  {
    name: 'categoryService',
    featureId: 'product',
    path: '@/lib/categoryService',
    description: '分类管理服务',
    required: false,
  },
  {
    name: 'contactService',
    featureId: 'team',
    path: '@/lib/contactService',
    description: '联系人管理服务',
    required: false,
  },
  {
    name: 'callService',
    featureId: 'team',
    path: '@/lib/callService',
    description: '通话记录服务',
    required: false,
  },

  // ==================== Plus 版服务 ====================
  // 进销存版本独有服务

  {
    name: 'purchaseService',
    featureId: 'purchase',
    path: '@/lib/purchaseService',
    description: '采购管理服务',
    required: false,
  },
  {
    name: 'salesService',
    featureId: 'sales',
    path: '@/lib/salesService',
    description: '销售管理服务',
    required: false,
  },
  {
    name: 'inventoryService',
    featureId: 'inventory',
    path: '@/lib/inventoryService',
    description: '库存管理服务',
    required: false,
  },
  {
    name: 'financeService',
    featureId: 'finance',
    path: '@/lib/financeService',
    description: '财务管理服务',
    required: false,
  },
  {
    name: 'paymentService',
    featureId: 'finance',
    path: '@/lib/paymentService',
    description: '收付款服务',
    required: false,
  },
  {
    name: 'reconciliationService',
    featureId: 'finance',
    path: '@/lib/reconciliationService',
    description: '对账服务',
    required: false,
  },
  {
    name: 'purchaseReturnService',
    featureId: 'purchase',
    path: '@/lib/purchaseReturnService',
    description: '采购退货服务',
    required: false,
  },
  {
    name: 'salesReturnService',
    featureId: 'sales',
    path: '@/lib/salesReturnService',
    description: '销售退货服务',
    required: false,
  },

  // ==================== AI Agent 服务 ====================
  // AI 相关服务

  {
    name: 'aiTeamChatService',
    featureId: 'common',
    path: '@/lib/aiTeamChatService',
    description: 'AI 团队对话服务',
    required: false,
  },
  {
    name: 'aiTeamRecommendationService',
    featureId: 'common',
    path: '@/lib/aiTeamRecommendationService',
    description: 'AI 团队推荐服务',
    required: false,
  },
  {
    name: 'agentRuntime',
    featureId: 'agent',
    path: '@/lib/agentRuntime',
    description: 'Agent 运行时',
    required: false,
  },
  {
    name: 'ceoController',
    featureId: 'secretary',
    path: '@/lib/ceoController',
    description: 'CEO 控制器',
    required: false,
  },
  {
    name: 'financeAgentService',
    featureId: 'finance_agent',
    path: '@/lib/financeAgentService',
    description: '财务 Agent 服务',
    required: false,
  },
  {
    name: 'agentMarketService',
    featureId: 'agent_market',
    path: '@/lib/agentMarketService',
    description: 'Agent 商店服务',
    required: false,
  },

  // ==================== 行业插件服务 ====================
  // 各行业插件服务

  {
    name: 'cateringService',
    featureId: 'catering',
    path: '@/lib/industry/cateringService',
    description: '餐饮服务',
    required: false,
  },
  {
    name: 'beautyService',
    featureId: 'beauty',
    path: '@/lib/industry/beautyService',
    description: '美业服务',
    required: false,
  },
  {
    name: 'petService',
    featureId: 'pet',
    path: '@/lib/industry/petService',
    description: '宠物服务',
    required: false,
  },
  {
    name: 'cloudBackupService',
    featureId: 'cloud_backup',
    path: '@/lib/cloudBackupService',
    description: '云备份服务',
    required: false,
  },
  {
    name: 'subscriptionService',
    featureId: 'common',
    path: '@/lib/subscriptionService',
    description: '订阅服务',
    required: false,
  },
  {
    name: 'nvwaxClient',
    featureId: 'nvwax',
    path: '@/lib/nvwaxClient',
    description: 'NvwaX 客户端',
    required: false,
  },
];

/**
 * 获取按功能分组的服务列表
 */
export function getServicesByFeature(featureId: ServiceFeatureId): ServiceMapping[] {
  return SERVICE_MAPPINGS.filter(s => s.featureId === featureId);
}

/**
 * 获取必需服务列表
 */
export function getRequiredServices(): ServiceMapping[] {
  return SERVICE_MAPPINGS.filter(s => s.required);
}

/**
 * 获取可选服务列表
 */
export function getOptionalServices(): ServiceMapping[] {
  return SERVICE_MAPPINGS.filter(s => !s.required);
}

/**
 * 服务导出映射（用于按需导出）
 */
export const SERVICE_EXPORTS = {
  common: [
    'authStore',
    'apiClient',
    'syncService',
    'tauri',
    'aiTeamChatService',
    'aiTeamRecommendationService',
    'subscriptionService',
  ],
  product: [
    'productService',
    'brandService',
    'categoryService',
    'contactService',
    'callService',
  ],
  purchase: [
    'purchaseService',
    'purchaseReturnService',
  ],
  sales: [
    'salesService',
    'salesReturnService',
  ],
  inventory: [
    'inventoryService',
  ],
  finance: [
    'financeService',
    'paymentService',
    'reconciliationService',
  ],
  team: [
    'contactService',
    'callService',
  ],
  agent: [
    'agentRuntime',
    'agentMarketService',
  ],
  secretary: [
    'ceoController',
  ],
  finance_agent: [
    'financeAgentService',
  ],
  cloud_backup: [
    'cloudBackupService',
  ],
  nvwax: [
    'nvwaxClient',
  ],
} as const;
