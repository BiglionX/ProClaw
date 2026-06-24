import { test, expect } from '@playwright/test';

test.describe('多平台兼容性测试', () => {
  test('Chrome 浏览器首页应正常渲染', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', '仅在 Chrome 测试');
    await page.goto('/');
    await expect(page).toHaveTitle(/ProClaw/);
    await expect(page.locator('button:has-text("一键体验")')).toBeVisible();
  });

  test('Firefox 浏览器首页应正常渲染', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', '仅在 Firefox 测试');
    await page.goto('/');
    await expect(page).toHaveTitle(/ProClaw/);
    await expect(page.locator('button:has-text("一键体验")')).toBeVisible();
  });

  test('Safari 浏览器首页应正常渲染', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', '仅在 Safari 测试');
    await page.goto('/');
    await expect(page).toHaveTitle(/ProClaw/);
    await expect(page.locator('button:has-text("一键体验")')).toBeVisible();
  });

  test('Chrome 登录流程应正常', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', '仅在 Chrome 测试');
    await page.goto('/');
    const button = page.locator('button:has-text("一键体验")');
    if (await button.count() > 0) {
      await button.click();
      await page.waitForURL('**/datacenter**', { timeout: 15000 });
      await expect(page).toHaveURL(/datacenter/);
    }
  });

  test('Firefox 登录流程应正常', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', '仅在 Firefox 测试');
    await page.goto('/');
    const button = page.locator('button:has-text("一键体验")');
    if (await button.count() > 0) {
      await button.click();
      await page.waitForURL('**/datacenter**', { timeout: 15000 });
      await expect(page).toHaveURL(/datacenter/);
    }
  });

  test('Safari 登录流程应正常', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', '仅在 Safari 测试');
    await page.goto('/');
    const button = page.locator('button:has-text("一键体验")');
    if (await button.count() > 0) {
      await button.click();
      await page.waitForURL('**/datacenter**', { timeout: 15000 });
      await expect(page).toHaveURL(/datacenter/);
    }
  });

  test('Chrome API 响应应正常', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', '仅在 Chrome 测试');
    const response = await page.request.get('/api/sales/stats');
    await expect(response.ok()).toBeTruthy();
  });

  test('Firefox API 响应应正常', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', '仅在 Firefox 测试');
    const response = await page.request.get('/api/sales/stats');
    await expect(response.ok()).toBeTruthy();
  });

  test('Safari API 响应应正常', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', '仅在 Safari 测试');
    const response = await page.request.get('/api/sales/stats');
    await expect(response.ok()).toBeTruthy();
  });
});
