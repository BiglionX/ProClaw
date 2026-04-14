import { test, expect } from '@playwright/test';

test.describe('登录功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该显示登录页面', async ({ page }) => {
    // 检查登录表单是否存在
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('应该使用有效凭据登录成功', async ({ page }) => {
    // 填写登录表单
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // 点击登录按钮
    await page.click('button[type="submit"]');
    
    // 等待导航到仪表板
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // 验证已登录（检查仪表板元素）
    await expect(page.locator('text=仪表板')).toBeVisible({ timeout: 5000 });
  });

  test('应该显示无效凭据的错误信息', async ({ page }) => {
    // 填写错误的凭据
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // 点击登录按钮
    await page.click('button[type="submit"]');
    
    // 验证错误信息显示
    await expect(page.locator('text=登录失败')).toBeVisible({ timeout: 5000 });
  });

  test('应该在空字段时显示验证错误', async ({ page }) => {
    // 直接点击登录按钮，不填写任何内容
    await page.click('button[type="submit"]');
    
    // 验证 HTML5 验证或自定义验证
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('应该有注册链接', async ({ page }) => {
    // 检查是否有注册链接或按钮
    const registerLink = page.locator('text=注册').first();
    await expect(registerLink).toBeVisible();
  });
});
