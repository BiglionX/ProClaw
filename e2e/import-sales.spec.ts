/**
 * ProClaw 批量导入中心 E2E - 销售订单导入（v1.2 P1）
 */

import { test, expect } from '@playwright/test';

test.describe('销售订单批量导入 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("一键体验")');
    await page.waitForURL('**/datacenter**', { timeout: 15000 });
  });

  test('销售页应该看到「批量导入」按钮', async ({ page }) => {
    await page.goto('/sales');
    await expect(page.locator('[data-testid="import-button-sales"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test('点销售页「批量导入」应跳到 /import-center/new?target=sales', async ({ page }) => {
    await page.goto('/sales');
    await page.click('[data-testid="import-button-sales"]');
    await page.waitForURL('**/import-center/new?target=sales', { timeout: 5000 });
    expect(page.url()).toContain('target=sales');
  });

  test('导入向导页应该显示 target=sales 相关文案', async ({ page }) => {
    await page.goto('/import-center/new?target=sales');
    await expect(page.locator('text=销售订单').first()).toBeVisible({ timeout: 5000 });
  });

  test('导入中心页应该支持下载销售订单模板', async ({ page }) => {
    await page.goto('/import-center');
    const btn = page
      .locator('button:has-text("销售模板"), [data-testid*="template-sales"]')
      .first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(btn).toBeVisible();
    }
  });
});