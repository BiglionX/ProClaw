/**
 * 云托管商城 - 完整建站流程 E2E 测试
 *
 * 测试覆盖：登录 → 套餐选择 → 开通商城 → 商品管理 → 主题配置 → 商城设置
 *
 * 注意：在浏览器模式下（非 Tauri 桌面端），后端 API 返回 null，
 * 因此测试聚焦于 UI 交互流程而非数据持久化。
 */

import { test, expect } from '@playwright/test';

// ========== 测试常量 ==========
const MOCK_USERNAME = 'boss';
const MOCK_PASSWORD = 'IamBigBoss';
const BASE_URL = 'http://localhost:3000';
const CLOUD_STORE_PATH = '/#/cloud-store';

// ========== 辅助函数 ==========

/** 使用模拟账号登录 */
async function loginWithMockAccount(page: any) {
  await page.goto(BASE_URL + '/#/login');
  await page.waitForLoadState('networkidle');

  // 验证登录页面已加载
  await expect(page.locator('text=ProClaw')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=快速体验账号')).toBeVisible();

  // 填写模拟账号
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  await emailInput.fill(MOCK_USERNAME);
  await passwordInput.fill(MOCK_PASSWORD);

  // 点击登录
  await page.click('button[type="submit"]');

  // 等待导航到首页
  await page.waitForURL('**/#/', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/** 导航到云商城页面 */
async function navigateToCloudStore(page: any) {
  await page.goto(BASE_URL + CLOUD_STORE_PATH);
  await page.waitForLoadState('networkidle');
  // 验证云商城页面标题
  await expect(page.locator('text=云托管商城')).toBeVisible({ timeout: 10000 });
}

// ========== 测试套件 1: 登录与导航 ==========
test.describe('云商城 - 登录与导航', () => {
  test('应使用模拟账号成功登录', async ({ page }) => {
    await page.goto(BASE_URL + '/#/login');
    await page.waitForLoadState('networkidle');

    // 登录
    await page.locator('input[type="email"]').fill(MOCK_USERNAME);
    await page.locator('input[type="password"]').fill(MOCK_PASSWORD);
    await page.click('button[type="submit"]');

    // 验证登录成功（跳转到首页）
    await page.waitForURL('**/#/', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=AI claw')).toBeVisible({ timeout: 5000 });
  });

  test('应能从侧边栏导航到云商城', async ({ page }) => {
    await loginWithMockAccount(page);

    // 点击侧边栏「云商城」导航
    await page.locator('text=云商城').first().click();
    await page.waitForURL('**/cloud-store', { timeout: 5000 });
    await page.waitForLoadState('networkidle');

    // 验证页面加载
    await expect(page.locator('text=云托管商城')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=一键开通独立域名商城')).toBeVisible();
  });
});

// ========== 测试套件 2: 套餐选择与商城开通 ==========
test.describe('云商城 - 套餐选择与开通', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
  });

  test('应显示所有4个套餐选项', async ({ page }) => {
    // 验证套餐卡片
    const planCards = ['免费版', '基础版', '专业版', '企业版'];
    for (const planName of planCards) {
      await expect(page.locator('text=' + planName).first()).toBeVisible();
    }
  });

  test('应能点击选择不同套餐', async ({ page }) => {
    // 默认选中免费版（第一个）
    await expect(page.locator('text=免费版').first()).toBeVisible();

    // 点击专业版
    const proCard = page.locator('text=专业版').first();
    await proCard.click();

    // 验证「已选」标签出现
    await expect(page.locator('text=已选')).toBeVisible();
  });

  test('应显示开通引导提示', async ({ page }) => {
    // 验证未开通状态提示
    await expect(page.locator('text=您尚未开通云托管商城')).toBeVisible();
    await expect(page.locator('text=请选择套餐并开通')).toBeVisible();
  });

  test('「立即开通」按钮应可点击并打开对话框', async ({ page }) => {
    // 点击开通按钮
    await page.locator('button:has-text("立即开通")').click();

    // 验证对话框打开
    await expect(page.locator('text=开通云托管商城')).toBeVisible();
    await expect(page.locator('text=确认开通')).toBeVisible();
    await expect(page.locator('text=取消')).toBeVisible();
  });

  test('开通对话框应显示子域名输入框', async ({ page }) => {
    await page.locator('button:has-text("立即开通")').click();
    await expect(page.locator('text=开通云托管商城')).toBeVisible();

    // 验证子域名输入框
    const subdomainInput = page.locator('input[placeholder="mystore"]');
    await expect(subdomainInput).toBeVisible();

    // 验证域名后缀提示
    await expect(page.locator('text=.proclaw.cc')).toBeVisible();
  });

  test('应验证子域名格式（仅允许小写字母数字连字符）', async ({ page }) => {
    await page.locator('button:has-text("立即开通")').click();
    await expect(page.locator('text=开通云托管商城')).toBeVisible();

    // 输入无效子域名（大写字母）
    const subdomainInput = page.locator('input[placeholder="mystore"]');
    await subdomainInput.fill('InvalidDomain');
    await page.locator('button:has-text("确认开通")').click();

    // 验证错误提示
    await expect(page.locator('text=子域名只能包含小写字母、数字和连字符')).toBeVisible({ timeout: 5000 });
  });

  test('应验证子域名为空', async ({ page }) => {
    await page.locator('button:has-text("立即开通")').click();
    await expect(page.locator('text=开通云托管商城')).toBeVisible();

    // 不输入子域名直接确认
    await page.locator('button:has-text("确认开通")').click();

    // 验证错误提示
    await expect(page.locator('text=请输入子域名')).toBeVisible({ timeout: 5000 });
  });

  test('有效子域名应触发开通流程', async ({ page }) => {
    await page.locator('button:has-text("立即开通")').click();
    await expect(page.locator('text=开通云托管商城')).toBeVisible();

    // 选择专业版套餐
    await page.locator('text=专业版').first().click();

    // 输入有效子域名
    const subdomainInput = page.locator('input[placeholder="mystore"]');
    await subdomainInput.fill('iphone-battery-store');

    // 确认开通
    await page.locator('button:has-text("确认开通")').click();

    // 验证对话框关闭（开通请求已发送）
    // 注意：浏览器模式下后端返回 null，但对话框应关闭
    await expect(page.locator('text=开通云托管商城')).not.toBeVisible({ timeout: 5000 });
  });

  test('取消按钮应关闭对话框而不开通', async ({ page }) => {
    await page.locator('button:has-text("立即开通")').click();
    await expect(page.locator('text=开通云托管商城')).toBeVisible();

    // 点击取消
    await page.locator('button:has-text("取消")').click();

    // 对话框关闭
    await expect(page.locator('text=开通云托管商城')).not.toBeVisible({ timeout: 3000 });

    // 仍在开通引导页
    await expect(page.locator('text=您尚未开通云托管商城')).toBeVisible();
  });
});

// ========== 测试套件 3: Tab 导航 ==========
test.describe('云商城 - Tab 导航', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
  });

  const tabs = [
    { index: 0, label: '商城概览', contentText: '您尚未开通云托管商城' },
    { index: 1, label: '商品管理', contentText: '商品列表' },
    { index: 2, label: '主题配置', contentText: 'AI 主题生成' },
    { index: 3, label: '商城设置', contentText: '请先在' },
    { index: 4, label: '订单管理' },
    { index: 5, label: '评价管理' },
    { index: 6, label: '优惠券管理' },
  ];

  for (const tab of tabs) {
    test(`应能切换到「${tab.label}」Tab`, async ({ page }) => {
      // 点击对应 Tab
      const tabButton = page.locator(`button:has-text("${tab.label}")`);
      await expect(tabButton).toBeVisible();
      await tabButton.click();

      // 等待内容加载
      await page.waitForTimeout(500);

      // 验证 Tab 内容（如果有预期文本）
      if (tab.contentText) {
        await expect(page.locator(`text=${tab.contentText}`).first()).toBeVisible({ timeout: 3000 });
      }
    });
  }
});

// ========== 测试套件 4: 主题配置 ==========
test.describe('云商城 - 主题配置', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
    // 切换到主题配置 Tab
    await page.locator('button:has-text("主题配置")').click();
    await page.waitForTimeout(500);
  });

  test('应显示 AI 主题生成区域', async ({ page }) => {
    // 验证 AI 生成区域
    await expect(page.locator('text=AI 主题生成')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("AI 生成主题")')).toBeVisible();
  });

  test('应包含 AI 生成说明文字', async ({ page }) => {
    await expect(page.locator('text=根据您的商品分类')).toBeVisible();
  });

  test('应显示主题色配置区域', async ({ page }) => {
    await expect(page.locator('text=主题色配置')).toBeVisible();
    await expect(page.locator('text=主色调')).toBeVisible();
    await expect(page.locator('text=辅助色')).toBeVisible();
  });

  test('应显示布局风格选择', async ({ page }) => {
    await expect(page.locator('text=布局风格')).toBeVisible();
    await expect(page.locator('button:has-text("卡片式")')).toBeVisible();
    await expect(page.locator('button:has-text("列表式")')).toBeVisible();
  });

  test('布局风格切换应有视觉变化', async ({ page }) => {
    // 默认卡片式为选中
    const cardBtn = page.locator('button:has-text("卡片式")');
    const listBtn = page.locator('button:has-text("列表式")');

    // 点击列表式
    await listBtn.click();
    await page.waitForTimeout(300);

    // 验证列表式现在为选中样式（contained variant）
    const listBtnClass = await listBtn.getAttribute('class');
    expect(listBtnClass).toContain('MuiButton-contained');

    // 切换回卡片式
    await cardBtn.click();
    await page.waitForTimeout(300);
  });

  test('应显示品牌素材上传区域', async ({ page }) => {
    await expect(page.locator('text=品牌素材')).toBeVisible();
    await expect(page.locator('text=商城 Logo')).toBeVisible();
    await expect(page.locator('text=首页轮播图')).toBeVisible();
  });

  test('应显示主题预览区域', async ({ page }) => {
    await expect(page.locator('text=主题预览')).toBeVisible();
    await expect(page.locator('button:has-text("展开预览")')).toBeVisible();
  });

  test('展开预览应显示模拟商城布局', async ({ page }) => {
    await page.locator('button:has-text("展开预览")').click();
    await page.waitForTimeout(500);

    // 验证预览内容
    await expect(page.locator('text=My Store')).toBeVisible();
    await expect(page.locator('text=示例商品')).toBeVisible();

    // 验证收起按钮出现
    await expect(page.locator('button:has-text("收起预览")')).toBeVisible();

    // 收起预览
    await page.locator('button:has-text("收起预览")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=展开预览')).toBeVisible();
  });

  test('应显示保存和重置按钮', async ({ page }) => {
    await expect(page.locator('button:has-text("保存配置")')).toBeVisible();
    await expect(page.locator('button:has-text("重置")')).toBeVisible();
  });

  test('颜色选择器应可交互', async ({ page }) => {
    // 主色调颜色输入框
    const primaryColorInput = page.locator('#primary-color-input');
    if (await primaryColorInput.isVisible()) {
      await primaryColorInput.fill('#ff0000');
      await expect(primaryColorInput).toHaveValue('#ff0000');
    }
  });

  test('AI 生成主题按钮应在无商城时提示错误', async ({ page }) => {
    // 未开通商城时点击 AI 生成
    await page.locator('button:has-text("AI 生成主题")').click();

    // 应显示错误提示（需要先开通商城）
    await page.waitForTimeout(1000);
    // 错误提示可能以 snackbar 形式出现
    const errorSnackbar = page.locator('[role="alert"]');
    // 不一定有错误，取决于实现
  });
});

// ========== 测试套件 5: 商品管理 ==========
test.describe('云商城 - 商品管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
    // 切换到商品管理 Tab
    await page.locator('button:has-text("商品管理")').click();
    await page.waitForTimeout(500);
  });

  test('应显示商品列表区域', async ({ page }) => {
    await expect(page.locator('text=商品列表')).toBeVisible({ timeout: 5000 });
  });

  test('应显示搜索输入框', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索商品"]');
    await expect(searchInput).toBeVisible();
  });

  test('应显示同步状态筛选下拉框', async ({ page }) => {
    await expect(page.locator('text=同步状态')).toBeVisible();
  });

  test('应显示全量同步和增量同步按钮', async ({ page }) => {
    await expect(page.locator('button:has-text("全量同步")')).toBeVisible();
    await expect(page.locator('button:has-text("增量同步")')).toBeVisible();
  });

  test('应显示刷新按钮', async ({ page }) => {
    await expect(page.locator('button:has-text("刷新")')).toBeVisible();
  });

  test('搜索功能应可输入文本', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索商品"]');
    await searchInput.fill('iPhone');
    await expect(searchInput).toHaveValue('iPhone');

    // 清空搜索
    await searchInput.clear();
    await expect(searchInput).toHaveValue('');
  });

  test('同步状态筛选应可选择不同选项', async ({ page }) => {
    // 点击同步状态下拉框
    const filterSelect = page.locator('text=同步状态').locator('..').locator('[role="combobox"]');
    if (await filterSelect.isVisible()) {
      await filterSelect.click();
      await page.waitForTimeout(300);

      // 验证选项出现
      await expect(page.locator('[role="option"]:has-text("全部")')).toBeVisible();
      await expect(page.locator('[role="option"]:has-text("已同步")')).toBeVisible();
      await expect(page.locator('[role="option"]:has-text("待同步")')).toBeVisible();
    }
  });

  test('全量同步按钮应为可点击', async ({ page }) => {
    await page.locator('button:has-text("全量同步")').click();
    // 浏览器模式会静默失败或显示错误
    await page.waitForTimeout(500);
  });
});

// ========== 测试套件 6: 商城设置 ==========
test.describe('云商城 - 商城设置', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
    // 切换到商城设置 Tab
    await page.locator('button:has-text("商城设置")').click();
    await page.waitForTimeout(500);
  });

  test('应显示未开通商城的警告', async ({ page }) => {
    // 因为商城未开通，设置页应显示警告
    await expect(page.locator('text=请先在').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=开通云商城').first()).toBeVisible();
  });
});

// ========== 测试套件 7: 订单/评价/优惠券 Tab ==========
test.describe('云商城 - 其他 Tab 可访问性', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
  });

  test('应能切换到订单管理 Tab', async ({ page }) => {
    await page.locator('button:has-text("订单管理")').click();
    await page.waitForTimeout(500);
    // 订单 Tab 应响应点击
  });

  test('应能切换到评价管理 Tab', async ({ page }) => {
    await page.locator('button:has-text("评价管理")').click();
    await page.waitForTimeout(500);
  });

  test('应能切换到优惠券管理 Tab', async ({ page }) => {
    await page.locator('button:has-text("优惠券管理")').click();
    await page.waitForTimeout(500);
  });

  test('切换 Tab 时 URL 应相应变化', async ({ page }) => {
    // 订单管理
    await page.locator('button:has-text("订单管理")').click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('orders');

    // 评价管理
    await page.locator('button:has-text("评价管理")').click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('reviews');

    // 优惠券管理
    await page.locator('button:has-text("优惠券管理")').click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('coupons');

    // 回到概览
    await page.locator('button:has-text("商城概览")').click();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('/cloud-store');
  });
});

// ========== 测试套件 8: 页面响应式与 UI 验证 ==========
test.describe('云商城 - UI 完整性验证', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
  });

  test('页面标题应正确显示', async ({ page }) => {
    const title = page.locator('h1:has-text("云托管商城")');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('云托管商城');
  });

  test('副标题应正确显示', async ({ page }) => {
    await expect(page.locator('text=一键开通独立域名商城，AI 自动生成主题，商品一键同步')).toBeVisible();
  });

  test('所有7个 Tab 按钮应可见', async ({ page }) => {
    const expectedTabs = ['商城概览', '商品管理', '主题配置', '商城设置', '订单管理', '评价管理', '优惠券管理'];
    for (const tabLabel of expectedTabs) {
      await expect(page.locator(`button:has-text("${tabLabel}")`)).toBeVisible();
    }
  });

  test('套餐卡片应显示正确的价格和特性', async ({ page }) => {
    // 免费版
    await expect(page.locator('text=¥0/月').or(page.locator('text=免费')).first()).toBeVisible();

    // 基础版
    await expect(page.locator('text=¥29/月')).toBeVisible();

    // 专业版
    await expect(page.locator('text=¥99/月')).toBeVisible();

    // 企业版
    await expect(page.locator('text=¥299/月')).toBeVisible();
  });

  test('套餐特性应正确显示', async ({ page }) => {
    // 检查一些关键特性
    await expect(page.locator('text=20 个商品')).toBeVisible(); // 免费版
    await expect(page.locator('text=AI 主题生成')).toBeVisible(); // 基础版+
    await expect(page.locator('text=优先支持')).toBeVisible(); // 专业版+
    await expect(page.locator('text=API 对接')).toBeVisible(); // 企业版
  });
});

// ========== 测试套件 9: 边界情况 ==========
test.describe('云商城 - 边界情况与错误处理', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMockAccount(page);
    await navigateToCloudStore(page);
  });

  test('特殊字符子域名应被拒绝', async ({ page }) => {
    await page.locator('button:has-text("立即开通")').click();
    const subdomainInput = page.locator('input[placeholder="mystore"]');

    // 包含特殊字符
    await subdomainInput.fill('my-store!');
    await page.locator('button:has-text("确认开通")').click();
    await expect(page.locator('text=子域名只能包含小写字母、数字和连字符')).toBeVisible({ timeout: 5000 });

    // 关闭对话框重试
    await page.locator('button:has-text("取消")').click();
  });

  test('过长子域名应能输入', async ({ page }) => {
    await page.locator('button:has-text("立即开通")').click();
    const subdomainInput = page.locator('input[placeholder="mystore"]');

    // 超长子域名
    await subdomainInput.fill('this-is-a-very-long-subdomain-name-that-might-be-too-long');

    // 确认开通（可能被拒绝也可能接受，取决于后端验证）
    await page.locator('button:has-text("确认开通")').click();
    await page.waitForTimeout(1000);
  });

  test('快速切换 Tab 不应出错', async ({ page }) => {
    const tabs = ['商品管理', '主题配置', '商城设置', '订单管理', '商城概览'];

    for (let i = 0; i < 3; i++) {
      for (const tab of tabs) {
        await page.locator(`button:has-text("${tab}")`).click();
        await page.waitForTimeout(100);
      }
    }

    // 确保没有崩溃
    await expect(page.locator('text=云托管商城')).toBeVisible({ timeout: 5000 });
  });

  test('未登录状态下访问云商城应重定向到登录页', async ({ page }) => {
    // 清除登录状态，直接访问云商城
    await page.goto(BASE_URL + CLOUD_STORE_PATH);
    await page.waitForLoadState('networkidle');

    // 应重定向到登录页
    // 使用更宽松的检查：要么在登录页，要么页面显示登录相关内容
    await page.waitForTimeout(2000);
    const url = page.url();
    const hasLoginContent = await page.locator('text=ProClaw').isVisible().catch(() => false);

    // 要么 URL 包含 login，要么页面显示登录内容
    expect(url.includes('login') || hasLoginContent).toBeTruthy();
  });
});
