/**
 * 库存交易导入 E2E 测试（Playwright）
 *
 * 覆盖：
 * - 从库存页打开导入向导（initialTarget=inventory）
 * - 小批量 5 行库存交易走完 7 步向导
 * - 冲突策略三态切换：skip / overwrite / duplicate
 * - 大文件 100 行性能验证
 *
 * Tauri invoke 在浏览器端会被 mock（setup.ts 已 mock），所以仅做 UI 流验证。
 */

import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import os from 'os';

function buildTempXlsx(rows: unknown[][]): string {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, '库存');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const tmpPath = path.join(os.tmpdir(), `import-inventory-test-${Date.now()}.xlsx`);
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

test.describe('库存交易导入（v1.2 P1）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("一键体验")');
    await page.waitForURL('**/datacenter**', { timeout: 15000 });

    // 进入库存页
    await page.click('text=库存');
    await page.waitForURL('**/inventory', { timeout: 5000 });
  });

  test('应该能打开库存导入向导（标题"库存交易导入"）', async ({ page }) => {
    await page.click('[data-testid="open-import-wizard"]');
    await expect(page.locator('[data-testid="import-wizard-dialog"]')).toBeVisible();
    await expect(page.locator('text=库存交易导入').first()).toBeVisible();
  });

  test('小批量 5 行库存交易走完 7 步向导', async ({ page }) => {
    const xlsxPath = buildTempXlsx([
      ['SKU', '类型', '数量', '日期'],
      ['SKU-INV-A', 'inbound', 100, '2026-06-26'],
      ['SKU-INV-B', 'inbound', 80, '2026-06-26'],
      ['SKU-INV-C', 'outbound', 30, '2026-06-27'],
      ['SKU-INV-D', 'adjustment', 10, '2026-06-28'],
      ['SKU-INV-E', 'transfer', 50, '2026-06-29'],
    ]);

    await page.click('[data-testid="open-import-wizard"]');

    // Step 1：上传
    await page.setInputFiles('[data-testid="import-file-input"]', xlsxPath);
    await page.waitForTimeout(1000);

    // Step 2：默认 target=inventory（已通过 initialTarget 预设），下一步
    await page.click('[data-testid="next-step"]');
    await page.waitForTimeout(500);

    // Step 3：字段映射
    await page.click('[data-testid="next-step"]');
    await page.waitForTimeout(800);

    // Step 4：数据预览（mock 校验）
    await page.click('[data-testid="next-step"]');
    await page.waitForTimeout(300);

    // Step 5：冲突策略（skip）
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

  test('冲突策略三态：skip / overwrite / duplicate 切换可见', async ({ page }) => {
    const xlsxPath = buildTempXlsx([
      ['SKU', '类型', '数量', '日期'],
      ['SKU-DUP-A', 'inbound', 10, '2026-06-26'],
      ['SKU-DUP-B', 'outbound', 5, '2026-06-26'],
    ]);

    await page.click('[data-testid="open-import-wizard"]');
    await page.setInputFiles('[data-testid="import-file-input"]', xlsxPath);
    await page.waitForTimeout(1000);

    // 走到 Step 5：冲突策略
    await page.click('[data-testid="next-step"]'); // Step 2 → 3
    await page.waitForTimeout(500);
    await page.click('[data-testid="next-step"]'); // Step 3 → 4
    await page.waitForTimeout(800);
    await page.click('[data-testid="next-step"]'); // Step 4 → 5
    await page.waitForTimeout(300);

    // 三个策略选项应可见
    await expect(page.locator('text=跳过').first()).toBeVisible();
    await expect(page.locator('text=覆盖').first()).toBeVisible();
    await expect(page.locator('text=复制为新').first()).toBeVisible();

    // 切换到 duplicate
    await page.click('text=复制为新');
    await page.waitForTimeout(300);

    // 切换到 overwrite
    await page.click('text=覆盖');
    await page.waitForTimeout(300);

    // 切回 skip
    await page.click('text=跳过');
    await page.waitForTimeout(300);
  });

  test('大文件 100 行性能验证', async ({ page }) => {
    // 构造 100 行库存交易
    const rows: unknown[][] = [['SKU', '类型', '数量', '日期']];
    for (let i = 0; i < 100; i++) {
      rows.push([
        `SKU-PERF-${String(i).padStart(3, '0')}`,
        i % 2 === 0 ? 'inbound' : 'outbound',
        10 + i,
        '2026-06-26',
      ]);
    }
    const xlsxPath = buildTempXlsx(rows);

    const start = Date.now();

    await page.click('[data-testid="open-import-wizard"]');
    await page.setInputFiles('[data-testid="import-file-input"]', xlsxPath);
    await page.waitForTimeout(1500);

    await page.click('[data-testid="next-step"]'); // → 3
    await page.waitForTimeout(500);
    await page.click('[data-testid="next-step"]'); // → 4
    await page.waitForTimeout(800);
    await page.click('[data-testid="next-step"]'); // → 5
    await page.waitForTimeout(300);
    await page.click('[data-testid="next-step"]'); // → 6
    await page.waitForTimeout(300);
    await page.click('[data-testid="start-import"]'); // → 7

    await expect(page.locator('[data-testid="import-complete-dialog"]')).toBeVisible({
      timeout: 30000,
    });

    const elapsed = Date.now() - start;
    // 100 行 < 30s（性能期望）
    expect(elapsed).toBeLessThan(30_000);
  });
});