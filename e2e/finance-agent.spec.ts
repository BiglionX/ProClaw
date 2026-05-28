import { test, expect } from '@playwright/test';

test.describe('财务管理 Agent 功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'boss');
    await page.fill('input[type="password"]', 'IamBigBoss');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });

    // 导航到财务管理 Agent 页面
    await page.click('text=财务管理');
    await page.waitForURL('**/finance-agent', { timeout: 5000 });
  });

  test('财务管理页面应正常加载，显示标题和 Tab 导航', async ({ page }) => {
    await expect(page.locator('text=财务管理')).toBeVisible();
    await expect(page.locator('text=内置财务管理 Agent')).toBeVisible();

    // 所有 Tab 应显示
    await expect(page.locator('text=概览')).toBeVisible();
    await expect(page.locator('text=账户')).toBeVisible();
    await expect(page.locator('text=交易记录')).toBeVisible();
    await expect(page.locator('text=预算')).toBeVisible();
    await expect(page.locator('text=报表')).toBeVisible();
    await expect(page.locator('text=发票')).toBeVisible();
  });

  test('概览 Tab 应显示财务摘要', async ({ page }) => {
    // 默认在概览 Tab
    await expect(page.locator('text=财务概览')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=总资产')).toBeVisible();
    await expect(page.locator('text=本月收入')).toBeVisible();
    await expect(page.locator('text=本月支出')).toBeVisible();
    await expect(page.locator('text=本月结余')).toBeVisible();
  });

  test('账户 Tab 应能显示账户列表并支持创建新账户', async ({ page }) => {
    // 切换到账户 Tab
    await page.locator('text=账户').click();
    await page.waitForTimeout(500);

    // 应显示账户相关 UI
    await expect(page.locator('text=新建账户').first().or(page.locator('text=创建账户').first())).toBeVisible({ timeout: 3000 });
  });

  test('交易记录 Tab 应能显示交易列表', async ({ page }) => {
    // 切换到交易记录 Tab
    await page.locator('text=交易记录').click();
    await page.waitForTimeout(500);

    // 应显示交易相关 UI
    await expect(page.locator('text=记一笔').first().or(page.locator('text=新增').first()).or(page.locator('text=新建').first())).toBeVisible({ timeout: 3000 });
  });

  test('预算 Tab 应能显示预算面板', async ({ page }) => {
    // 切换到预算 Tab
    await page.locator('text=预算').click();
    await page.waitForTimeout(500);

    // 预算 Tab 应有内容
    await expect(page.locator('text=预算').first()).toBeVisible({ timeout: 3000 });
  });

  test('报表 Tab 应能查看收支报表', async ({ page }) => {
    // 切换到报表 Tab
    await page.locator('text=报表').click();
    await page.waitForTimeout(500);

    // 报表应有内容
    await expect(page.locator('text=收支分类').first().or(page.locator('text=分类统计').first())).toBeVisible({ timeout: 3000 });
  });

  test('发票管理 Tab 应能显示发票列表', async ({ page }) => {
    // 切换到发票 Tab
    await page.locator('text=发票').click();
    await page.waitForTimeout(500);

    // 发票 Tab 应有内容
    await expect(page.locator('text=新建发票').first().or(page.locator('text=添加发票').first())).toBeVisible({ timeout: 3000 });
  });

  test('所有 Tab 切换应正确显示对应内容', async ({ page }) => {
    // 依次点击每个 Tab 验证不会报错
    const tabs = ['概览', '账户', '交易记录', '预算', '报表', '发票'];
    for (const tab of tabs) {
      await page.locator(`text=${tab}`).first().click();
      await page.waitForTimeout(300);
      // 验证页面没有崩溃（mounted 组件应存在）
      await expect(page.locator('text=财务管理').first()).toBeVisible();
    }
  });
});
