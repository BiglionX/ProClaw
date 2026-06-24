/**
 * cloudStoreService 单元测试
 * 覆盖全部 17 个异步 API 函数 + 4 个工具函数 + PLAN_INFO 常量
 *
 * Mock 策略：全局 setup.ts 已将 isTauri mock 为 true，safeInvoke mock 为 vi.fn()
 * callBackend 在 Tauri 模式下调用 safeInvoke，若返回 null 则抛异常
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { safeInvoke } from './tauri';
import {
  getCloudStore,
  createCloudStore,
  updateCloudStore,
  resetApiKey,
  getSyncableProducts,
  syncAllProducts,
  syncIncremental,
  toggleProductVisible,
  batchToggleProducts,
  getSyncLogs,
  getStoreTheme,
  updateStoreTheme,
  generateThemeWithAI,
  getStoreOrders,
  getStoreOrder,
  markOrderShipped,
  getStoreStats,
  PLAN_INFO,
  getStoreUrl,
  formatPrice,
  getOrderStatusLabel,
  getOrderStatusColor,
  type CloudStore,
  type StoreTheme,
  type CloudSyncLog,
  type StoreOrder,
  type StoreStats,
} from './cloudStoreService';

vi.mock('@tauri-apps/api/core');

// ========== Mock 数据 ==========

const MOCK_STORE: CloudStore = {
  id: 'store-001',
  user_id: 'user-001',
  subdomain: 'iphone-battery-pro',
  api_key: 'sk-proclaw-test123',
  status: 'active',
  plan_type: 'free',
  created_at: '2026-01-01T00:00:00Z',
};

const MOCK_THEME: StoreTheme = {
  store_id: 'store-001',
  primary_color: '#6366f1',
  secondary_color: '#ec4899',
  layout_style: 'card',
  font_family: 'system-ui',
  banner_images: [],
  theme_data: {},
  updated_at: '2026-01-01T00:00:00Z',
};

const MOCK_SYNC_LOG: CloudSyncLog = {
  id: 'log-001',
  sync_type: 'full',
  status: 'success',
  message: '已同步 20 个商品到云端',
  created_at: '2026-01-01T00:00:00Z',
};

const MOCK_ORDER: StoreOrder = {
  id: 'order-001',
  store_id: 'store-001',
  order_no: 'ORD-2026-001',
  customer_name: '张三',
  customer_phone: '13800138000',
  customer_address: '北京市朝阳区',
  total_amount: 199.0,
  status: 'paid',
  payment_method: 'wechat',
  items: [{ product_id: 'spu_001', product_name: 'iPhone 15 Pro Max 电池', quantity: 1, price: 199 }],
  callback_status: 'success',
  created_at: '2026-01-15T00:00:00Z',
};

const MOCK_STATS: StoreStats = {
  total_visits: 1286,
  total_orders: 47,
  total_revenue: 12580.5,
  hot_products: [
    { name: 'iPhone 15 Pro Max 电池', sales: 23 },
    { name: 'iPhone 14 Pro Max 电池', sales: 15 },
  ],
};

const MOCK_PRODUCTS = Array.from({ length: 20 }, (_, i) => ({
  id: `spu-${i + 1}`,
  spu_code: `SPU-${String(i + 1).padStart(3, '0')}`,
  name: `iPhone ${15 - Math.floor(i / 4)} 电池 型号${i + 1}`,
  unit: '块',
  is_on_sale: true,
  is_featured: i < 3,
  sort_order: i + 1,
  status: 'on_sale',
  skus: [{ id: `sku-${i + 1}`, sell_price: 100 + i * 10, current_stock: 50 }],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}));

// ========== 测试 ==========

describe('cloudStoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- 套件 1: getCloudStore ----------
  describe('getCloudStore', () => {
    it('应成功获取已开通的商城信息', async () => {
      (safeInvoke as any).mockResolvedValue(MOCK_STORE);
      const result = await getCloudStore();
      expect(result).toEqual(MOCK_STORE);
      expect(safeInvoke).toHaveBeenCalledWith('get_cloud_store', undefined);
    });

    it('后端返回 null 时应返回 null', async () => {
      (safeInvoke as any).mockResolvedValue(null);
      const result = await getCloudStore();
      expect(result).toBeNull();
    });

    it('网络错误时应抛出异常', async () => {
      (safeInvoke as any).mockRejectedValue(new Error('network error'));
      await expect(getCloudStore()).rejects.toThrow('network error');
    });
  });

  // ---------- 套件 2: createCloudStore ----------
  describe('createCloudStore', () => {
    it('应使用免费套餐成功创建商城', async () => {
      (safeInvoke as any).mockResolvedValue(MOCK_STORE);
      const result = await createCloudStore('free', 'iphone-battery-pro');
      expect(result).toEqual(MOCK_STORE);
      expect(safeInvoke).toHaveBeenCalledWith('create_cloud_store', {
        planType: 'free',
        subdomain: 'iphone-battery-pro',
      });
    });

    it('应使用基础套餐创建商城', async () => {
      (safeInvoke as any).mockResolvedValue({ ...MOCK_STORE, plan_type: 'basic' });
      const result = await createCloudStore('basic', 'my-store');
      expect(result.plan_type).toBe('basic');
      expect(safeInvoke).toHaveBeenCalledWith('create_cloud_store', {
        planType: 'basic',
        subdomain: 'my-store',
      });
    });

    it('子域名为空时后端应拒绝', async () => {
      (safeInvoke as any).mockRejectedValue(new Error('子域名不能为空'));
      await expect(createCloudStore('free', '')).rejects.toThrow('子域名不能为空');
    });

    it('子域名已被占用时应抛出错误', async () => {
      (safeInvoke as any).mockRejectedValue(new Error('子域名已被占用'));
      await expect(createCloudStore('free', 'taken-name')).rejects.toThrow('子域名已被占用');
    });
  });

  // ---------- 套件 3: updateCloudStore ----------
  describe('updateCloudStore', () => {
    it('应成功更新商城配置', async () => {
      const updated = { ...MOCK_STORE, custom_domain: 'shop.example.com' };
      (safeInvoke as any).mockResolvedValue(updated);
      const result = await updateCloudStore('store-001', { custom_domain: 'shop.example.com' });
      expect(result.custom_domain).toBe('shop.example.com');
      expect(safeInvoke).toHaveBeenCalledWith('update_cloud_store', {
        storeId: 'store-001',
        data: { custom_domain: 'shop.example.com' },
      });
    });

    it('更新失败时应抛出错误', async () => {
      (safeInvoke as any).mockRejectedValue(new Error('update failed'));
      await expect(updateCloudStore('store-001', {})).rejects.toThrow('update failed');
    });
  });

  // ---------- 套件 4: resetApiKey ----------
  describe('resetApiKey', () => {
    it('应成功重置并返回新 API Key', async () => {
      (safeInvoke as any).mockResolvedValue({ api_key: 'sk-new-key-456' });
      const result = await resetApiKey('store-001');
      expect(result.api_key).toBe('sk-new-key-456');
      expect(safeInvoke).toHaveBeenCalledWith('reset_store_api_key', { storeId: 'store-001' });
    });

    it('无效 storeId 时应抛出错误', async () => {
      (safeInvoke as any).mockRejectedValue(new Error('store not found'));
      await expect(resetApiKey('invalid-id')).rejects.toThrow('store not found');
    });
  });

  // ---------- 套件 5: getSyncableProducts ----------
  describe('getSyncableProducts', () => {
    it('应返回商品列表', async () => {
      (safeInvoke as any).mockResolvedValue(MOCK_PRODUCTS);
      const result = await getSyncableProducts();
      expect(result).toHaveLength(20);
      expect(result[0].name).toContain('iPhone');
    });

    it('无商品时应返回空数组', async () => {
      (safeInvoke as any).mockResolvedValue([]);
      const result = await getSyncableProducts();
      expect(result).toEqual([]);
    });
  });

  // ---------- 套件 6: syncAllProducts ----------
  describe('syncAllProducts', () => {
    it('应成功全量同步并返回 CloudSyncLog', async () => {
      (safeInvoke as any).mockResolvedValue(MOCK_SYNC_LOG);
      const result = await syncAllProducts('store-001');
      expect(result.sync_type).toBe('full');
      expect(result.status).toBe('success');
    });

    it('验证 safeInvoke 传入正确 storeId', async () => {
      (safeInvoke as any).mockResolvedValue(MOCK_SYNC_LOG);
      await syncAllProducts('test-id');
      expect(safeInvoke).toHaveBeenCalledWith('sync_all_products_to_cloud', { storeId: 'test-id' });
    });

    it('同步失败时应抛出错误', async () => {
      (safeInvoke as any).mockRejectedValue(new Error('sync failed'));
      await expect(syncAllProducts('store-001')).rejects.toThrow('sync failed');
    });
  });

  // ---------- 套件 7: syncIncremental ----------
  describe('syncIncremental', () => {
    it('应成功增量同步', async () => {
      const log = { ...MOCK_SYNC_LOG, sync_type: 'incremental' as const };
      (safeInvoke as any).mockResolvedValue(log);
      const result = await syncIncremental('store-001');
      expect(result.sync_type).toBe('incremental');
    });

    it('无变更时也应返回成功日志', async () => {
      const log = { ...MOCK_SYNC_LOG, sync_type: 'incremental' as const, message: '增量同步完成，无变更商品' };
      (safeInvoke as any).mockResolvedValue(log);
      const result = await syncIncremental('store-001');
      expect(result.status).toBe('success');
      expect(result.message).toContain('无变更');
    });
  });

  // ---------- 套件 8: toggleProductVisible ----------
  describe('toggleProductVisible', () => {
    it('应成功上架商品', async () => {
      (safeInvoke as any).mockResolvedValue(undefined);
      await toggleProductVisible('spu-001', true);
      expect(safeInvoke).toHaveBeenCalledWith('toggle_product_cloud_visible', {
        spuId: 'spu-001',
        isVisible: true,
      });
    });

    it('应成功下架商品', async () => {
      (safeInvoke as any).mockResolvedValue(undefined);
      await toggleProductVisible('spu-001', false);
      expect(safeInvoke).toHaveBeenCalledWith('toggle_product_cloud_visible', {
        spuId: 'spu-001',
        isVisible: false,
      });
    });

    it('无效 spuId 时应抛出错误', async () => {
      (safeInvoke as any).mockRejectedValue(new Error('product not found'));
      await expect(toggleProductVisible('invalid', true)).rejects.toThrow('product not found');
    });
  });

  // ---------- 套件 9: batchToggleProducts ----------
  describe('batchToggleProducts', () => {
    it('应批量上架多个商品', async () => {
      (safeInvoke as any).mockResolvedValue(undefined);
      await batchToggleProducts(['spu-001', 'spu-002', 'spu-003'], true);
      expect(safeInvoke).toHaveBeenCalledWith('batch_toggle_products_visible', {
        spuIds: ['spu-001', 'spu-002', 'spu-003'],
        isVisible: true,
      });
    });

    it('空数组时应正常调用不抛异常', async () => {
      (safeInvoke as any).mockResolvedValue(undefined);
      await expect(batchToggleProducts([], true)).resolves.toBeUndefined();
    });
  });

  // ---------- 套件 10: getSyncLogs ----------
  describe('getSyncLogs', () => {
    it('默认 limit=20', async () => {
      (safeInvoke as any).mockResolvedValue([]);
      await getSyncLogs();
      expect(safeInvoke).toHaveBeenCalledWith('get_cloud_sync_logs', { limit: 20 });
    });

    it('自定义 limit 应生效', async () => {
      (safeInvoke as any).mockResolvedValue([]);
      await getSyncLogs(5);
      expect(safeInvoke).toHaveBeenCalledWith('get_cloud_sync_logs', { limit: 5 });
    });
  });

  // ---------- 套件 11: getStoreTheme ----------
  describe('getStoreTheme', () => {
    it('应返回完整主题配置', async () => {
      (safeInvoke as any).mockResolvedValue(MOCK_THEME);
      const result = await getStoreTheme('store-001');
      expect(result.primary_color).toBe('#6366f1');
      expect(result.layout_style).toBe('card');
      expect(result.font_family).toBe('system-ui');
    });

    it('后端返回 null 时应抛出异常', async () => {
      (safeInvoke as any).mockResolvedValue(null);
      await expect(getStoreTheme('store-001')).rejects.toThrow('Command "get_store_theme" returned null');
    });
  });

  // ---------- 套件 12: updateStoreTheme ----------
  describe('updateStoreTheme', () => {
    it('应部分更新主题字段', async () => {
      const updated = { ...MOCK_THEME, primary_color: '#ff0000' };
      (safeInvoke as any).mockResolvedValue(updated);
      const result = await updateStoreTheme('store-001', { primary_color: '#ff0000' });
      expect(result.primary_color).toBe('#ff0000');
      expect(safeInvoke).toHaveBeenCalledWith('update_store_theme', {
        storeId: 'store-001',
        theme: { primary_color: '#ff0000' },
      });
    });

    it('更新后应返回完整主题', async () => {
      (safeInvoke as any).mockResolvedValue(MOCK_THEME);
      const result = await updateStoreTheme('store-001', { layout_style: 'list' });
      expect(result.store_id).toBe('store-001');
      expect(result.banner_images).toBeDefined();
    });
  });

  // ---------- 套件 13: generateThemeWithAI ----------
  describe('generateThemeWithAI', () => {
    it('应传入 industry/categories/priceRange 参数', async () => {
      (safeInvoke as any).mockResolvedValue(MOCK_THEME);
      await generateThemeWithAI('store-001', '数码', ['手机配件', '电池'], '50-200');
      expect(safeInvoke).toHaveBeenCalledWith('generate_store_theme_ai', {
        storeId: 'store-001',
        industry: '数码',
        categories: ['手机配件', '电池'],
        priceRange: '50-200',
      });
    });

    it('应返回 AI 生成的主题配置', async () => {
      const aiTheme = { ...MOCK_THEME, primary_color: '#1890ff', font_family: 'PingFang SC' };
      (safeInvoke as any).mockResolvedValue(aiTheme);
      const result = await generateThemeWithAI('store-001', '数码', [], '100-500');
      expect(result.primary_color).toBe('#1890ff');
      expect(result.font_family).toBe('PingFang SC');
    });

    it('AI 服务不可用时应抛出错误', async () => {
      (safeInvoke as any).mockRejectedValue(new Error('AI service unavailable'));
      await expect(generateThemeWithAI('store-001', '数码', [], '100-500')).rejects.toThrow('AI service unavailable');
    });
  });

  // ---------- 套件 14: getStoreOrders ----------
  describe('getStoreOrders', () => {
    it('应返回订单列表', async () => {
      (safeInvoke as any).mockResolvedValue([MOCK_ORDER]);
      const result = await getStoreOrders('store-001');
      expect(result).toHaveLength(1);
      expect(result[0].order_no).toBe('ORD-2026-001');
    });

    it('按状态过滤应传递 status 参数', async () => {
      (safeInvoke as any).mockResolvedValue([MOCK_ORDER]);
      await getStoreOrders('store-001', 'paid');
      expect(safeInvoke).toHaveBeenCalledWith('get_store_orders', { storeId: 'store-001', status: 'paid' });
    });

    it('无订单时返回空数组', async () => {
      (safeInvoke as any).mockResolvedValue([]);
      const result = await getStoreOrders('store-001');
      expect(result).toEqual([]);
    });
  });

  // ---------- 套件 15: getStoreOrder ----------
  describe('getStoreOrder', () => {
    it('应返回完整订单详情含 items', async () => {
      (safeInvoke as any).mockResolvedValue(MOCK_ORDER);
      const result = await getStoreOrder('order-001');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].product_name).toContain('iPhone');
    });

    it('无效 orderId 应抛出错误', async () => {
      (safeInvoke as any).mockRejectedValue(new Error('order not found'));
      await expect(getStoreOrder('invalid')).rejects.toThrow('order not found');
    });
  });

  // ---------- 套件 16: markOrderShipped ----------
  describe('markOrderShipped', () => {
    it('应传入 orderId 和 trackingNo', async () => {
      (safeInvoke as any).mockResolvedValue(undefined);
      await markOrderShipped('order-001', 'SF123456');
      expect(safeInvoke).toHaveBeenCalledWith('mark_store_order_shipped', {
        orderId: 'order-001',
        trackingNo: 'SF123456',
      });
    });

    it('trackingNo 可选', async () => {
      (safeInvoke as any).mockResolvedValue(undefined);
      await markOrderShipped('order-001');
      expect(safeInvoke).toHaveBeenCalledWith('mark_store_order_shipped', {
        orderId: 'order-001',
        trackingNo: undefined,
      });
    });
  });

  // ---------- 套件 17: getStoreStats ----------
  describe('getStoreStats', () => {
    it('默认 days=7', async () => {
      (safeInvoke as any).mockResolvedValue(MOCK_STATS);
      await getStoreStats('store-001');
      expect(safeInvoke).toHaveBeenCalledWith('get_store_stats', { storeId: 'store-001', days: 7 });
    });

    it('自定义 days 应生效', async () => {
      (safeInvoke as any).mockResolvedValue(MOCK_STATS);
      await getStoreStats('store-001', 30);
      expect(safeInvoke).toHaveBeenCalledWith('get_store_stats', { storeId: 'store-001', days: 30 });
    });
  });

  // ---------- 套件 18: PLAN_INFO 常量 ----------
  describe('PLAN_INFO', () => {
    it('应包含 4 种套餐类型', () => {
      const keys = Object.keys(PLAN_INFO);
      expect(keys).toContain('free');
      expect(keys).toContain('basic');
      expect(keys).toContain('professional');
      expect(keys).toContain('enterprise');
      expect(keys).toHaveLength(4);
    });

    it('所有套餐 price/product_limit/order_limit 应为 0（Token 计费模式）', () => {
      for (const plan of Object.values(PLAN_INFO)) {
        expect(plan.price).toBe(0);
        expect(plan.product_limit).toBe(0);
        expect(plan.order_limit).toBe(0);
      }
    });

    it('免费套餐应包含赠送 Token 说明', () => {
      const freeFeatures = PLAN_INFO.free.features;
      expect(freeFeatures.some((f) => f.includes('50,000 PT'))).toBe(true);
    });
  });

  // ---------- 套件 19: getStoreUrl ----------
  describe('getStoreUrl', () => {
    it('无自定义域名时返回 proclaw.cc/shop/{subdomain} 路径', () => {
      const url = getStoreUrl({ ...MOCK_STORE, custom_domain: undefined });
      expect(url).toBe('https://proclaw.cc/shop/iphone-battery-pro');
    });

    it('有自定义域名时返回自定义域名', () => {
      const url = getStoreUrl({ ...MOCK_STORE, custom_domain: 'shop.example.com' });
      expect(url).toBe('https://shop.example.com');
    });

    it('应始终以 https:// 开头', () => {
      expect(getStoreUrl(MOCK_STORE).startsWith('https://')).toBe(true);
      expect(getStoreUrl({ ...MOCK_STORE, custom_domain: 'x.com' }).startsWith('https://')).toBe(true);
    });

    it('演示账号（subdomain=demo）应返回 /shop/demo 路径 URL', () => {
      const demoStore: CloudStore = { ...MOCK_STORE, subdomain: 'demo', custom_domain: undefined };
      const url = getStoreUrl(demoStore);
      expect(url).toBe('https://proclaw.cc/shop/demo');
      expect(url).not.toMatch(/^https:\/\/demo\./);
    });

    it('演示账号有 custom_domain 时优先使用 custom_domain', () => {
      const demoStore: CloudStore = {
        ...MOCK_STORE,
        subdomain: 'demo',
        custom_domain: 'demo-shop.example.com',
      };
      const url = getStoreUrl(demoStore);
      expect(url).toBe('https://demo-shop.example.com');
    });
  });

  // ---------- 套件 20: formatPrice ----------
  describe('formatPrice', () => {
    it('整数价格', () => {
      expect(formatPrice(199)).toBe('¥199.00');
    });

    it('带小数价格', () => {
      expect(formatPrice(99.5)).toBe('¥99.50');
    });

    it('零价格', () => {
      expect(formatPrice(0)).toBe('¥0.00');
    });

    it('大数值价格', () => {
      expect(formatPrice(12345.67)).toBe('¥12345.67');
    });
  });

  // ---------- 套件 21: getOrderStatusLabel ----------
  describe('getOrderStatusLabel', () => {
    it('应返回所有 5 种状态的正确中文标签', () => {
      expect(getOrderStatusLabel('pending')).toBe('待付款');
      expect(getOrderStatusLabel('paid')).toBe('已付款');
      expect(getOrderStatusLabel('shipped')).toBe('已发货');
      expect(getOrderStatusLabel('delivered')).toBe('已完成');
      expect(getOrderStatusLabel('cancelled')).toBe('已取消');
    });

    it('未知状态应返回原始值', () => {
      expect(getOrderStatusLabel('unknown' as any)).toBe('unknown');
    });
  });

  // ---------- 套件 22: getOrderStatusColor ----------
  describe('getOrderStatusColor', () => {
    it('应返回正确颜色映射', () => {
      expect(getOrderStatusColor('pending')).toBe('warning');
      expect(getOrderStatusColor('paid')).toBe('info');
      expect(getOrderStatusColor('shipped')).toBe('info');
      expect(getOrderStatusColor('delivered')).toBe('success');
      expect(getOrderStatusColor('cancelled')).toBe('error');
    });

    it('未知状态应返回 default', () => {
      expect(getOrderStatusColor('unknown' as any)).toBe('default');
    });
  });
});
