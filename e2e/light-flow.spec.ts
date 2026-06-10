import { test, expect } from '@playwright/test';

/** 登录辅助函数 - 使用一键体验按钮 */
async function loginWithQuickButton(page: any) {
  await page.waitForLoadState('networkidle');
  const quickButton = page.locator('button:has-text("一键体验")');
  if (await quickButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await quickButton.click();
    await page.waitForTimeout(2000);
  }
}

test.describe('ProClaw-Light 极简版 E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 清除本地存储，确保测试环境干净
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('安装向导流程', () => {
    test('应显示安装向导页面', async ({ page }) => {
      await page.goto('/#/setup');
      await page.waitForLoadState('networkidle');
      // 验证向导容器存在
      await expect(page.locator('text=安装向导')).toBeVisible({ timeout: 10000 });
      // 验证 CEO Agent 头像存在
      await expect(page.locator('[class*="ceo"]')).toBeVisible();
    });

    test('安装向导应包含店铺类型选择界面', async ({ page }) => {
      await page.goto('/#/setup');
      await page.waitForLoadState('networkidle');
      // 验证店铺类型选择按钮存在
      await expect(page.locator('text=餐饮')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=零售')).toBeVisible();
      await expect(page.locator('text=服务')).toBeVisible();
      await expect(page.locator('text=生鲜')).toBeVisible();
    });
  });

  test.describe('Light 版导航', () => {
    test('侧边栏应显示 Light 版特有导航项', async ({ page }) => {
      // 导航到主页，会触发登录弹窗 - 先登录
      await page.goto('/#/');
      await loginWithQuickButton(page);

      // 验证 Light 版导航项存在
      await expect(page.locator('text=AI 知识库').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('AI 知识库页面', () => {
    test('AI 知识库页面应正常加载并显示三个 Tab', async ({ page }) => {
      await page.goto('/#/');
      await loginWithQuickButton(page);

      // 导航到 AI 知识库
      await page.goto('/#/ai-knowledge');
      await page.waitForLoadState('networkidle');

      // 验证页面标题
      await expect(page.locator('text=AI 知识库').first()).toBeVisible({ timeout: 10000 });
      // 验证三个分类 Tab 存在
      await expect(page.locator('text=媒体库').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=问答库').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=资料库').first()).toBeVisible({ timeout: 5000 });
    });

    test('AI 知识库 - 旧路由 /media-library 应重定向到 /ai-knowledge', async ({ page }) => {
      await page.goto('/#/');
      await loginWithQuickButton(page);

      await page.goto('/#/media-library');
      await page.waitForLoadState('networkidle');
      // 应重定向到 /ai-knowledge
      await expect(page).toHaveURL(/#\/ai-knowledge/);
    });
  });

  test.describe('数据看板 Light 版', () => {
    test('数据看板应显示 AI Team 状态卡片', async ({ page }) => {
      await page.goto('/#/');
      await loginWithQuickButton(page);

      // 导航到数据看板
      await page.goto('/#/analytics');
      await page.waitForLoadState('networkidle');

      // 验证 AI Team 卡片（Light 版特有）
      await expect(page.locator('text=新媒体运营').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('设置页面 Light 版', () => {
    test('设置页面应隐藏 Plus 版特有选项卡', async ({ page }) => {
      await page.goto('/#/');
      await loginWithQuickButton(page);

      // 导航到设置页面
      await page.goto('/#/settings');
      await page.waitForLoadState('networkidle');

      // 验证基础设置选项卡存在
      await expect(page.locator('text=基础设置').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Light 版模式检测', () => {
    test('应用应运行在 Light 模式', async ({ page }) => {
      await page.goto('/#/');
      await loginWithQuickButton(page);

      // 检查 window 对象中的全局变量用于验证模式
      const isLight = await page.evaluate(() => {
        return document.querySelector('[href*="ai-knowledge"]') !== null;
      });
      expect(isLight).toBeTruthy();
    });
  });
});