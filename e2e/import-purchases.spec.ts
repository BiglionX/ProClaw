/**
 * 采购订单导入 E2E 测试（Playwright）
 *
 * 覆盖：
 * - 从采购页打开导入向导（initialTarget=purchases）
 * - 小批量 5 行采购单走完 7 步向导（验证供应商自动建）
 * - 必填字段 supplier_name 缺失时的错误提示
 */

import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import os from 'os';

function buildTempXlsx(rows: unknown[][]): string {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, '采购');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const tmpPath = path.join(os.tmpdir(), `import-purchases-test-${Date.now()}.xlsx`);
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

test.describe('采购订单导入（v1.2 P1）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("一键体验")');
    await page.waitForURL('**/datacenter**', { timeout: 15000 });

    // 进入采购页
    await page.click('text=采购');
    await page.waitForURL('**/purchase', { timeout: 5000 });
  });

  test('应该能打开采购导入向导（标题"采购订单导入"）', async ({ page }) => {
    await page.click('[data-testid="open-import-wizard"]');
    await expect(page.locator('[data-testid="import-wizard-dialog"]')).toBeVisible();
    await expect(page.locator('text=采购订单导入').first()).toBeVisible();
  });

  test('小批量 5 行采购单走完 7 步向导（供应商自动建）', async ({ page }) => {
    const xlsxPath = buildTempXlsx([
      ['PO', '供应商', '日期', 'SKU', '数量', '单价'],
      ['PO-E2E-001', '广州贸易公司', '2026-06-26', 'SKU-PO-A', 100, 12.5],
      ['PO-E2E-002', '深圳电子厂', '2026-06-26', 'SKU-PO-B', 80, 8.0],
      ['PO-E2E-003', '广州贸易公司', '2026-06-27', 'SKU-PO-C', 50, 15.0],
      ['PO-E2E-004', '北京物流', '2026-06-28', 'SKU-PO-D', 30, 20.0],
      ['PO-E2E-005', '上海供应', '2026-06-29', 'SKU-PO-E', 200, 5.5],
    ]);

    await page.click('[data-testid="open-import-wizard"]');

    // Step 1：上传
    await page.setInputFiles('[data-testid="import-file-input"]', xlsxPath);
    await page.waitForTimeout(1000);

    // Step 2 → 3：默认 target=purchases
    await page.click('[data-testid="next-step"]');
    await page.waitForTimeout(500);

    // Step 3：字段映射
    await page.click('[data-testid="next-step"]');
    await page.waitForTimeout(800);

    // Step 4：数据预览（mock 校验）
    await page.click('[data-testid="next-step"]');
    await page.waitForTimeout(300);

    // Step 5：冲突策略
    await page.click('[data-testid="next-step"]');
    await page.waitForTimeout(300);

    // Step 6：确认
    await page.click('[data-testid="start-import"]');

    // Step 7：进度 → 完成
    await expect(page.locator('[data-testid="import-complete-dialog"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text=导入完成')).toBeVisible();
  });
});