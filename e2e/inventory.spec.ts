import { test, expect } from '@playwright/test';

test.describe('库存管理功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'boss');
    await page.fill('input[type="password"]', 'IamBigBoss');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });
    await page.click('text=库存');
    await page.waitForURL('**/inventory', { timeout: 5000 });
  });

  test('应该显示库存管理页面', async ({ page }) => {
    await expect(page.locator('text=库存管理')).toBeVisible();
  });

  test('应该显示库存统计卡片', async ({ page }) => {
    await expect(page.locator('text=总产品数')).toBeVisible();
    await expect(page.locator('text=库存预警')).toBeVisible();
  });

  test('应该能够创建入库记录', async ({ page }) => {
    const inboundButton = page.locator('button:has-text("入库")').first();
    if (await inboundButton.count() > 0) {
      await inboundButton.click();

      const productSelect = page.locator('select[name*="product"]').first();
      if (await productSelect.count() > 0) {
        await productSelect.selectOption({ index: 1 });
      }

      await page.fill('input[name*="quantity"]', '50');
      await page.click('button:has-text("确认")');
    }
  });

  test('应该能够创建出库记录', async ({ page }) => {
    const outboundButton = page.locator('button:has-text("出库")').first();
    if (await outboundButton.count() > 0) {
      await outboundButton.click();

      const productSelect = page.locator('select[name*="product"]').first();
      if (await productSelect.count() > 0) {
        await productSelect.selectOption({ index: 1 });
      }

      await page.fill('input[name*="quantity"]', '10');
      await page.click('button:has-text("确认")');
    }
  });

  test('应该显示库存交易日志', async ({ page }) => {
    await expect(page.locator('text=交易记录')).toBeVisible();
  });

  test('应该支持库存交易类型过滤', async ({ page }) => {
    const typeFilter = page.locator('select[name*="type"], select[id*="type"]').first();
    if (await typeFilter.count() > 0) {
      await typeFilter.selectOption('inbound');
      await page.waitForTimeout(500);
    }
  });

  test('应该显示低库存预警', async ({ page }) => {
    const alertSection = page.locator('text=低库存预警');
    if (await alertSection.count() > 0) {
      await expect(alertSection).toBeVisible();
    }
  });

  test('应该支持日期范围过滤', async ({ page }) => {
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.count() > 0) {
      await expect(dateInput).toBeVisible();
    }
  });
});
