/**
 * 商务秘书 Agent 端到端测试 (PRD v8.5)
 * 测试内容: 右键菜单、个性化定制、关注设置、碰壁话术
 */
import { test, expect } from '@playwright/test';

test.describe('商务秘书 Agent 功能 (PRD v8.5)', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/');
    await page.click('button:has-text("一键体验")');
    await page.waitForURL('**/datacenter**', { timeout: 15000 });
  });

  test('秘书浮动按钮应在右下角显示', async ({ page }) => {
    // 应显示浮动操作按钮
    const fab = page.locator('[data-testid="Fab"]');
    await expect(fab).toBeVisible();
  });

  test('右键浮动按钮应弹出上下文菜单', async ({ page }) => {
    // 在浮动按钮上右键
    const fabIcon = page.locator('[data-testid="Fab"]').locator('svg');
    await fabIcon.click({ button: 'right' });

    // 应显示右键菜单
    await expect(page.locator('text=更换头像')).toBeVisible();
    await expect(page.locator('text=修改名称')).toBeVisible();
    await expect(page.locator('text=关注设置')).toBeVisible();
    await expect(page.locator('text=语音通话')).toBeVisible();
    await expect(page.locator('text=关于秘书')).toBeVisible();
  });

  test('右键菜单中语音通话应为灰态', async ({ page }) => {
    // 在浮动按钮上右键
    const fabIcon = page.locator('[data-testid="Fab"]').locator('svg');
    await fabIcon.click({ button: 'right' });

    // 语音通话菜单项应包含"即将上线"提示
    await expect(page.locator('text=即将上线')).toBeVisible();
  });

  test('右键菜单中点击关于秘书应显示信息', async ({ page }) => {
    // 在浮动按钮上右键
    const fabIcon = page.locator('[data-testid="Fab"]').locator('svg');
    await fabIcon.click({ button: 'right' });
    await page.click('text=关于秘书');

    // 应显示关于秘书对话框
    await expect(page.locator('text=Agent ID: builtin:secretary')).toBeVisible();
  });

  test('点击更换头像应打开头像选择器', async ({ page }) => {
    // 在浮动按钮上右键
    const fabIcon = page.locator('[data-testid="Fab"]').locator('svg');
    await fabIcon.click({ button: 'right' });
    await page.click('text=更换头像');

    // 应显示头像选择器
    await expect(page.locator('text=更换头像')).toBeVisible();
  });

  test('对话面板应由秘书身份显示', async ({ page }) => {
    // 打开聊天面板
    await page.locator('[data-testid="Fab"]').click();

    // 应显示秘书头像和名称
    await page.waitForTimeout(500);
    // 标题栏应显示名称
    await expect(page.locator('text=小 Pro')).toBeVisible();
  });

  test('关注设置应打开并显示各配置区域', async ({ page }) => {
    // 在浮动按钮上右键
    const fabIcon = page.locator('[data-testid="Fab"]').locator('svg');
    await fabIcon.click({ button: 'right' });
    await page.click('text=关注设置');

    // 应显示关注设置面板的各区域标题
    await expect(page.locator('text=我关注的指标')).toBeVisible();
    await expect(page.locator('text=自动预警')).toBeVisible();
    await expect(page.locator('text=简报推送')).toBeVisible();
    await expect(page.locator('text=学习记录')).toBeVisible();
  });

  test('向秘书发送决策类请求应触发碰壁话术', async ({ page }) => {
    // 打开聊天面板
    await page.locator('[data-testid="Fab"]').click();
    await page.waitForTimeout(500);

    // 输入采购下单请求
    const textarea = page.locator('textarea');
    await textarea.fill('帮我下采购单');
    await page.locator('button[type="button"]').last().click();

    // 等待响应
    await page.waitForTimeout(1000);

    // 应显示碰壁话术（拒绝+引导）
    await expect(page.locator('text=决策权限')).toBeVisible();
  });
});
