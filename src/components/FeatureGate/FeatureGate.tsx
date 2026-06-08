/**
 * FeatureGate - 功能开关组件
 * 
 * 统一管理 Light/Plus 版本的功能可见性
 * 
 * 使用方式：
 * <FeatureGate feature="purchase">
 *   <PurchasePage />
 * </FeatureGate>
 * 
 * 或使用 hook：
 * const { isEnabled } = useFeature('purchase');
 */
import { ReactNode } from 'react';
import { useAppModeStore, APP_MODE } from '../../config/appMode';

/**
 * 功能模块定义
 * 
 * Light 版本：仅基础 CRUD
 * Plus 版本：完整进销存 + 财务
 */
export type FeatureId = 
  // 进销存核心模块
  | 'purchase'           // 采购管理
  | 'sales'             // 销售管理
  | 'inventory'          // 库存管理
  | 'finance'           // 财务报表
  | 'reconciliation'    // 对账管理
  | 'purchase_return'    // 采购退货
  | 'sales_return'       // 销售退货
  // AI 团队模块
  | 'team'              // AI 团队
  | 'agent'             // Agent 管理
  | 'agent_market'       // Agent 市场
  | 'finance_agent'      // 财务管理 Agent
  // 云功能
  | 'cloud_backup'       // 云备份
  | 'nvwax'             // NvwaX API
  // 页面导航
  | 'nav_purchase'       // 导航：采购
  | 'nav_sales'         // 导航：销售
  | 'nav_finance'        // 导航：财务
  | 'nav_ai_team'       // 导航：AI 团队
  | 'nav_reports'       // 导航：报表
  | 'nav_settings'      // 导航：设置-高级
  // 高级功能
  | 'token_billing'     // Token 计费
  | 'plugin_management'  // 插件管理
  | 'multi_user'        // 多用户管理
  | 'approval_workflow'; // 审批工作流

/**
 * 功能模块配置
 */
const FEATURE_CONFIG: Record<FeatureId, { light: boolean; plus: boolean; description: string }> = {
  // ==================== 进销存核心模块 ====================
  purchase: {
    light: false,
    plus: true,
    description: '采购管理 - 创建采购订单、管理供应商'
  },
  sales: {
    light: false,
    plus: true,
    description: '销售管理 - 创建销售订单、管理客户'
  },
  inventory: {
    light: false,
    plus: true,
    description: '库存管理 - 库存查询、库存预警'
  },
  finance: {
    light: false,
    plus: true,
    description: '财务报表 - 损益表、现金流量表'
  },
  reconciliation: {
    light: false,
    plus: true,
    description: '对账管理 - 应收应付对账'
  },
  purchase_return: {
    light: false,
    plus: true,
    description: '采购退货 - 处理采购退货'
  },
  sales_return: {
    light: false,
    plus: true,
    description: '销售退货 - 处理销售退货'
  },

  // ==================== AI 团队模块 ====================
  team: {
    light: false,
    plus: true,
    description: 'AI 团队 - 创建和管理 AI 团队'
  },
  agent: {
    light: false,
    plus: true,
    description: 'Agent 管理 - 安装和配置 Agent'
  },
  agent_market: {
    light: false,
    plus: true,
    description: 'Agent 市场 - 浏览和下载 Agent'
  },
  finance_agent: {
    light: false,
    plus: true,
    description: '财务管理 Agent - 智能财务分析'
  },

  // ==================== 云功能 ====================
  cloud_backup: {
    light: false,
    plus: true,
    description: '云备份 - 自动备份和恢复数据'
  },
  nvwax: {
    light: false,
    plus: true,
    description: 'NvwaX API - AI 能力集成'
  },

  // ==================== 页面导航 ====================
  nav_purchase: {
    light: false,
    plus: true,
    description: '导航：采购管理入口'
  },
  nav_sales: {
    light: false,
    plus: true,
    description: '导航：销售管理入口'
  },
  nav_finance: {
    light: false,
    plus: true,
    description: '导航：财务报表入口'
  },
  nav_ai_team: {
    light: false,
    plus: true,
    description: '导航：AI 团队入口'
  },
  nav_reports: {
    light: false,
    plus: true,
    description: '导航：报表中心入口'
  },
  nav_settings: {
    light: false,
    plus: true,
    description: '导航：高级设置入口'
  },

  // ==================== 高级功能 ====================
  token_billing: {
    light: true,
    plus: true,
    description: 'Token 计费 - 查看用量和账单'
  },
  plugin_management: {
    light: true,
    plus: true,
    description: '插件管理 - 安装和管理插件'
  },
  multi_user: {
    light: true,
    plus: true,
    description: '多用户管理 - 用户和权限管理'
  },
  approval_workflow: {
    light: false,
    plus: true,
    description: '审批工作流 - 设置审批规则'
  },
};

/**
 * 判断是否为 Plus 版本
 */
export function isPlusMode(): boolean {
  return APP_MODE === 'inventory' || APP_MODE === 'virtual_company';
}

/**
 * 判断当前模式是否启用指定功能
 */
export function isFeatureEnabled(feature: FeatureId): boolean {
  const config = FEATURE_CONFIG[feature];
  if (!config) {
    console.warn(`[FeatureGate] Unknown feature: ${feature}`);
    return false;
  }

  if (isPlusMode()) {
    return config.plus;
  }
 
  return config.light;
}

/**
 * 获取功能配置
 */
export function getFeatureConfig(feature: FeatureId) {
  return FEATURE_CONFIG[feature];
}

/**
 * 获取所有可用功能列表
 */
export function getAllFeatures(): Array<{ id: FeatureId; config: typeof FEATURE_CONFIG[FeatureId] }> {
  return Object.entries(FEATURE_CONFIG).map(([id, config]) => ({
    id: id as FeatureId,
    config,
  }));
}

/**
 * 获取当前版本已启用的功能列表
 */
export function getEnabledFeatures(): FeatureId[] {
  return Object.entries(FEATURE_CONFIG)
    .filter(([id]) => isFeatureEnabled(id as FeatureId))
    .map(([id]) => id as FeatureId);
}

// ============================================================
// React 组件
// ============================================================

interface FeatureGateProps {
  /** 要控制的功能模块 */
  feature: FeatureId;
  /** 功能启用时显示的内容 */
  children: ReactNode;
  /** 功能禁用时显示的替代内容（可选） */
  fallback?: ReactNode;
  /** 是否在禁用时显示提示（默认 true） */
  showDisabledMessage?: boolean;
  /** 自定义禁用消息 */
  disabledMessage?: string;
}

/**
 * 功能开关组件
 * 
 * @example
 * <FeatureGate feature="purchase">
 *   <PurchasePage />
 * </FeatureGate>
 * 
 * @example 带 fallback
 * <FeatureGate feature="purchase" fallback={<UpgradePrompt />}>
 *   <PurchasePage />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  showDisabledMessage = false,
  disabledMessage
}: FeatureGateProps) {
  const enabled = isFeatureEnabled(feature);

  if (enabled) {
    return <>{children}</>;
  }

  if (showDisabledMessage) {
    const config = getFeatureConfig(feature);
    return (
      <div className="p-4 text-gray-500 text-sm">
        {disabledMessage || `此功能仅在 Plus 版本可用：${config?.description || feature}`}
      </div>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
}

/**
 * 功能开关 Hook
 * 
 * @example
 * function MyComponent() {
 *   const { isEnabled, features, isPlus } = useFeature();
 *   
 *   if (isEnabled('purchase')) {
 *     return <PurchasePage />;
 *   }
 *   
 *   return <BasicPage />;
 * }
 */
export function useFeature() {
  const mode = useAppModeStore((state: { mode: string }) => state.mode);
 
  /**
   * 检查指定功能是否启用
   */
  function isEnabled(feature: FeatureId): boolean {
    return isFeatureEnabled(feature);
  }

  /**
   * 获取当前模式
   */
  const isPlus = mode === 'inventory' || mode === 'virtual_company';
  const isLight = mode === 'light';

  /**
   * 获取已启用的功能列表
   */
  const enabledFeatures = getEnabledFeatures();

  return {
    /** 检查指定功能是否启用 */
    isEnabled,
    /** 获取已启用的功能列表 */
    enabledFeatures,
    /** 当前是否为 Plus 版本 */
    isPlus,
    /** 当前是否为 Light 版本 */
    isLight,
    /** 当前模式 */
    mode,
    /** 版本名称 */
    editionName: isPlus ? 'Plus' : 'Light',
    /** 版本描述 */
    editionDescription: isPlus 
      ? '完整进销存管理' 
      : '服务行业版',
  };
}

/**
 * 高阶组件：包装需要版本检查的组件
 * 
 * @example
 * const ProtectedPurchasePage = withFeature('purchase')(PurchasePage);
 */
export function withFeature<T extends object>(
  feature: FeatureId
) {
  return function ComponentWithFeatureGate(WrappedComponent: React.ComponentType<T>) {
    return function FeatureGateWrapper(props: T) {
      const enabled = isFeatureEnabled(feature);
     
      if (!enabled) {
        return (
          <div className="p-4 text-gray-500 text-sm">
            此功能仅在 Plus 版本可用
          </div>
        );
      }
     
      return <WrappedComponent {...props} />;
    };
  };
}

/**
 * 获取模块升级提示组件
 */
export function UpgradePrompt() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-4xl mb-4">🔒</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        功能受限于当前版本
      </h3>
      <p className="text-gray-500 mb-4">
        此功能仅在 ProClaw Plus 版本中可用
      </p>
      <div className="text-sm text-gray-400">
        升级到 Plus 版本，解锁完整进销存管理能力
      </div>
    </div>
  );
}

export default FeatureGate;
