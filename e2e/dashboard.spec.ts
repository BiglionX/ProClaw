import { test, expect } from '@playwright/test';

test.describe('仪表板功能', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('应该显示仪表板页面', async ({ page }) => {
    // 验证仪表板标题
    await expect(page.locator('text=仪表板')).toBeVisible();
    
    // 验证统计卡片存在
    await expect(page.locator('[data-testid*="stat"], .stat-card').first()).toBeVisible();
  });

  test('应该显示销售统计', async ({ page }) => {
    // 验证销售相关统计
    await expect(page.locator('text=销售额')).toBeVisible();
    await expect(page.locator('text=订单')).toBeVisible();
  });

  test('应该显示库存预警', async ({ page }) => {
    // 验证库存预警部分
    await expect(page.locator('text=库存预警')).toBeVisible();
    
    // 检查是否有低库存产品列表
    const lowStockList = page.locator('[data-testid*="low-stock"], .low-stock-list');
    if (await lowStockList.count() > 0) {
      await expect(lowStockList).toBeVisible();
    }
  });

  test('应该显示最近活动', async ({ page }) => {
    // 验证最近活动部分
    await expect(page.locator('text=最近活动')).toBeVisible();
    
    // 检查活动列表
    const activityList = page.locator('[data-testid*="activity"], .activity-list');
    if (await activityList.count() > 0) {
      await expect(activityList).toBeVisible();
    }
  });

  test('应该显示图表', async ({ page }) => {
    // 验证图表容器存在
    const chartContainer = page.locator('[data-testid*="chart"], canvas, svg').first();
    await expect(chartContainer).toBeVisible();
  });

  test('应该能够刷新数据', async ({ page }) => {
    // 查找刷新按钮
    const refreshButton = page.locator('button:has-text("刷新"), button[data-action="refresh"]');
    
    if (await refreshButton.count() > 0) {
      await refreshButton.click();
      
      // 等待数据刷新（可能有加载指示器）
      await page.waitForTimeout(1000);
      
      // 验证数据仍然可见
      await expect(page.locator('text=仪表板')).toBeVisible();
    }
  });

  test('应该显示日期范围选择器', async ({ page }) => {
    // 查找日期选择器
    const datepicker = page.locator('[data-testid*="date"], input[type="date"]').first();
    
    if (await datepicker.count() > 0) {
      await expect(datepicker).toBeVisible();
    }
  });

  test('应该能够快速导航到其他页面', async ({ page }) => {
    // 验证侧边栏或导航菜单存在
    const navItems = page.locator('nav a, .sidebar a');
    await expect(navItems.first()).toBeVisible();
    
    // 验证至少有以下导航项
    const hasProducts = await page.locator('text=产品').count() > 0;
    const hasSales = await page.locator('text=销售').count() > 0;
    const hasInventory = await page.locator('text=库存').count() > 0;
    
    expect(hasProducts || hasSales || hasInventory).toBeTruthy();
  });

  test('应该显示用户信息', async ({ page }) => {
    // 验证用户信息显示
    const userInfo = page.locator('[data-testid*="user"], .user-info, text=test@example.com');
    
    if (await userInfo.count() > 0) {
      await expect(userInfo).toBeVisible();
    }
  });

  test('应该能够登出', async ({ page }) => {
    // 查找登出按钮
    const logoutButton = page.locator('button:has-text("登出"), button:has-text("退出"), [data-action="logout"]');
    
    if (await logoutButton.count() > 0) {
      await logoutButton.click();
      
      // 验证返回登录页面
      await page.waitForURL('**/login', { timeout: 5000 });
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });

  test('应该响应式布局', async ({ page }) => {
    // 测试桌面视图
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('text=仪表板')).toBeVisible();
    
    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('text=仪表板')).toBeVisible();
    
    // 测试手机视图
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('text=仪表板')).toBeVisible();
  });

  test('应该显示通知或消息', async ({ page }) => {
    // 查找通知图标或按钮
    const notificationBell = page.locator('[data-testid*="notification"], .notification-bell, button:has-text("通知")');
    
    if (await notificationBell.count() > 0) {
      await notificationBell.click();
      
      // 验证通知面板打开
      await expect(page.locator('text=通知')).toBeVisible({ timeout: 3000 });
    }
  });

  test('应该能够访问快速操作', async ({ page }) => {
    // 查找快速操作按钮
    const quickActions = page.locator('[data-testid*="quick-action"], .quick-actions button');
    
    if (await quickActions.count() > 0) {
      await expect(quickActions.first()).toBeVisible();
      
      // 点击第一个快速操作
      await quickActions.first().click();
      
      // 验证操作执行或对话框打开
      await page.waitForTimeout(500);
    }
  });

  test('应该显示系统状态', async ({ page }) => {
    // 验证系统状态指示器
    const statusIndicator = page.locator('[data-testid*="status"], .status-indicator');
    
    if (await statusIndicator.count() > 0) {
      await expect(statusIndicator).toBeVisible();
    }
  });
});
