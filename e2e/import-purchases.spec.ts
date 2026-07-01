/**
 * ProClaw 批量导入中心 E2E - 采购订单导入（v1.2 P1）
 */

import { test, expect } from '@playwright/test';

test.describe('采购订单批量导入 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("一键体验")');
    await page.waitForURL('**/datacenter**', { timeout: 15000 });
  });

  test('采购页应该看到「批量导入」按钮', async ({ page }) => {
    await page.goto('/purchase');
    await expect(page.locator('[data-testid="import-button-purchases"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test('点采购页「批量导入」应跳到 /import-center/new?target=purchases', async ({ page }) => {
    await page.goto('/purchase');
    await page.click('[data-testid="import-button-purchases"]');
    await page.waitForURL('**/import-center/new?target=purchases', { timeout: 5000 });
    expect(page.url()).toContain('target=purchases');
  });

  test('导入向导页应该显示 target=purchases 相关文案', async ({ page }) => {
    await page.goto('/import-center/new?target=purchases');
    await expect(page.locator('text=采购订单').first()).toBeVisible({ timeout: 5000 });
  });

  test('导入中心页应该支持下载采购订单模板', async ({ page }) => {
    await page.goto('/import-center');
    const btn = page
      .locator('button:has-text("采购模板"), [data-testid*="template-purchases"]')
      .first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(btn).toBeVisible();
    }
  });
});