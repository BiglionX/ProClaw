/**
 * FeatureGate 组件测试
 * 
 * 使用 Vitest 运行测试
 */

import { describe, it, expect } from 'vitest';
import { getFeatureConfig, getAllFeatures } from './FeatureGate';

describe('FeatureGate 基础功能测试', () => {
  describe('getFeatureConfig', () => {
    it('应返回进销存功能的配置', () => {
      const config = getFeatureConfig('purchase');
      expect(config).toBeDefined();
      expect(config.description).toContain('采购');
    });

    it('应返回 Agent 市场的配置', () => {
      const config = getFeatureConfig('agent_market');
      expect(config).toBeDefined();
      expect(config.description).toContain('Agent');
    });
  });

  describe('getAllFeatures', () => {
    it('应返回所有功能列表', () => {
      const features = getAllFeatures();
      expect(features.length).toBeGreaterThan(0);
      
      // 检查所有功能都有正确的配置
      features.forEach(feature => {
        expect(feature.config).toBeDefined();
        expect(feature.config.description).toBeDefined();
      });
    });
  });

  describe('FEATURE_CONFIG 完整性检查', () => {
    it('所有功能配置都应有 light 和 plus 属性', () => {
      const features = getAllFeatures();
      features.forEach(feature => {
        expect(typeof feature.config.light).toBe('boolean');
        expect(typeof feature.config.plus).toBe('boolean');
      });
    });

    it('进销存功能在 Plus 模式下应为 true', () => {
      const purchaseConfig = getFeatureConfig('purchase');
      const salesConfig = getFeatureConfig('sales');
      const inventoryConfig = getFeatureConfig('inventory');
      const financeConfig = getFeatureConfig('finance');

      expect(purchaseConfig.plus).toBe(true);
      expect(salesConfig.plus).toBe(true);
      expect(inventoryConfig.plus).toBe(true);
      expect(financeConfig.plus).toBe(true);
    });

    it('进销存功能在 Light 模式下应为 false', () => {
      const purchaseConfig = getFeatureConfig('purchase');
      const salesConfig = getFeatureConfig('sales');
      const inventoryConfig = getFeatureConfig('inventory');
      const financeConfig = getFeatureConfig('finance');

      expect(purchaseConfig.light).toBe(false);
      expect(salesConfig.light).toBe(false);
      expect(inventoryConfig.light).toBe(false);
      expect(financeConfig.light).toBe(false);
    });
  });

  describe('导航功能检查', () => {
    it('应定义导航相关功能', () => {
      const navPurchase = getFeatureConfig('nav_purchase');
      const navSales = getFeatureConfig('nav_sales');
      const navFinance = getFeatureConfig('nav_finance');

      expect(navPurchase).toBeDefined();
      expect(navSales).toBeDefined();
      expect(navFinance).toBeDefined();
    });
  });
});
