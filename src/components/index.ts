/**
 * 组件别名兼容层
 * 
 * 提供向后兼容的组件导出，确保旧代码可以继续工作
 */

import React from 'react';

// FeatureGate 组件别名
export { FeatureGate, useFeature, isPlusMode, isFeatureEnabled, getFeatureConfig, getAllFeatures, getEnabledFeatures, withFeature, UpgradePrompt } from './FeatureGate/FeatureGate';
export { default as FeatureGateDefault } from './FeatureGate/FeatureGate';
export type { FeatureId } from './FeatureGate/FeatureGate';

// 路由守卫组件别名
export { RouteGuard, VersionAwareRoute, withRouteGuard, useRouteGuard, getRouteFeatureId } from './RouteGuard/RouteGuard';

// 服务层配置
export { SERVICE_MAPPINGS, getServicesByFeature, getRequiredServices, getOptionalServices, SERVICE_EXPORTS } from '../services/config';
export type { ServiceMapping, ServiceFeatureId } from '../services/config';

// 页面路由配置
export { PAGE_ROUTES, getPagesByFeature, getNavPages, getRouteMap, ROUTE_PERMISSIONS } from '../pages/config';
export type { PageRoute, PageFeatureId } from '../pages/config';

/**
 * @deprecated 请使用 useFeature Hook
 * 
 * 简化的版本检查 Hook
 */
export function useVersionCheck() {
  const { isPlus, isLight, mode } = require('./FeatureGate/FeatureGate').useFeature();
  return { isPlus, isLight, mode };
}

/**
 * @deprecated 请使用 FeatureGate 组件
 * 
 * 简化的 Plus 版本功能包装器
 */
export function PlusFeatureGate({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isPlus } = require('./FeatureGate/FeatureGate').useFeature();
  if (isPlus) return React.createElement(React.Fragment, null, children);
  return React.createElement(React.Fragment, null, fallback);
}
