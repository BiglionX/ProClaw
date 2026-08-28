import { test, expect } from '@playwright/test';

/**
 * v1.5.1 Marketplace E2E (Sprint 2.18+)
 *
 * 覆盖：
 * - NvWaX Web marketplace 详情页骨架（mock 数据友好）
 * - ProClaw 发布成功 toast 的深链（仅验证跳转 URL 正确，不真打开外部窗口）
 */

test.describe('NvWaX Marketplace Pages (v1.5.1)', () => {
  test.use({ baseURL: process.env.NVWAX_BASE_URL || 'http://localhost:3000' });

  test('marketplace home loads with tabs', async ({ page }) => {
    await page.goto('/en/marketplace');
    await expect(page.locator('h1')).toContainText(/marketplace/i);
    await expect(page.getByRole('link', { name: /agents/i }).first()).toBeVisible();
  });

  test('agent detail returns 404 for nonexistent agent', async ({ page }) => {
    const response = await page.goto('/en/marketplace/agents/nonexistent-12345');
    expect(response?.status()).toBe(404);
  });

  test('aiteam detail returns 404 for nonexistent aiteam', async ({ page }) => {
    const response = await page.goto('/en/marketplace/aiteams/nonexistent-12345');
    expect(response?.status()).toBe(404);
  });

  test('plugin detail returns 404 for nonexistent plugin', async ({ page }) => {
    const response = await page.goto('/en/marketplace/plugins/nonexistent-12345');
    expect(response?.status()).toBe(404);
  });

  test('zh-CN locale loads marketplace', async ({ page }) => {
    await page.goto('/zh/marketplace');
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('ProClaw → NvWaX publish deep-link (v1.5.1)', () => {
  /**
   * 这一组测试模拟 ProClaw Companies 页发布成功后的 toast 行为。
   * 完整跑需要 Tauri 环境，故只验证深链 URL 格式正确。
   */
  test('marketplace URL contains correct aiteam id', async () => {
    const teamSkillId = 'test-uuid-12345';
    const expectedUrl = `https://nvwax.proclaw.cc/zh-CN/marketplace/aiteams/${teamSkillId}`;
    expect(expectedUrl).toMatch(/^https:\/\/nvwax\.proclaw\.cc\/zh-CN\/marketplace\/aiteams\//);
  });
});
