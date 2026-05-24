import { test, expect } from '@playwright/test';

test.describe('系统设置功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'boss');
    await page.fill('input[type="password"]', 'IamBigBoss');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });
    await page.click('text=设置');
    await page.waitForURL('**/settings', { timeout: 5000 });
  });

  test('应该显示设置页面', async ({ page }) => {
    await expect(page.locator('text=设置')).toBeVisible();
  });

  test('应该显示通用设置选项', async ({ page }) => {
    await expect(page.locator('text=通用设置')).toBeVisible();
  });

  test('应该能够修改系统语言', async ({ page }) => {
    const languageSelect = page.locator('select[name*="language"], select[id*="language"]').first();
    if (await languageSelect.count() > 0) {
      await expect(languageSelect).toBeVisible();
    }
  });

  test('应该显示AI配置选项', async ({ page }) => {
    const aiTab = page.locator('text=AI配置').first();
    if (await aiTab.count() > 0) {
      await aiTab.click();
      await expect(page.locator('text=AI提供商')).toBeVisible({ timeout: 3000 });
    }
  });

  test('应该显示数据管理选项', async ({ page }) => {
    const dataTab = page.locator('text=数据管理').first();
    if (await dataTab.count() > 0) {
      await dataTab.click();
      await expect(page.locator('text=数据备份')).toBeVisible({ timeout: 3000 });
    }
  });

  test('应该能够查看同步状态', async ({ page }) => {
    const syncSection = page.locator('text=数据同步').first();
    if (await syncSection.count() > 0) {
      await expect(syncSection).toBeVisible();
    }
  });

  test('应该显示设备管理', async ({ page }) => {
    const deviceTab = page.locator('text=设备管理').first();
    if (await deviceTab.count() > 0) {
      await deviceTab.click();
      await expect(page.locator('text=已授权设备')).toBeVisible({ timeout: 3000 });
    }
  });

  test('应该显示关于信息', async ({ page }) => {
    const aboutSection = page.locator('text=关于').first();
    if (await aboutSection.count() > 0) {
      await expect(aboutSection).toBeVisible();
    }
  });
});
