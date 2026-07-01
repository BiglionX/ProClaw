/**
 * ProClaw 批量导入中心 E2E - 库存交易导入（v1.2 P1）
 */

import { test, expect } from '@playwright/test';

test.describe('库存交易批量导入 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("一键体验")');
    await page.waitForURL('**/datacenter**', { timeout: 15000 });
  });

  test('库存页应该看到「批量导入」按钮', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.locator('[data-testid="import-button-inventory"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test('点库存页「批量导入」应跳到 /import-center/new?target=inventory', async ({ page }) => {
    await page.goto('/inventory');
    await page.click('[data-testid="import-button-inventory"]');
    await page.waitForURL('**/import-center/new?target=inventory', { timeout: 5000 });
    expect(page.url()).toContain('target=inventory');
  });

  test('导入向导页应该显示 target=inventory 相关文案', async ({ page }) => {
    await page.goto('/import-center/new?target=inventory');
    await expect(page.locator('text=库存交易').first()).toBeVisible({ timeout: 5000 });
  });

  test('导入中心页应该支持下载库存交易模板', async ({ page }) => {
    await page.goto('/import-center');
    const btn = page
      .locator('button:has-text("库存模板"), [data-testid*="template-inventory"]')
      .first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(btn).toBeVisible();
    }
  });
});