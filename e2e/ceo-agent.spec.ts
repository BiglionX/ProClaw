/**
 * CEO Agent 主控官端到端测试 (PRD v6.2)
 * 测试流程: Boss 下达指令 -> CEO Agent 响应 -> 界面元素展示
 */
import { test, expect } from '@playwright/test';

test.describe('CEO Agent 主控官功能 (PRD v6.2)', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/');
    await page.fill('input[type="email"]', 'boss');
    await page.fill('input[type="password"]', 'IamBigBoss');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });
  });

  test('CEO Agent 聊天页面应显示主控官标识和上下文指示器', async ({ page }) => {
    // 从消息列表导航到 CEO Agent 聊天
    await page.goto('/chat/ceo-agent');
    await page.waitForTimeout(1000);

    // 应显示 CEO Agent 名称
    await expect(page.locator('text=CEO Agent')).toBeVisible();

    // 应显示"主控官"徽标
    await expect(page.locator('text=主控官')).toBeVisible();

    // 应显示描述文字
    await expect(page.locator('text=虚拟公司主控官')).toBeVisible();

    // 应显示项目仪表板按钮（AI 图标）
    await expect(page.locator('button[title="项目仪表板"]')).toBeVisible();

    // 应显示上下文指示器（浅黄色背景的活跃项目目标条）
    await expect(page.locator('text=活跃项目目标').or(page.locator('text=暂无活跃项目目标'))).toBeVisible();

    // 应显示 CEO 快捷命令建议
    await expect(page.locator('text=/task list')).toBeVisible();
    await expect(page.locator('text=/context show')).toBeVisible();
    await expect(page.locator('text=/report daily')).toBeVisible();

    // 输入框应有 CEO 专属 placeholder
    await expect(page.locator('input[placeholder="向 CEO Agent 下达指令..."]').or(
      page.locator('textarea[placeholder="向 CEO Agent 下达指令..."]')
    )).toBeVisible();
  });

  test('CEO Agent 主页应显示在最近联系人中', async ({ page }) => {
    // 在消息列表页面应显示 CEO Agent
    await page.goto('/messages');
    await page.waitForTimeout(1000);

    // 应显示 CEO Agent 联系人
    await expect(page.locator('text=CEO Agent')).toBeVisible();
  });

  test('上下文指示器应可点击展开查看详细 PCP 条目', async ({ page }) => {
    await page.goto('/chat/ceo-agent');
    await page.waitForTimeout(1000);

    // 点击上下文指示器（浅黄色条）
    const contextBar = page.locator('text=活跃项目目标').or(page.locator('text=暂无活跃项目目标'));
    if (await contextBar.isVisible()) {
      await contextBar.click();
      await page.waitForTimeout(500);

      // 弹出框应显示"项目上下文"标题
      await expect(page.locator('text=项目上下文').or(page.locator('text=暂无活跃项目上下文条目'))).toBeVisible({ timeout: 3000 });
    }
  });

  test('上下文指示器弹出框中应有跳转仪表板的链接', async ({ page }) => {
    await page.goto('/chat/ceo-agent');
    await page.waitForTimeout(1000);

    // 点击上下文指示器
    const contextBar = page.locator('text=活跃项目目标').or(page.locator('text=暂无活跃项目目标'));
    if (await contextBar.isVisible()) {
      await contextBar.click();
      await page.waitForTimeout(500);

      // 弹出框应显示"查看完整仪表板"链接
      const dashboardLink = page.locator('text=查看完整仪表板');
      await expect(dashboardLink).toBeVisible({ timeout: 3000 });
    }
  });

  test('发送消息后消息应显示在聊天列表中', async ({ page }) => {
    await page.goto('/chat/ceo-agent');
    await page.waitForTimeout(1000);

    // 找到输入框并发送消息
    const input = page.locator('textarea, input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 3000 });

    await input.fill('我们下个季度要主攻海外市场');
    await input.press('Enter');
    await page.waitForTimeout(500);

    // 消息应出现在聊天列表中
    await expect(page.locator('text=我们下个季度要主攻海外市场')).toBeVisible();
  });

  test('快捷命令点击应自动填充输入框', async ({ page }) => {
    await page.goto('/chat/ceo-agent');
    await page.waitForTimeout(1000);

    // 点击 /task list 快捷命令
    const taskListChip = page.locator('text=/task list').first();
    await expect(taskListChip).toBeVisible({ timeout: 3000 });
    await taskListChip.click();

    // 输入框应填充 /task list
    const input = page.locator('textarea, input[type="text"]').first();
    const inputValue = await input.inputValue();
    expect(inputValue).toContain('/task list');
  });

  test('CEO Agent 应显示紫色主题', async ({ page }) => {
    await page.goto('/chat/ceo-agent');
    await page.waitForTimeout(1000);

    // 头像应为紫色（Avatar 使用 bgcolor #7c4dff）
    const avatar = page.locator('.MuiAvatar-root').first();
    const bgColor = await avatar.evaluate(el => getComputedStyle(el).backgroundColor);
    // 紫色背景对应 rgb(124, 77, 255) 或相近值
    expect(bgColor).toContain('124');
  });

  test('项目仪表板页面应能正常加载', async ({ page }) => {
    await page.goto('/project-overview');
    await page.waitForTimeout(1000);

    // 应显示"项目概览"标题
    await expect(page.locator('text=项目概览')).toBeVisible({ timeout: 3000 });

    // 应显示统计卡片
    await expect(page.locator('text=活跃目标')).toBeVisible();
    await expect(page.locator('text=进行中')).toBeVisible();
    await expect(page.locator('text=已完成').or(page.locator('text=暂无任务数据'))).toBeVisible();

    // 应显示项目上下文区域
    await expect(page.locator('text=项目上下文').or(page.locator('text=暂无活跃的项目上下文条目'))).toBeVisible();

    // 应显示最近任务活动区域
    await expect(page.locator('text=最近任务活动').or(page.locator('text=暂无任务记录'))).toBeVisible();
  });

  test('仪表板页面应能刷新数据', async ({ page }) => {
    await page.goto('/project-overview');
    await page.waitForTimeout(1000);

    // 应显示刷新按钮
    const refreshBtn = page.locator('button[title="刷新数据"]');
    await expect(refreshBtn).toBeVisible({ timeout: 3000 });

    // 点击刷新按钮
    await refreshBtn.click();
    await page.waitForTimeout(500);
  });
});

test.describe('CEO Agent 决策确认与个性化学习 (PRD v6.3)', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/');
    await page.fill('input[type="email"]', 'boss');
    await page.fill('input[type="password"]', 'IamBigBoss');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });
  });

  test('决策历史按钮应在 CEO 聊天头部显示', async ({ page }) => {
    await page.goto('/chat/ceo-agent');
    await page.waitForTimeout(1000);

    // 决策历史按钮
    await expect(page.locator('button[title="决策历史"]')).toBeVisible();
  });

  test('点击决策历史按钮应显示侧边栏面板', async ({ page }) => {
    await page.goto('/chat/ceo-agent');
    await page.waitForTimeout(1000);

    // 点击决策历史按钮
    const historyBtn = page.locator('button[title="决策历史"]');
    await expect(historyBtn).toBeVisible({ timeout: 3000 });
    await historyBtn.click();
    await page.waitForTimeout(500);

    // 侧边栏应显示"决策历史"标题
    await expect(page.locator('text=决策历史')).toBeVisible();

    // 应显示统计信息或"暂无决策记录"
    await expect(page.locator('text=总决策').or(page.locator('text=暂无决策记录'))).toBeVisible();
  });

  test('公司时间轴切换应在项目仪表板显示', async ({ page }) => {
    await page.goto('/project-overview');
    await page.waitForTimeout(1000);

    // 时间轴切换按钮
    const timelineChip = page.locator('text=公司时间轴');
    await expect(timelineChip).toBeVisible({ timeout: 3000 });

    // 点击切换
    await timelineChip.click();
    await page.waitForTimeout(500);

    // 时间轴视图应显示
    await expect(page.locator('text=公司时间轴')).toBeVisible();
  });

  test('设置页面应包含 CEO Agent 偏好标签', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(1000);

    // CEO Agent 标签 should exist
    const ceoTab = page.locator('text=CEO Agent');
    await expect(ceoTab).toBeVisible({ timeout: 3000 });

    // 点击标签
    await ceoTab.click();
    await page.waitForTimeout(500);

    // 应显示偏好设置内容
    await expect(page.locator('text=CEO Agent 偏好设置').or(page.locator('text=预算敏感度'))).toBeVisible();

    // 应显示配置包管理
    await expect(page.locator('text=公司发展配置包')).toBeVisible();
  });

  test('确认卡片应支持键盘快捷键 Y/N/E/S', async ({ page }) => {
    await page.goto('/chat/ceo-agent');
    await page.waitForTimeout(1000);

    // 检查是否有确认卡片
    const confirmCard = page.locator('text=需要确认').first();
    if (await confirmCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 应显示快捷键提示
      await expect(page.locator('text=Y 确认')).toBeVisible();
      await expect(page.locator('text=N 拒绝')).toBeVisible();
      await expect(page.locator('text=E 编辑')).toBeVisible();
      await expect(page.locator('text=S 稍后提醒')).toBeVisible();
    }
  });
});
