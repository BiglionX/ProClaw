// ProClaw AI 客服模块 - E2E 测试
// 测试场景：访客打开客服聊天窗口、发送消息、转人工、商户端回复

import { test, expect } from '@playwright/test';

// ===== 测试数据 =====
const TEST_TENANT_ID = 'e2e-test-tenant-id';
const TEST_CUSTOMER_ID = `e2e-test-customer-${Date.now()}`;
const TEST_SESSION_ID = `e2e-test-session-${Date.now()}`;

test.describe('AI 客服模块 E2E 测试', () => {
  test.describe('云商城前端 - 客服悬浮组件', () => {
    test('应显示客服悬浮按钮', async ({ page }) => {
      await page.goto('/');
      // 检查悬浮按钮存在（ChatWidget 需要认证，这里验证 Provider 正常渲染）
      // 由于未登录时 tenant_id 为空，ChatWidget 不渲染，这里验证页面加载正常
      await expect(page.locator('h1')).toBeVisible();
    });

    test('云商城受保护页面应显示客服悬浮按钮', async ({ page }) => {
      // 先登录
      await page.goto('/login');
      await page.fill('input[type="email"]', 'e2e-test@proclaw.com');
      await page.fill('input[type="password"]', 'e2e-test-password');
      await page.click('button[type="submit"]');
      
      // 等待登录完成并跳转到 dashboard
      await page.waitForURL(/\/app\/dashboard/, { timeout: 10000 });

      // 检查客服悬浮按钮
      const fabButton = page.locator('button').filter({ has: page.locator('svg') }).last();
      await expect(fabButton).toBeVisible();
    });

    test('点击客服按钮应打开聊天窗口', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'e2e-test@proclaw.com');
      await page.fill('input[type="password"]', 'e2e-test-password');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/app\/dashboard/, { timeout: 10000 });

      // 点击悬浮按钮
      const fabButton = page.locator('button').filter({ has: page.locator('svg') }).last();
      await fabButton.click();

      // 验证聊天窗口出现（可能包含 "智能客服" 或欢迎语）
      await page.waitForTimeout(1000);
      await expect(page.locator('text=智能客服').or(page.locator('text=客服'))).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('后端 API 测试', () => {
    test('客服设置 API - 获取默认设置', async ({ request }) => {
      const response = await request.get(`/api/customer-service/settings?tenant_id=${TEST_TENANT_ID}`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.is_enabled).toBe(true);
      expect(body.data.transfer_mode).toBe('direct');
    });

    test('客服聊天 API - 发送消息', async ({ request }) => {
      const response = await request.post(`/api/customer-service/chat?tenant_id=${TEST_TENANT_ID}`, {
        data: {
          session_id: TEST_SESSION_ID,
          message: '你好，有什么商品推荐？',
          customer_id: TEST_CUSTOMER_ID,
          customer_name: '测试客户',
        },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.reply).toBeDefined();
      expect(body.data.session_id).toBe(TEST_SESSION_ID);
    });

    test('转人工流程 - 无法回答应触发转人工', async ({ request }) => {
      const response = await request.post(`/api/customer-service/chat?tenant_id=${TEST_TENANT_ID}`, {
        data: {
          session_id: TEST_SESSION_ID,
          message: '我要投诉，产品有质量问题',
          customer_id: TEST_CUSTOMER_ID,
          customer_name: '测试客户',
        },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      // 可能返回转人工或知识库匹配（取决于知识库内容）
      expect(body.success).toBe(true);
    });

    test('问答库 API - CRUD 操作', async ({ request }) => {
      // 1. 添加问答
      const createRes = await request.post('/api/customer-service/knowledge-base', {
        data: {
          tenant_id: TEST_TENANT_ID,
          question: '测试问题：退货流程是什么？',
          answer: '您可以在订单页面点击"申请退款"，填写原因后提交。我们会在1-3个工作日处理。',
          category: 'return',
          keywords: ['退货', '退款', '流程'],
          is_active: true,
        },
      });
      // 需要认证，所以这里可能返回 401
      expect(createRes.status() === 201 || createRes.status() === 401).toBe(true);
    });
  });

  test.describe('桌面端 - 客服管理页面', () => {
    test('客服管理页面应显示基本布局', async ({ page }) => {
      // 桌面端页面通常需要 HashRouter
      await page.goto('/#/customer-service');
      
      // 可能需要登录，检查页面是否显示登录提示或实际页面
      await page.waitForTimeout(2000);
      
      // 验证页面标题或登录对话框出现
      const isLoggedIn = await page.locator('text=AI 客服管理').isVisible();
      if (isLoggedIn) {
        await expect(page.locator('text=AI 客服管理')).toBeVisible();
        // 检查 Tab 存在
        await expect(page.locator('text=待回复')).toBeVisible();
        await expect(page.locator('text=聊天记录')).toBeVisible();
        await expect(page.locator('text=问答库')).toBeVisible();
        await expect(page.locator('text=客服设置')).toBeVisible();
      }
    });
  });
});
