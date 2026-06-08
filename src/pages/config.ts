/**
 * 页面路由配置
 * 
 * 定义页面按版本分层的映射关系
 */

/**
 * 功能 ID 类型
 */
export type PageFeatureId = 
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
 * 页面路由映射
 */
export interface PageRoute {
  /** 路由路径 */
  path: string;
  /** 页面组件名称 */
  component: string;
  /** 对应的功能 ID */
  featureId: PageFeatureId;
  /** 页面标题 */
  title: string;
  /** 图标 */
  icon?: string;
  /** 是否在导航菜单显示 */
  showInNav: boolean;
  /** 排序顺序 */
  order: number;
}

/**
 * 页面路由映射表
 */
export const PAGE_ROUTES: PageRoute[] = [
  // ==================== 通用页面 ====================
  
  {
    path: '/login',
    component: 'LoginPage',
    featureId: 'common',
    title: '登录',
    icon: 'login',
    showInNav: false,
    order: 0,
  },
  {
    path: '/register',
    component: 'RegisterPage',
    featureId: 'common',
    title: '注册',
    icon: 'register',
    showInNav: false,
    order: 0,
  },
  {
    path: '/setup',
    component: 'SetupPage',
    featureId: 'common',
    title: '初始化设置',
    icon: 'setup',
    showInNav: false,
    order: 0,
  },
  {
    path: '/settings',
    component: 'SettingsPage',
    featureId: 'common',
    title: '设置',
    icon: 'settings',
    showInNav: true,
    order: 100,
  },
  {
    path: '/user-center',
    component: 'UserCenterPage',
    featureId: 'common',
    title: '用户中心',
    icon: 'user',
    showInNav: true,
    order: 99,
  },

  // ==================== Light 版页面 ====================
  
  {
    path: '/',
    component: 'DashboardPage',
    featureId: 'product',
    title: '工作台',
    icon: 'dashboard',
    showInNav: true,
    order: 1,
  },
  {
    path: '/products',
    component: 'ProductsPage',
    featureId: 'product',
    title: '产品管理',
    icon: 'products',
    showInNav: true,
    order: 10,
  },
  {
    path: '/contacts',
    component: 'ContactsPage',
    featureId: 'team',
    title: '联系人',
    icon: 'contacts',
    showInNav: true,
    order: 20,
  },
  {
    path: '/calls',
    component: 'CallPage',
    featureId: 'team',
    title: '通话记录',
    icon: 'call',
    showInNav: true,
    order: 21,
  },
  {
    path: '/messages',
    component: 'MessagesPage',
    featureId: 'team',
    title: '消息中心',
    icon: 'message',
    showInNav: true,
    order: 22,
  },
  {
    path: '/teams',
    component: 'TeamsPage',
    featureId: 'team',
    title: 'AI 团队',
    icon: 'team',
    showInNav: true,
    order: 23,
  },

  // ==================== Plus 版页面 ====================
  
  {
    path: '/inventory',
    component: 'InventoryPage',
    featureId: 'inventory',
    title: '库存管理',
    icon: 'inventory',
    showInNav: true,
    order: 30,
  },
  {
    path: '/purchase',
    component: 'PurchasePage',
    featureId: 'purchase',
    title: '采购管理',
    icon: 'purchase',
    showInNav: true,
    order: 40,
  },
  {
    path: '/sales',
    component: 'SalesPage',
    featureId: 'sales',
    title: '销售管理',
    icon: 'sales',
    showInNav: true,
    order: 50,
  },
  {
    path: '/finance',
    component: 'FinancePage',
    featureId: 'finance',
    title: '财务管理',
    icon: 'finance',
    showInNav: true,
    order: 60,
  },
  {
    path: '/supply-chain',
    component: 'SupplyChainPage',
    featureId: 'inventory',
    title: '供应链管理',
    icon: 'supply',
    showInNav: true,
    order: 35,
  },

  // ==================== 分析报表页面 ====================
  
  {
    path: '/analytics',
    component: 'AnalyticsPage',
    featureId: 'finance',
    title: '经营分析',
    icon: 'analytics',
    showInNav: true,
    order: 70,
  },
  {
    path: '/data-center',
    component: 'DataCenterPage',
    featureId: 'finance',
    title: '数据中心',
    icon: 'data',
    showInNav: true,
    order: 71,
  },
  {
    path: '/cash-flow',
    component: 'CashFlowPage',
    featureId: 'finance',
    title: '现金流',
    icon: 'cash',
    showInNav: true,
    order: 72,
  },
  {
    path: '/profit-loss',
    component: 'ProfitLossPage',
    featureId: 'finance',
    title: '损益表',
    icon: 'profit',
    showInNav: true,
    order: 73,
  },

  // ==================== AI 页面 ====================
  
  {
    path: '/ai-demo',
    component: 'AIDemoPage',
    featureId: 'common',
    title: 'AI 助手演示',
    icon: 'ai',
    showInNav: false,
    order: 80,
  },
  {
    path: '/ai-knowledge',
    component: 'AIKnowledgePage',
    featureId: 'common',
    title: 'AI 知识库',
    icon: 'knowledge',
    showInNav: true,
    order: 81,
  },
  {
    path: '/ai-sales-order',
    component: 'AISalesOrderPage',
    featureId: 'sales',
    title: 'AI 销售订单',
    icon: 'ai-sales',
    showInNav: false,
    order: 82,
  },
  {
    path: '/chat',
    component: 'ChatPage',
    featureId: 'common',
    title: '智能对话',
    icon: 'chat',
    showInNav: true,
    order: 83,
  },
  {
    path: '/customer-service',
    component: 'CustomerServicePage',
    featureId: 'common',
    title: '智能客服',
    icon: 'service',
    showInNav: true,
    order: 84,
  },
  {
    path: '/knowledge-base',
    component: 'KnowledgeBasePage',
    featureId: 'common',
    title: '知识库',
    icon: 'kb',
    showInNav: true,
    order: 85,
  },
  {
    path: '/qa-library',
    component: 'QALibraryPage',
    featureId: 'common',
    title: '问答库',
    icon: 'qa',
    showInNav: true,
    order: 86,
  },
  {
    path: '/faq',
    component: 'FAQManagementPage',
    featureId: 'common',
    title: 'FAQ 管理',
    icon: 'faq',
    showInNav: false,
    order: 87,
  },
  {
    path: '/unrecognized-commands',
    component: 'UnrecognizedCommandsPage',
    featureId: 'common',
    title: '未识别命令',
    icon: 'command',
    showInNav: false,
    order: 88,
  },

  // ==================== Agent 页面 ====================
  
  {
    path: '/agent',
    component: 'AgentPage',
    featureId: 'agent',
    title: 'Agent 管理',
    icon: 'agent',
    showInNav: true,
    order: 90,
  },
  {
    path: '/agent-manager',
    component: 'AgentManagerPage',
    featureId: 'agent',
    title: 'Agent 商店',
    icon: 'market',
    showInNav: true,
    order: 91,
  },
  {
    path: '/finance-agent',
    component: 'FinanceAgentPage',
    featureId: 'finance_agent',
    title: '财务 Agent',
    icon: 'finance-agent',
    showInNav: true,
    order: 92,
  },

  // ==================== 其他页面 ====================
  
  {
    path: '/media-library',
    component: 'MediaLibraryPage',
    featureId: 'common',
    title: '媒体库',
    icon: 'media',
    showInNav: true,
    order: 95,
  },
  {
    path: '/user-management',
    component: 'UserManagementPage',
    featureId: 'common',
    title: '用户管理',
    icon: 'users',
    showInNav: true,
    order: 96,
  },
  {
    path: '/cloud-store',
    component: 'CloudStorePage',
    featureId: 'cloud_backup',
    title: '云端备份',
    icon: 'cloud',
    showInNav: true,
    order: 97,
  },
  {
    path: '/database-test',
    component: 'DatabaseTestPage',
    featureId: 'common',
    title: '数据库测试',
    icon: 'database',
    showInNav: false,
    order: 200,
  },
  {
    path: '/test',
    component: 'TestPage',
    featureId: 'common',
    title: '测试页面',
    icon: 'test',
    showInNav: false,
    order: 201,
  },
];

/**
 * 获取按功能分组的页面列表
 */
export function getPagesByFeature(featureId: PageFeatureId): PageRoute[] {
  return PAGE_ROUTES.filter(p => p.featureId === featureId);
}

/**
 * 获取导航菜单页面
 */
export function getNavPages(): PageRoute[] {
  return PAGE_ROUTES
    .filter(p => p.showInNav)
    .sort((a, b) => a.order - b.order);
}

/**
 * 获取路由映射
 */
export function getRouteMap(): Map<string, PageRoute> {
  return new Map(PAGE_ROUTES.map(p => [p.path, p]));
}

/**
 * 路由权限配置
 */
export const ROUTE_PERMISSIONS = {
  // 管理员可见路由
  admin: ['/settings', '/user-center', '/user-management', '/database-test'],
  
  // Plus 版专属路由
  plus: [
    '/inventory', '/purchase', '/sales', '/finance',
    '/analytics', '/data-center', '/cash-flow', '/profit-loss',
    '/supply-chain'
  ],
  
  // 需要认证的路由
  auth: [
    '/', '/settings', '/user-center', '/products', '/contacts',
    '/inventory', '/purchase', '/sales', '/finance',
    '/teams', '/chat', '/customer-service', '/agent'
  ],
} as const;
