import { test, expect } from '@playwright/test';

test.describe('Agent 管理功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("一键体验")');
    await page.waitForURL('**/datacenter**', { timeout: 15000 });

    // 导航到 Agent 管理页面 - 尝试多种可能的导航项
    const agentNav = page.locator('text=Agent管理, text=Agents, text=智能体, a[href*="agents"]').first();
    if (await agentNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await agentNav.click();
      await page.waitForURL('**/agents**', { timeout: 5000 });
    }
  });

  test('Agent 管理页面应正常加载并显示内置财务管理 Agent', async ({ page }) => {
    await expect(page.locator('text=Agent 管理')).toBeVisible();
    await expect(page.locator('text=财务管理 Agent')).toBeVisible();
    // 内置 Agent 应该有"内置"标签
    await expect(page.locator('text=内置').first()).toBeVisible();
  });

  test('应有"发现更多 Agent"按钮', async ({ page }) => {
    const discoverBtn = page.locator('button:has-text("发现更多 Agent")');
    await expect(discoverBtn).toBeVisible();
  });

  test('应能切换 Agent 的启用/禁用状态', async ({ page }) => {
    // 找到财务管理 Agent 的 Switch
    const agentCard = page.locator('text=财务管理 Agent').locator('..');
    const toggle = agentCard.locator('input[type="checkbox"]').first();
    await expect(toggle).toBeVisible();

    // 初始状态为启用
    await expect(toggle).toBeChecked();

    // 点击禁用
    await toggle.click();
    await page.waitForTimeout(500);

    // 再次启用
    await toggle.click();
    await page.waitForTimeout(500);
  });

  test('应能查看 Agent 详情', async ({ page }) => {
    // 点击信息图标打开详情
    const infoButton = page.locator('text=财务管理 Agent')
      .locator('..')
      .locator('button').first();
    await infoButton.click();

    // 详情弹窗应显示
    await expect(page.locator('text=所需权限')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Agent ID')).toBeVisible();
    await expect(page.locator('text=proclaw-finance-agent').first()).toBeVisible();

    // 关闭详情弹窗
    await page.locator('button').filter({ has: page.locator('svg') }).first().click();
  });

  test('内置财务管理 Agent 应没有卸载按钮', async ({ page }) => {
    // 内置 Agent 附近不应有红色的卸载按钮
    const agentCard = page.locator('text=财务管理 Agent').locator('..');
    const deleteButton = agentCard.locator('button[color="error"]');
    await expect(deleteButton).toHaveCount(0);
  });

  test('应能打开 Agent 市场', async ({ page }) => {
    // 点击"发现更多 Agent"按钮
    const discoverBtn = page.locator('button:has-text("发现更多 Agent")');
    await discoverBtn.click();

    // 市场弹窗应打开
    await expect(page.locator('text=Agent 市场')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=搜索 Agent...')).toBeVisible();

    // 检查分类标签
    await expect(page.locator('text=全部')).toBeVisible();
    await expect(page.locator('text=协作')).toBeVisible();

    // 关闭市场
    await page.locator('button').filter({ has: page.locator('svg') }).first().click();
  });

  test('市场应能按分类筛选', async ({ page }) => {
    // 打开市场
    await page.locator('button:has-text("发现更多 Agent")').click();
    await page.waitForTimeout(500);

    // 点击销售分类
    await page.locator('text=销售').click();
    await page.waitForTimeout(300);

    // 销售分类被选中
    await expect(page.locator('text=客户关系 Agent')).toBeVisible({ timeout: 3000 });
  });

  test('市场应支持搜索', async ({ page }) => {
    // 打开市场
    await page.locator('button:has-text("发现更多 Agent")').click();
    await page.waitForTimeout(500);

    // 输入搜索文本
    await page.fill('input[placeholder="搜索 Agent..."]', '任务');
    await page.waitForTimeout(500);

    // 应显示匹配结果
    await expect(page.locator('text=任务管理 Agent')).toBeVisible({ timeout: 3000 });
  });

  test('应能通过浮动按钮打开 Agent 市场', async ({ page }) => {
    // 页面底部有浮动"发现更多 Agent"按钮
    const floatingBtn = page.locator('button:has-text("发现更多 Agent")').last();
    await expect(floatingBtn).toBeVisible();
    await floatingBtn.click();

    await expect(page.locator('text=Agent 市场')).toBeVisible({ timeout: 3000 });
  });
});
