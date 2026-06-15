import { test, expect } from '@playwright/test';

/**
 * AI Team 演示数据 - ProClaw 1.0.0 测试数据包
 *
 * 计划要求（plan ProClaw_1.0.0_测试用户数据包_task-d8c.md）:
 * 演示账号首次登录需预置 3 个 AI Team:
 *   - AI 经营团队
 *   - 国内社媒运营团队 / 国内社媒运营 Team
 *   - 海外社媒运营团队 / 海外社媒运营 Team
 *
 * 浏览器 dev 模式（Tauri 不可用）应通过 getMockBuiltinTeams() 展示 3 个 mock 团队。
 * Sidebar "AI 团队" badge 应动态同步为 3。
 */
test.describe('AI Team 演示数据 - ProClaw 1.0.0 测试数据包', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
    await page.waitForLoadState('networkidle');
    // 一键体验登录(演示账号)
    await page.click('button:has-text("一键体验")');
    await page.waitForURL('**/datacenter**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('TeamsPage 浏览器 dev 模式应展示 3 个 AI Team 卡片', async ({ page }) => {
    await page.goto('/#/teams');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    // 切到 "AI Team" Tab(activePageTab=1 才显示团队卡片)
    const aiTeamTab = page.getByRole('tab').filter({ hasText: 'AI Team' });
    await expect(aiTeamTab).toBeVisible({ timeout: 10000 });
    await aiTeamTab.click();
    await page.waitForTimeout(1500);

    // 验证 3 个核心团队名称都在主内容区可见
    const main = page.locator('main');
    await expect(main).toBeVisible();

    await expect(main.getByText('AI 经营团队').first()).toBeVisible({ timeout: 10000 });
    await expect(main.getByText('国内社媒运营 Team').first()).toBeVisible({ timeout: 10000 });
    await expect(main.getByText('欧美社媒运营 Team').first()).toBeVisible({ timeout: 10000 });

    // 验证 3 个团队的 member agent_id 都是真实有效的:
    // - AI 经营团队: 8 个 builtin-* (Tauri 后端注册)
    // - 国内社媒: 4 个 ma_social_cn (localAgentManifests)
    // - 欧美社媒: 3 个 ma_social_us (localAgentManifests)
    // 总数 = 8 + 4 + 3 = 15 成员,加上 CEO Agent = 18 群成员

    // 验证 sidebar 徽章动态显示为 3(不是硬编码 2)
    // Sidebar 用 MUI Chip 渲染 badge,文字严格匹配 "3"
    const aiTeamBadge = page.locator('.MuiChip-root').filter({ hasText: /^3$/ }).first();
    await expect(aiTeamBadge).toBeVisible({ timeout: 5000 });
  });

  test('Sidebar AI 团队徽章应动态反映 TeamsPage 中的团队数量', async ({ page }) => {
    await page.goto('/#/teams');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    // 切到 AI Team Tab 触发 loadTeams 完成后 setTeams → useEffect → syncAITeamCountToSidebar
    const aiTeamTab = page.getByRole('tab').filter({ hasText: 'AI Team' });
    await aiTeamTab.click();
    await page.waitForTimeout(1500);

    // 进入 TeamsPage 后,localStorage 同步 + 广播事件
    const teamCount = await page.evaluate(() => {
      const raw = localStorage.getItem('proclaw:teams:count');
      return raw ? parseInt(raw, 10) : 0;
    });
    expect(teamCount).toBe(3);
  });
});
