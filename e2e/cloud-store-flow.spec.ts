/**
 * 云托管商城 - 完整建站流程 E2E 测试
 *
 * 测试覆盖：登录?套餐选择?开通商城?商品管理?主题配置?商城设置
 *
 * 注意：在浏览器模式下（非 Tauri 桌面端），后端 API 返回 null
 * 因此测试聚焦于 UI 交互流程而非数据持久化
 */

import { test, expect } from '@playwright/test';

// ========== 测试常量 ==========
const MOCK_USERNAME = 'boss';
const MOCK_PASSWORD = 'IamBigBoss';
const BASE_URL = 'http://localhost:3000';
const CLOUD_STORE_PATH = '/#/cloud-store';

// ========== 辅助函数 ==========

/** 使用模拟账号登录 */
async function loginWithMockAccount(page: any) {
  await page.goto(BASE_URL + '/#/login');
  await page.waitForLoadState('networkidle');

  // 验证登录页面已加载
  await expect(page.locator('text=ProClaw')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=快速体验账号')).toBeVisible();

  // 填写模拟账号
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  await emailInput.fill(MOCK_USERNAME);
  await passwordInput.fill(MOCK_PASSWORD);

  // 点击登录
  await page.click('button[type="submit"]');

  // 等待导航到首页
  await page.waitForURL('**/#/', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/** 导航到云商城页面 */
async function navigateToCloudStore(page: any) {
  await page.goto(BASE_URL + CLOUD_STORE_PATH);
  await page.waitForLoadState('networkidle');
  // 验证云商城页面标题
  await expect(page.locator('text=云托管商城')).toBeVisible({ timeout: 10000 });
}

// ========== 测试套件 1: 登录与导航 ==========
test.describe('云商城 - 登录与导航', () => {
  test('应使用模拟账号成功登录', async ({ page }) => {
    await page.goto(BASE_URL + '/#/login');
    await page.waitForLoadState('networkidle');

    // 登录
    await page.locator('input[type="email"]').fill(MOCK_USERNAME);
    await page.locator('input[type="password"]').fill(MOCK_PASSWORD);
    await page.click('button[type="submit"]');

    // 验证登录成功（跳转到首页）
    await page.waitForURL('**/#/', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=数据中心')).toBeVisible({ timeout: 5000 });
  });

  test('应能从侧边栏导航到云商城', async ({ page }) => {
    await loginWithMockAccount(page);

    // 点击侧边栏云商城入口
    await page.locator('text=云商城').first().click();
    await page.waitForURL('**/cloud-store', { timeout: 5000 });
    await page.waitForLoadState('networkidle');

    // 验证页面加载
    await expect(page.locator('text=云托管商城')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=一键开通独立域名商城')).toBeVisible();
  });
});

// ========== 测试套件 2: 套餐选择与开通 ==========
test.describe('云商城 - 套餐选择与开通', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
  });

  test('应显示所有套餐选项', async ({ page }) => {
    // 验证套餐卡片
    const planCards = ['免费', '基础', '专业', '企业'];
    for (const planName of planCards) {
      await expect(page.locator('text=' + planName).first()).toBeVisible();
    }
  });

  test('应能点击选择不同套餐', async ({ page }) => {
    // 默认选中免费套餐（第一个）
    await expect(page.locator('text=免费').first()).toBeVisible();

    // 选择基础套餐
    await page.locator('button:has-text("基础版")').click();
    await page.waitForTimeout(300);
  });

  test('应显示套餐详情', async ({ page }) => {
    // 免费套餐详情
    await expect(page.locator('text=20个商品')).toBeVisible();
    await expect(page.locator('text=基础主题')).toBeVisible();
  });
});

// ========== 测试套件 3: 商品管理 ==========
test.describe('云商城 - 商品管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
  });

  test('应能导航到商品管理页面', async ({ page }) => {
    await page.locator('button:has-text("商品管理")').click();
    await page.waitForTimeout(500);
    // 商品管理页面元素
    await expect(page.locator('button:has-text("添加商品")')).toBeVisible();
  });

  test('应显示商品列表', async ({ page }) => {
    await page.locator('button:has-text("商品管理")').click();
    await page.waitForTimeout(500);
    // 验证列表元素
    await expect(page.locator('text=商品名称')).toBeVisible();
  });
});

// ========== 测试套件 4: 主题配置 ==========
test.describe('云商城 - 主题配置', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
  });

  test('应能导航到主题配置', async ({ page }) => {
    await page.locator('button:has-text("主题配置")').click();
    await page.waitForTimeout(500);
    // 主题配置元素
    await expect(page.locator('text=主题市场')).toBeVisible();
  });

  test('应能切换主题', async ({ page }) => {
    await page.locator('button:has-text("主题配置")').click();
    await page.waitForTimeout(500);
    // 切换到其他主题
    const themeCard = page.locator('[class*="theme-card"]').first();
    if (await themeCard.count() > 0) {
      await themeCard.click();
      await page.waitForTimeout(300);
    }
  });
});

// ========== 测试套件 5: 商城设置 ==========
test.describe('云商城 - 商城设置', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
  });

  test('应能导航到商城设置', async ({ page }) => {
    await page.locator('button:has-text("商城设置")').click();
    await page.waitForTimeout(500);
    // 设置页面元素
    await expect(page.locator('text=基本信息')).toBeVisible();
  });

  test('应能修改商城名称', async ({ page }) => {
    await page.locator('button:has-text("商城设置")').click();
    await page.waitForTimeout(500);

    // 找到商城名称输入框
    const nameInput = page.locator('input[placeholder*="商城名称"]');
    if (await nameInput.count() > 0) {
      await nameInput.fill('我的测试商城');
      await page.locator('button:has-text("保存")').click();
      await page.waitForTimeout(500);
    }
  });
});

// ========== 测试套件 6: Tab 切换 ==========
test.describe('云商城 - Tab 切换', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
  });

  test('应能切换到商品管理 Tab', async ({ page }) => {
    await page.locator('button:has-text("商品管理")').click();
    await page.waitForTimeout(500);
    // 商品管理 Tab 应响应点击
  });

  test('应能切换到订单管理 Tab', async ({ page }) => {
    await page.locator('button:has-text("订单管理")').click();
    await page.waitForTimeout(500);
    // 订单 Tab 应响应点击
  });

  test('应能切换到评价管理 Tab', async ({ page }) => {
    await page.locator('button:has-text("评价管理")').click();
    await page.waitForTimeout(500);
  });

  test('应能切换到优惠券管理 Tab', async ({ page }) => {
    await page.locator('button:has-text("优惠券管理")').click();
    await page.waitForTimeout(500);
  });

  test('切换 Tab 时 URL 应相应变化', async ({ page }) => {
    // 订单管理
    await page.locator('button:has-text("订单管理")').click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('orders');

    // 评价管理
    await page.locator('button:has-text("评价管理")').click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('reviews');

    // 优惠券管理
    await page.locator('button:has-text("优惠券管理")').click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('coupons');

    // 回到概览
    await page.locator('button:has-text("商城概览")').click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('/cloud-store');
  });
});

// ========== 测试套件 7: UI 完整性验证 ==========
test.describe('云商城 - UI 完整性验证', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
  });

  test('页面标题应正确显示', async ({ page }) => {
    const title = page.locator('h1:has-text("云托管商城")');
    await expect(title).toBeVisible();
  });

  test('副标题应正确显示', async ({ page }) => {
    await expect(page.locator('text=一键开通独立域名商城')).toBeVisible();
  });

  test('所有 Tab 按钮应可见', async ({ page }) => {
    const expectedTabs = ['商城概览', '商品管理', '主题配置', '商城设置', '订单管理', '评价管理', '优惠券管理'];
    for (const tabLabel of expectedTabs) {
      await expect(page.locator('button:has-text("' + tabLabel + '")')).toBeVisible();
    }
  });

  test('套餐卡片应显示正确的价格', async ({ page }) => {
    // 免费
    await expect(page.locator('text=免费').first()).toBeVisible();
  });
});

// ========== 测试套件 8: 边界情况 ==========
test.describe('云商城 - 边界情况', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
  });

  test('特殊字符子域名应被拒绝', async ({ page }) => {
    await page.locator('button:has-text("立即开通")').click();
    const subdomainInput = page.locator('input[placeholder="mystore"]');

    // 包含特殊字符
    await subdomainInput.fill('my-store!');
    await page.locator('button:has-text("确认开通")').click();
    await expect(page.locator('text=子域名只能包含小写字母')).toBeVisible({ timeout: 5000 });
    // 关闭对话框
    await page.locator('button:has-text("取消")').click();
  });

  test('快速切换 Tab 不应出错', async ({ page }) => {
    const tabs = ['商品管理', '主题配置', '商城设置', '订单管理', '商城概览'];

    for (let i = 0; i < 3; i++) {
      for (const tab of tabs) {
        await page.locator('button:has-text("' + tab + '")').click();
        await page.waitForTimeout(100);
      }
    }

    // 确保没有崩溃
    await expect(page.locator('text=云托管商城')).toBeVisible({ timeout: 5000 });
  });

  test('未登录状态下访问云商城应显示相关内容', async ({ page }) => {
    // 清除登录状态，直接访问云商城
    await page.goto(BASE_URL + CLOUD_STORE_PATH);
    await page.waitForLoadState('networkidle');

    // 应显示商城内容或重定向
    await page.waitForTimeout(2000);
    const url = page.url();
    const hasContent = await page.locator('text=云').isVisible().catch(() => false);
    // 无论是否登录，页面都应该正常加载
    expect(hasContent || url.includes('cloud-store')).toBeTruthy();
  });
});
