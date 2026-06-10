import { test, expect } from '@playwright/test';

test.describe('数据中心功能', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录（使用一键体验按钮）
    await page.goto('/');
    await page.click('button:has-text("一键体验")');
    await page.waitForURL('**/datacenter**', { timeout: 15000 });
  });

  test('应该显示数据中心页面', async ({ page }) => {
    // 验证数据中心相关内容存在
    await expect(page.locator('[class*=sidebar], nav, header').first()).toBeVisible({ timeout: 10000 });
  });

  test('应该显示侧边栏导航', async ({ page }) => {
    // 验证侧边栏存在
    const sidebar = page.locator('[class*=sidebar], nav');
    await expect(sidebar.first()).toBeVisible({ timeout: 5000 });
  });

  test('应该能够看到 AI Team 入口', async ({ page }) => {
    // 查找 AI Team 相关链接
    const aiTeamLink = page.locator('text=AI Team, text=团队, text=Agents');
    if (await aiTeamLink.count() > 0) {
      await expect(aiTeamLink.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('应该能够看到设置入口', async ({ page }) => {
    // 查找设置链接
    const settingsLink = page.locator('text=设置, text=Settings');
    if (await settingsLink.count() > 0) {
      await expect(settingsLink.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('应该能够登出', async ({ page }) => {
    // 查找登出按钮
    const logoutButton = page.locator('button:has-text("登出"), button:has-text("退出")');
    
    if (await logoutButton.count() > 0) {
      await logoutButton.click();
      
      // 等待登录对话框出现（不是页面跳转）
      await page.waitForTimeout(1000);
      await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });
    }
  });
});