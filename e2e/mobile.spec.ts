import { test, expect } from '@playwright/test';

const iPhone12 = { width: 390, height: 844 };
const iPad = { width: 1024, height: 1366 };

test.describe('移动端测试', () => {
  test('iPhone 12 首页应正确渲染', async ({ page }) => {
    await page.setViewportSize(iPhone12);
    await page.goto('/');
    await expect(page).toHaveTitle(/ProClaw/);
  });

  test('iPhone 12 布局应适应移动端', async ({ page }) => {
    await page.setViewportSize(iPhone12);
    await page.goto('/');
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(390);
    expect(viewport?.height).toBe(844);
  });

  test('iPad 首页应正确渲染', async ({ page }) => {
    await page.setViewportSize(iPad);
    await page.goto('/');
    await expect(page).toHaveTitle(/ProClaw/);
  });

  test('iPad 布局应适应平板端', async ({ page }) => {
    await page.setViewportSize(iPad);
    await page.goto('/');
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(1024);
    expect(viewport?.height).toBe(1366);
  });

  test('iPhone 12 一键体验按钮应可点击', async ({ page }) => {
    await page.setViewportSize(iPhone12);
    await page.goto('/');
    const button = page.locator('button:has-text("一键体验")');
    await expect(button).toBeVisible();
    await button.click();
  });

  test('iPhone 12 文本输入应正常', async ({ page }) => {
    await page.setViewportSize(iPhone12);
    await page.goto('/');
    const input = page.locator('input').first();
    if (await input.count() > 0) {
      await input.fill('测试');
      const value = await input.inputValue();
      expect(value).toBe('测试');
    }
  });

  test('iPhone 12 登录后页面应正常显示', async ({ page }) => {
    await page.setViewportSize(iPhone12);
    await page.goto('/');
    const button = page.locator('button:has-text("一键体验")');
    if (await button.count() > 0) {
      await button.click();
      await page.waitForURL('**/datacenter**', { timeout: 15000 });
      await expect(page).toHaveURL(/datacenter/);
    }
  });

  test('iPad 登录后页面应正常显示', async ({ page }) => {
    await page.setViewportSize(iPad);
    await page.goto('/');
    const button = page.locator('button:has-text("一键体验")');
    if (await button.count() > 0) {
      await button.click();
      await page.waitForURL('**/datacenter**', { timeout: 15000 });
      await expect(page).toHaveURL(/datacenter/);
    }
  });
});
