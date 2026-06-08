/**
 * 路由守卫组件
 * 
 * 基于功能版本控制路由访问
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { FeatureGate } from '../FeatureGate/FeatureGate';
import type { FeatureId } from '../FeatureGate/FeatureGate';
import { useAppModeStore } from '../../config/appMode';

/**
 * 路由守卫专用功能 ID 类型
 * 扩展了 FeatureGate 的 FeatureId
 */
type RouteFeatureId = 
  | FeatureId
  | 'product'
  | 'common'
  | 'secretary'
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
 * 路由到功能 ID 的映射
 */
const ROUTE_TO_FEATURE_MAP: Record<string, RouteFeatureId> = {
  '/': 'common',
  '/dashboard': 'product',
  '/products': 'product',
  '/contacts': 'team',
  '/calls': 'team',
  '/messages': 'team',
  '/inventory': 'inventory',
  '/purchase': 'purchase',
  '/sales': 'sales',
  '/finance': 'finance',
  '/supply-chain': 'inventory',
  '/supplychain': 'inventory',
  '/analytics': 'finance',
  '/data-center': 'finance',
  '/datacenter': 'finance',
  '/cash-flow': 'finance',
  '/profit-loss': 'finance',
  '/ai-knowledge': 'common',
  '/ai-sales-order': 'sales',
  '/chat': 'common',
  '/customer-service': 'common',
  '/knowledge-base': 'common',
  '/qa-library': 'common',
  '/faq': 'common',
  '/agent': 'agent',
  '/agent-manager': 'agent_market',
  '/finance-agent': 'finance_agent',
  '/media-library': 'common',
  '/user-management': 'common',
  '/cloud-store': 'cloud_backup',
  '/cloud-backup': 'cloud_backup',
  '/teams': 'team',
  // 行业插件路由
  '/pos': 'catering',
  '/tables': 'catering',
  '/kitchen': 'catering',
  '/appointments': 'beauty',
  '/services': 'beauty',
  '/employees': 'beauty',
  '/marketing': 'beauty',
  '/pet-profiles': 'pet',
  '/boarding': 'pet',
  '/grooming': 'pet',
  '/convenience-pos': 'cv',
  '/daily-settlement': 'cv',
  '/credit-ledger': 'lw',
  '/batch-manage': 'lw',
  '/quotations': 'pa',
  '/device-models': 'pa',
  '/delivery': 'ff',
  '/recurring-order': 'ff',
  '/vehicle-db': 'ap',
  '/oe-search': 'ap',
  '/hw-credit-ledger': 'hw',
  '/cutting-calc': 'hw',
  '/projects': 'dm',
  '/material-bom': 'dm',
  '/group-buy': 'gb',
  '/pickup-verify': 'gb',
};

/**
 * 获取路由对应的功能 ID
 */
export function getRouteFeatureId(path: string): RouteFeatureId {
  return ROUTE_TO_FEATURE_MAP[path] || 'common';
}

/**
 * 路由守卫组件属性
 */
interface RouteGuardProps {
  children: React.ReactNode;
  /** 路由路径 */
  path?: string;
  /** 需要的功能 ID（可选，默认从路径推断） */
  featureId?: FeatureId;
  /** 未授权时的重定向路径 */
  fallbackPath?: string;
}

/**
 * 路由守卫组件
 * 
 * 根据功能版本控制路由访问权限
 * 如果用户当前版本不支持该功能，则重定向到 fallbackPath
 */
export function RouteGuard({
  children,
  path: _path, // 未使用但保留接口兼容性
  featureId,
  fallbackPath = '/',
}: RouteGuardProps) {
  const location = useLocation();
  const mode = useAppModeStore((state) => state.mode); // eslint-disable-line @typescript-eslint/no-unused-vars
  void mode; // 保留以供将来使用
  
  // 获取功能 ID
  const targetFeatureId = featureId || getRouteFeatureId(location.pathname);
  
  // 如果没有对应的功能或者是通用功能，返回 children
  if (targetFeatureId === 'common' || targetFeatureId === 'product' || targetFeatureId === 'secretary') {
    return <>{children}</>;
  }
  
  // 行业插件功能暂不处理
  const industryFeatures: RouteFeatureId[] = ['catering', 'beauty', 'pet', 'cv', 'lw', 'pa', 'ff', 'ap', 'hw', 'dm', 'gb'];
  if (industryFeatures.includes(targetFeatureId)) {
    return <>{children}</>;
  }
  
  return (
    <FeatureGate
      feature={targetFeatureId as FeatureId}
      showDisabledMessage={false}
      fallback={
        <Navigate
          to={fallbackPath}
          replace
          state={{ from: location.pathname }}
        />
      }
    >
      {children}
    </FeatureGate>
  );
}

/**
 * 创建带路由守卫的页面组件
 */
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  featureId: FeatureId,
  fallbackPath?: string
) {
  return function GuardedComponent(props: P) {
    return (
      <RouteGuard featureId={featureId} fallbackPath={fallbackPath}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}

/**
 * 使用版本提示的组件
 */
interface VersionAwareRouteProps {
  children: React.ReactNode;
  featureId: FeatureId;
  message?: string;
}

/**
 * 版本感知路由组件
 * 
 * 在功能不可用时显示版本提示，而不是直接重定向
 */
export function VersionAwareRoute({
  children,
  featureId,
  message,
}: VersionAwareRouteProps) {
  const mode = useAppModeStore((state) => state.mode);
  
  const defaultMessage = mode === 'light'
    ? `此功能需要 ${getEditionName(featureId)} 版本`
    : undefined;
  
  return (
    <FeatureGate
      feature={featureId}
      showDisabledMessage={true}
      disabledMessage={message || defaultMessage}
    >
      {children}
    </FeatureGate>
  );
}

/**
 * 获取功能对应的版本名称
 */
function getEditionName(featureId: FeatureId): string {
  const editionMap: Record<string, string> = {
    // Plus 版功能
    purchase: 'Plus',
    sales: 'Plus',
    inventory: 'Plus',
    finance: 'Plus',
    finance_agent: 'Plus',
    
    // 行业插件
    catering: '行业插件',
    beauty: '行业插件',
    pet: '行业插件',
    cv: '行业插件',
    lw: '行业插件',
    pa: '行业插件',
    ff: '行业插件',
    ap: '行业插件',
    hw: '行业插件',
    dm: '行业插件',
    gb: '行业插件',
    
    // Agent
    agent: '虚拟公司版',
    agent_market: '虚拟公司版',
    
    // Cloud
    cloud_backup: 'Cloud 版',
    nvwax: 'Cloud 版',
  };
  
  return editionMap[featureId] || 'ProClaw';
}

/**
 * 导出路由守卫 Hook
 */
export function useRouteGuard() {
  const mode = useAppModeStore((state) => state.mode);
  
  return {
    /**
     * 检查路由是否可用
     */
    isRouteAvailable: (path: string): boolean => {
      const featureId = getRouteFeatureId(path);
      if (featureId === 'common') return true;
      
      // 根据模式检查功能可用性
      if (mode === 'light') {
        return ['common', 'product', 'team', 'agent', 'secretary'].includes(featureId);
      }
      
      // inventory 模式支持所有功能
      return true;
    },
    
    /**
     * 获取当前版本的模式
     */
    mode,
    
    /**
     * 是否为 Plus 版本
     */
    isPlus: mode === 'inventory',
    
    /**
     * 是否为 Light 版本
     */
    isLight: mode === 'light',
  };
}
