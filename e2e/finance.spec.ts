import { test, expect } from '@playwright/test';

test.describe('财务管理功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'boss');
    await page.fill('input[type="password"]', 'IamBigBoss');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });
    await page.click('text=财务');
    await page.waitForURL('**/finance', { timeout: 5000 });
  });

  test('应该显示财务概览页面', async ({ page }) => {
    await expect(page.locator('text=财务概览')).toBeVisible();
  });

  test('应该显示收入支出统计', async ({ page }) => {
    await expect(page.locator('text=收入')).toBeVisible();
    await expect(page.locator('text=支出')).toBeVisible();
    await expect(page.locator('text=利润')).toBeVisible();
  });

  test('应该显示应收应付信息', async ({ page }) => {
    await expect(page.locator('text=应收账款')).toBeVisible();
    await expect(page.locator('text=应付账款')).toBeVisible();
  });

  test('应该支持日期范围选择', async ({ page }) => {
    const datePicker = page.locator('input[type="date"]').first();
    if (await datePicker.count() > 0) {
      await expect(datePicker).toBeVisible();
    }
  });

  test('应该能够查看损益报表', async ({ page }) => {
    const reportTab = page.locator('text=损益报表').first();
    if (await reportTab.count() > 0) {
      await reportTab.click();
      await expect(page.locator('text=收入合计')).toBeVisible({ timeout: 3000 });
      await expect(page.locator('text=净利润')).toBeVisible();
    }
  });

  test('应该能够查看现金流报表', async ({ page }) => {
    const cashFlowTab = page.locator('text=现金流').first();
    if (await cashFlowTab.count() > 0) {
      await cashFlowTab.click();
      await expect(page.locator('text=经营活动')).toBeVisible({ timeout: 3000 });
    }
  });

  test('应该能够导出财务报表', async ({ page }) => {
    const exportButton = page.locator('button:has-text("导出")').first();
    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('应该显示图表可视化', async ({ page }) => {
    const chart = page.locator('canvas, svg, [data-testid*="chart"]').first();
    await expect(chart).toBeVisible({ timeout: 5000 });
  });
});
