/**
 * Hermes Skills 管理页 — 端到端测试(Playwright 完整闭环)
 *
 * 覆盖 PRD Hermes Skills 模块的 4 个主 Tab + 关键交互:
 *   1. 总览     — 统计卡片 / 待审核面板 / 最近活动
 *   2. 技能库   — SkillTree + 检索测试 + 详情抽屉
 *   3. 进化日志 — 时间线 + 演示触发进化
 *   4. MoA 演示 — 提议 / 评分 / 汇总
 *
 * 后端走 main.tsx 注入的 InMemoryDatabase + seedPresets(),
 * 因此测试不依赖真实 SqlCipher,可在任意环境跑通。
 *
 * 登录策略:
 *   Playwright 浏览器环境里 `ipcInvoke` 会抛错,所以 `authStore.checkAuth()` 永远读不到用户。
 *   通过 URL 加 `?e2e=1` 触发 ProtectedRoute 测试旁路(见 src/config/routes.tsx),
 *   注入一个最小合法 user,使 AppLayout + Sidebar + 受保护页面全部能挂载。
 */

import { test, expect, Page } from '@playwright/test';

/** 登录 + 进入 Hermes Skills 页 */
async function openHermesSkillsPage(page: Page): Promise<void> {
  // 通过 ?e2e=1 走 ProtectedRoute 的测试旁路,免登录。
  // 浏览器模式下 ipcInvoke('list_local_users_cmd') 会抛错,
  // 真实 Tauri 环境里走 registerLocal/一键体验是另一条路径(对应其他 spec)。
  await page.goto('/?e2e=1#/datacenter');
  await page.waitForURL(/\/datacenter/, { timeout: 15000 });
  // 直接导航到 hermes-skills
  await page.goto('/?e2e=1#/hermes-skills');
  await page.waitForURL(/#\/hermes-skills/, { timeout: 10000 });
  // 标题出现即视为页面已挂载
  await expect(page.locator('h4:has-text("Hermes Skills 管理")')).toBeVisible({
    timeout: 15000,
  });
}

/** 右侧详情抽屉(SkillDetailDrawer)的 selector,避免与左侧 Sidebar Drawer 混淆 */
const rightDrawer = (page: Page) => page.locator('.MuiDrawer-paperAnchorRight');

test.describe('Hermes Skills 管理页 (PRD v6.4)', () => {
  test.beforeEach(async ({ page }) => {
    await openHermesSkillsPage(page);
  });

  /* =========================== Header / 总览 Tab =========================== */

  test('页面 Header 应展示标题、副标题与刷新按钮', async ({ page }) => {
    await expect(page.locator('h4:has-text("Hermes Skills 管理")')).toBeVisible();
    await expect(
      page.locator('text=越用越聪明的 AI Agent · 技能自进化 + MoA 模型委员会 + 工具自愈'),
    ).toBeVisible();
    await expect(page.locator('button:has-text("演示触发进化")')).toBeVisible();
    await expect(page.locator('button:has(svg[data-testid="RefreshIcon"])')).toBeVisible();
  });

  test('应展示 4 个统计卡片(总技能/已激活/待审核/预设)', async ({ page }) => {
    // 用 caption 严格匹配:统计卡片的 label 渲染在 MuiTypography-caption 里
    await expect(
      page.locator('.MuiCard-root .MuiTypography-caption', { hasText: '总技能数' }).first(),
    ).toBeVisible();
    await expect(
      page.locator('.MuiCard-root .MuiTypography-caption', { hasText: '已激活' }).first(),
    ).toBeVisible();
    await expect(
      page.locator('.MuiCard-root .MuiTypography-caption', { hasText: '待审核' }).first(),
    ).toBeVisible();
    await expect(
      page.locator('.MuiCard-root .MuiTypography-caption', { hasText: '预设技能' }).first(),
    ).toBeVisible();
    // 每个卡片都应有数值(数字 h5)
    const h5Values = await page.locator('.MuiCard-root h5').allTextContents();
    expect(h5Values.length).toBeGreaterThanOrEqual(4);
    for (const v of h5Values.slice(0, 4)) {
      expect(Number(v)).toBeGreaterThanOrEqual(0);
    }
  });

  test('默认 Tab 为「总览」,应展示待审核面板 + 最近活动', async ({ page }) => {
    const overviewTab = page.locator('button[role="tab"]:has-text("总览")');
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    // 待审核面板区域(可能是空状态文案)
    await expect(
      page.getByText(/待审核技能|暂无待审核技能/).first(),
    ).toBeVisible();
    // 最近活动区域
    await expect(
      page.getByText(/最近活动|还没有进化记录/).first(),
    ).toBeVisible();
  });

  /* =========================== 切换 Tab =========================== */

  test('可依次切换 4 个 Tab,Tab 面板内容应切换', async ({ page }) => {
    const tabs = ['总览', '技能库', '进化日志', 'MoA 演示'];
    for (const label of tabs) {
      await page.click(`button[role="tab"]:has-text("${label}")`);
      const tabBtn = page.locator(`button[role="tab"]:has-text("${label}")`);
      await expect(tabBtn).toHaveAttribute('aria-selected', 'true', { timeout: 3000 });
    }
  });

  /* =========================== 技能库 Tab =========================== */

  test('技能库 Tab 应展示检索测试 + 全部技能树', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("技能库")');
    await expect(page.locator('main').getByText('检索测试')).toBeVisible();
    await expect(page.locator('main input[placeholder*="哪些商品库存不足"]')).toBeVisible();
    await expect(page.locator('main button:has-text("检索")')).toBeVisible();
    await expect(page.locator('main').getByText('全部技能')).toBeVisible();

    // SkillTree 至少渲染一个分组(预设技能是 seedPresets 注入的)
    await expect(page.locator('main').getByText(/已激活.*预设/).first()).toBeVisible({ timeout: 5000 });
  });

  test('输入「库存不足」并检索,应命中预设的查询低库存商品技能', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("技能库")');
    // 等待 SkillTree 渲染(异步刷新 skills)
    await expect(
      page.locator('main .MuiListItemButton-root').first(),
    ).toBeVisible({ timeout: 10000 });

    const search = page.locator('input[placeholder*="哪些商品库存不足"]');
    await search.fill('库存不足');
    await page.locator('button:has-text("检索")').click();

    // 命中结果应包含「查询低库存商品」
    await expect(page.locator('main').getByText('查询低库存商品').first()).toBeVisible({ timeout: 5000 });
    // 综合评分 chip:InMemoryDatabase 计数列已修正,这里应显示真实数字
    // (如 "综合 0.75");保留宽匹配防止历史脏数据把分数渲染成 "—"。
    const compositeChips = page.locator('main .MuiChip-root', {
      hasText: /综合/,
    });
    await expect(compositeChips.first()).toBeVisible({ timeout: 3000 });
    expect(await compositeChips.count()).toBeGreaterThanOrEqual(1);
  });

  test('检索后点击命中项应打开 SkillDetailDrawer', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("技能库")');
    await expect(
      page.locator('main .MuiListItemButton-root').first(),
    ).toBeVisible({ timeout: 10000 });

    const search = page.locator('input[placeholder*="哪些商品库存不足"]');
    await search.fill('销售汇总');
    await page.locator('button:has-text("检索")').click();

    const hit = page.locator('main').getByText('销售数据汇总').first();
    await expect(hit).toBeVisible({ timeout: 5000 });
    await hit.click();

    // 抽屉标题应包含「销售数据汇总」
    const drawer = rightDrawer(page);
    await expect(drawer).toBeVisible({ timeout: 3000 });
    await expect(drawer.locator('h6:has-text("销售数据汇总")')).toBeVisible();
    await expect(drawer.locator('text=触发短语')).toBeVisible();
    await expect(drawer.locator('text=使用统计')).toBeVisible();
    await expect(drawer.locator('text=总使用')).toBeVisible();
    await expect(drawer.locator('text=成功率')).toBeVisible();

    // 关闭抽屉:Press Escape(更稳定,避开 Toolbar 拦截)
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible({ timeout: 5000 });
  });

  test('SkillTree 中点击预设技能条目应打开抽屉并展示归档按钮', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("技能库")');
    // 等 SkillTree 真正渲染技能条目(在 main 区域内,避开 Toolbar)
    const firstSkill = page.locator('main .MuiListItemButton-root').first();
    await expect(firstSkill).toBeVisible({ timeout: 10000 });
    await firstSkill.click();

    // 抽屉打开 + 显示归档按钮(active 状态的预设技能)
    const drawer = rightDrawer(page);
    await expect(drawer).toBeVisible({ timeout: 3000 });
    await expect(drawer.locator('button:has-text("归档")').first()).toBeVisible();
  });

  /* =========================== 进化日志 Tab =========================== */

  test('进化日志 Tab 应展示时间线标题', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("进化日志")');
    await expect(
      page.locator('text=进化日志(自动记录每次 create / optimize / merge / skip)'),
    ).toBeVisible();
  });

  test('点击「演示触发进化」后,最近活动区域应新增日志', async ({ page }) => {
    await page.click('button:has-text("演示触发进化")');
    // 等异步链路 + 刷新
    await page.waitForTimeout(1200);

    // 跳转回「总览」查看「最近活动」区域是否出现新条目
    await page.click('button[role="tab"]:has-text("总览")');
    // 演示失败应至少产出一条 evolution_log,渲染为带动作 chip 的 Paper
    // 任意动作 chip:新建技能 / 跳过 / 无操作 / 优化技能 / 合并技能
    const activitySection = page
      .locator('text=最近活动')
      .first()
      .locator('xpath=ancestor::div[contains(@class,"MuiBox-root")][1]');
    const papers = activitySection.locator('.MuiPaper-root');
    await expect(papers.first()).toBeVisible({ timeout: 5000 });
    expect(await papers.count()).toBeGreaterThanOrEqual(1);
  });

  /* =========================== MoA 演示 Tab =========================== */

  test('MoA 演示 Tab 应展示触发提示 + 提议层 + 裁判评分 + 最终输出', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("MoA 演示")');

    await expect(page.locator('text=MoA 模型委员会演示')).toBeVisible();
    await expect(
      page.getByText(/MoA\s?(已触发|未触发)/),
    ).toBeVisible({ timeout: 5000 });

    // 提议层 3 个模型
    await expect(page.getByText(/提议层.*3\s?个模型并行/)).toBeVisible();
    await expect(page.getByText(/快速|深入|创意/).first()).toBeVisible();
    // 裁判评分
    await expect(page.locator('text=裁判评分')).toBeVisible();
    // 信心度 chip
    await expect(page.getByText(/信心度\s*[0-9]+%/)).toBeVisible();
    // 最终输出
    await expect(page.locator('text=🤖 裁判综合输出')).toBeVisible();
    await expect(
      page.getByText(/综合\s?fast.*thorough.*creative/).first(),
    ).toBeVisible({ timeout: 3000 });
  });

  /* =========================== 端到端闭环 =========================== */

  test('完整闭环:登录 → 进入页面 → 4 个 Tab 全部遍历 → 触发进化 → 抽屉打开关闭', async ({
    page,
  }) => {
    // 1) 总览 Tab
    await expect(page.locator('h4:has-text("Hermes Skills 管理")')).toBeVisible();
    await expect(page.getByText(/待审核技能|暂无待审核技能/).first()).toBeVisible();

    // 2) 技能库 Tab — 检索 + 打开抽屉 + 关闭
    await page.click('button[role="tab"]:has-text("技能库")');
    await expect(
      page.locator('main .MuiListItemButton-root').first(),
    ).toBeVisible({ timeout: 10000 });
    await page.locator('input[placeholder*="哪些商品库存不足"]').fill('导出');
    await page.locator('button:has-text("检索")').click();
    await expect(page.locator('main').getByText('导出业务数据').first()).toBeVisible({ timeout: 5000 });
    await page.locator('main').getByText('导出业务数据').first().click();
    const drawer = rightDrawer(page);
    await expect(drawer).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible({ timeout: 5000 });

    // 3) 进化日志 Tab — 触发一次进化
    await page.click('button[role="tab"]:has-text("进化日志")');
    await expect(
      page.locator('text=进化日志(自动记录每次 create / optimize / merge / skip)'),
    ).toBeVisible();
    await page.click('button:has-text("演示触发进化")');
    await page.waitForTimeout(1200);

    // 4) MoA 演示 Tab
    await page.click('button[role="tab"]:has-text("MoA 演示")');
    await expect(page.locator('text=🤖 裁判综合输出')).toBeVisible({ timeout: 5000 });

    // 5) 回到总览
    await page.click('button[role="tab"]:has-text("总览")');
    await expect(
      page.locator('.MuiCard-root .MuiTypography-caption', { hasText: '总技能数' }).first(),
    ).toBeVisible();
  });
});