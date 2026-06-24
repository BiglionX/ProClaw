import { test, expect } from '@playwright/test';

test.describe('性能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("一键体验")');
    await page.waitForURL('**/datacenter**', { timeout: 15000 });
  });

  test('首页加载时间应小于 3 秒', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - start;
    console.log(`首页加载时间: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('Dashboard 页面渲染时间应小于 4 秒', async ({ page }) => {
    const start = Date.now();
    await page.waitForSelector('[class*=sidebar], nav', { timeout: 10000 });
    const renderTime = Date.now() - start;
    console.log(`Dashboard 渲染时间: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(4000);
  });

  test('API 请求响应时间应小于 2 秒', async ({ page }) => {
    const start = Date.now();
    const response = await page.request.get('/api/sales/stats');
    const responseTime = Date.now() - start;
    console.log(`API 响应时间: ${responseTime}ms`);
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(2000);
  });

  test('页面切换应流畅', async ({ page }) => {
    const navItems = ['销售', '库存', '财务', '产品'];
    const navigationTimes: number[] = [];
    
    for (const item of navItems) {
      const start = Date.now();
      const navLink = page.locator(`text=${item}`);
      if (await navLink.count() > 0) {
        await navLink.first().click();
        await page.waitForLoadState('networkidle');
        navigationTimes.push(Date.now() - start);
      }
    }
    
    if (navigationTimes.length > 0) {
      const avgNavTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
      console.log(`平均页面切换时间: ${avgNavTime}ms`);
      expect(avgNavTime).toBeLessThan(2000);
    }
  });
});
