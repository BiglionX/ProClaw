import { test, expect } from '@playwright/test';

test.describe('采购管理功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("一键体验")');
    await page.waitForURL('**/datacenter**', { timeout: 15000 });
    await page.click('text=采购');
    await page.waitForURL('**/purchase', { timeout: 5000 });
  });

  test('应该显示采购订单列表页面', async ({ page }) => {
    await expect(page.locator('text=采购订单')).toBeVisible();
    await expect(page.locator('button:has-text("创建采购订单")')).toBeVisible();
  });

  test('应该能够打开创建采购订单对话框', async ({ page }) => {
    await page.click('button:has-text("创建采购订单")');
    await expect(page.locator('role=dialog')).toBeVisible();
  });

  test('应该能够创建新采购订单', async ({ page }) => {
    await page.click('button:has-text("创建采购订单")');

    const supplierSelect = page.locator('select[name*="supplier"]').first();
    if (await supplierSelect.count() > 0) {
      await supplierSelect.selectOption({ index: 1 });
    }

    await page.click('button:has-text("添加产品"), button:has-text("+")');
    await page.fill('input[name*="quantity"], input[placeholder*="数量"]', '20');
    await page.fill('input[name*="price"], input[placeholder*="价格"]', '80');

    await page.click('button:has-text("保存"), button:has-text("确定")');
    await expect(page.locator('role=dialog')).not.toBeVisible({ timeout: 5000 });
  });

  test('应该显示采购订单统计信息', async ({ page }) => {
    await expect(page.locator('text=总采购金额')).toBeVisible();
    await expect(page.locator('text=待入库')).toBeVisible();
  });

  test('应该能够按状态过滤采购订单', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"]').first();
    if (await statusFilter.count() > 0) {
      await statusFilter.selectOption('confirmed');
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="order-list"]')).toBeVisible();
    }
  });

  test('应该能够查看采购订单详情', async ({ page }) => {
    const orderRow = page.locator('tbody tr').first();
    await orderRow.click();
    await expect(page.locator('text=订单详情')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=供应商')).toBeVisible();
  });

  test('应该能够管理供应商', async ({ page }) => {
    const supplierTab = page.locator('text=供应商').first();
    if (await supplierTab.count() > 0) {
      await supplierTab.click();
      await expect(page.locator('button:has-text("添加供应商")')).toBeVisible({ timeout: 3000 });
    }
  });

  test('应该能够搜索采购订单', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    await searchInput.fill('PO-');
    await page.waitForTimeout(500);
  });
});
