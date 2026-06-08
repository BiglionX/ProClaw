/**
 * 服务层目录结构
 * 
 * 目录组织：
 * - services/           # 根目录（兼容性）
 *   - _core/           # 核心服务（所有版本）
 *   - _plus/           # Plus 版本服务（进销存）
 * 
 * 命名规范：
 * - 核心服务：直接放在 services/ 下
 * - Plus 服务：放在 services/_plus/ 下
 * 
 * 使用方式：
 * // 核心服务（Light 和 Plus 都可用）
 * import { ProductService } from '../services/ProductService';
 * 
 * // Plus 服务（仅 Plus 版本）
 * import { PurchaseService } from '../services/_plus/PurchaseService';
 * 
 * 条件导入示例：
 * import { isPlusMode } from '../components/FeatureGate';
 * const PurchaseService = isPlusMode() 
 *   ? await import('../services/_plus/PurchaseService')
 *   : null;
 */

// ==================== 核心服务（所有版本） ====================

// 现有服务
export { default as CallManager } from './CallManager';
export { default as WebSocketService } from './WebSocketService';

// ==================== Plus 版本服务（进销存） ====================

// Plus 服务将在 Sprint 2 创建
// 当前为占位符，实际实现时取消注释
// export { PurchaseService } from './_plus/PurchaseService';
// export { SalesService } from './_plus/SalesService';
// export { InventoryService } from './_plus/InventoryService';
// export { FinanceService } from './_plus/FinanceService';

// ==================== 服务工厂函数 ====================

/**
 * 根据当前版本获取适用的服务
 */
export function getServices() {
  const isPlus = isPlusMode();
  
  return {
    // Plus 服务（仅 Plus 版本可用，暂未实现）
    purchase: isPlus ? null : null,
    sales: isPlus ? null : null,
    inventory: isPlus ? null : null,
    finance: isPlus ? null : null,
  };
}

/**
 * 导入 Plus 版本服务（动态导入）
 * 
 * @example
 * const service = await importPlusService('purchase');
 * if (service) {
 *   const orders = await service.getOrders();
 * }
 */
export async function importPlusService(service: 'purchase' | 'sales' | 'inventory' | 'finance') {
  if (!isPlusMode()) {
    console.warn(`[Services] ${service} is only available in Plus version`);
    return null;
  }
  
  try {
    switch (service) {
      case 'purchase': {
        // @ts-ignore - 服务将在 Sprint 2 实现
        return await import('./_plus/PurchaseService');
      }
      case 'sales': {
        // @ts-ignore - 服务将在 Sprint 2 实现
        return await import('./_plus/SalesService');
      }
      case 'inventory': {
        // @ts-ignore - 服务将在 Sprint 2 实现
        return await import('./_plus/InventoryService');
      }
      case 'finance': {
        // @ts-ignore - 服务将在 Sprint 2 实现
        return await import('./_plus/FinanceService');
      }
      default:
        return null;
    }
  } catch (error) {
    console.warn(`[Services] ${service} not yet implemented`);
    return null;
  }
}

// 辅助函数（从 FeatureGate 导入）
function isPlusMode(): boolean {
  // 避免循环导入，直接检查环境变量
  const mode = import.meta.env.VITE_BUILD_MODE;
  return mode === 'inventory' || mode === 'virtual_company';
}
