import { test, expect } from '@playwright/test';

test.describe('登录功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该显示登录对话框', async ({ page }) => {
    // 检查登录对话框出现
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });
  });

  test('应该使用一键体验按钮登录成功并跳转到数据中心', async ({ page }) => {
    // 点击"一键体验 (boss)"按钮
    await page.click('button:has-text("一键体验")');
    
    // 等待跳转到 /datacenter
    await page.waitForURL('**/datacenter**', { timeout: 15000 });
    
    // 验证 URL 包含 datacenter
    expect(page.url()).toContain('/datacenter');
  });

  test('应该能正常填写登录表单', async ({ page }) => {
    // 验证用户名输入框存在 (type="email")
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // 验证密码字段存在
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // 验证登录按钮存在
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});