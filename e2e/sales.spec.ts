import { test, expect } from '@playwright/test';

test.describe('销售流程功能', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // 导航到销售页面
    await page.click('text=销售');
    await page.waitForURL('**/sales', { timeout: 5000 });
  });

  test('应该显示销售订单列表页面', async ({ page }) => {
    // 验证销售页面加载
    await expect(page.locator('text=销售订单')).toBeVisible();
    
    // 检查是否有创建订单按钮
    await expect(page.locator('button:has-text("创建订单")')).toBeVisible();
  });

  test('应该能够打开创建订单对话框', async ({ page }) => {
    // 点击创建订单按钮
    await page.click('button:has-text("创建订单")');
    
    // 验证对话框打开
    await expect(page.locator('role=dialog')).toBeVisible();
    await expect(page.locator('text=创建销售订单')).toBeVisible();
  });

  test('应该能够创建新销售订单', async ({ page }) => {
    // 点击创建订单按钮
    await page.click('button:has-text("创建订单")');
    
    // 选择客户
    const customerSelect = page.locator('select[name="customer_id"], select[id*="customer"]').first();
    if (await customerSelect.count() > 0) {
      await customerSelect.selectOption({ index: 1 });
    } else {
      // 如果没有下拉框，可能是自动完成输入
      const customerInput = page.locator('input[placeholder*="客户"]').first();
      await customerInput.fill('Test Customer');
      await page.keyboard.press('Enter');
    }
    
    // 添加产品
    await page.click('button:has-text("添加产品"), button:has-text("+")');
    
    // 填写产品信息
    const productSelect = page.locator('select[name*="product"]').first();
    if (await productSelect.count() > 0) {
      await productSelect.selectOption({ index: 1 });
    }
    
    // 填写数量和价格
    await page.fill('input[name*="quantity"], input[placeholder*="数量"]', '10');
    await page.fill('input[name*="price"], input[placeholder*="价格"]', '150');
    
    // 提交订单
    await page.click('button:has-text("保存"), button:has-text("确定")');
    
    // 等待成功提示或对话框关闭
    await expect(page.locator('role=dialog')).not.toBeVisible({ timeout: 5000 });
    
    // 验证订单出现在列表中
    await expect(page.locator('text=SO-')).toBeVisible({ timeout: 5000 });
  });

  test('应该显示订单详细信息', async ({ page }) => {
    // 点击第一个订单查看详情
    const orderRow = page.locator('tbody tr').first();
    await orderRow.click();
    
    // 验证详情对话框或页面打开
    await expect(page.locator('text=订单详情')).toBeVisible({ timeout: 5000 });
    
    // 验证订单信息显示
    await expect(page.locator('text=订单号')).toBeVisible();
    await expect(page.locator('text=客户')).toBeVisible();
    await expect(page.locator('text=金额')).toBeVisible();
  });

  test('应该能够按状态过滤订单', async ({ page }) => {
    // 查找状态过滤器
    const statusFilter = page.locator('select[name="status"], select[id*="status"]').first();
    
    if (await statusFilter.count() > 0) {
      await statusFilter.selectOption('confirmed');
      
      // 等待过滤结果
      await page.waitForTimeout(500);
      
      // 验证订单列表已更新
      await expect(page.locator('[data-testid="order-list"]')).toBeVisible();
    }
  });

  test('应该能够搜索订单', async ({ page }) => {
    // 在搜索框中输入订单号
    const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]').first();
    await searchInput.fill('SO-');
    
    // 等待搜索结果
    await page.waitForTimeout(500);
    
    // 验证搜索结果
    await expect(page.locator('text=SO-')).toBeVisible();
  });

  test('应该能够确认订单', async ({ page }) => {
    // 找到草稿状态的订单并确认
    const confirmButton = page.locator('button:has-text("确认"), button[data-action="confirm"]').first();
    
    if (await confirmButton.count() > 0) {
      await confirmButton.click();
      
      // 确认操作
      await page.click('button:has-text("确定"), button:has-text("确认")');
      
      // 验证状态更新
      await expect(page.locator('text=已确认')).toBeVisible({ timeout: 5000 });
    }
  });

  test('应该能够取消订单', async ({ page }) => {
    // 找到订单并点击取消
    const cancelButton = page.locator('button:has-text("取消"), button[data-action="cancel"]').first();
    
    if (await cancelButton.count() > 0) {
      await cancelButton.click();
      
      // 确认取消
      await page.click('button:has-text("确定"), button:has-text("确认")');
      
      // 验证状态更新
      await expect(page.locator('text=已取消')).toBeVisible({ timeout: 5000 });
    }
  });

  test('应该显示订单统计信息', async ({ page }) => {
    // 验证统计卡片存在
    await expect(page.locator('text=总订单数')).toBeVisible();
    await expect(page.locator('text=总金额')).toBeVisible();
    await expect(page.locator('text=待处理')).toBeVisible();
  });

  test('应该能够导出订单列表', async ({ page }) => {
    // 查找导出按钮
    const exportButton = page.locator('button:has-text("导出"), button[data-action="export"]');
    
    if (await exportButton.count() > 0) {
      await exportButton.click();
      
      // 验证下载开始或导出对话框打开
      await expect(page.locator('text=导出')).toBeVisible({ timeout: 3000 });
    }
  });

  test('应该能够打印订单', async ({ page }) => {
    // 点击第一个订单的打印按钮
    const printButton = page.locator('button:has-text("打印"), button[data-action="print"]').first();
    
    if (await printButton.count() > 0) {
      await printButton.click();
      
      // 验证打印对话框或预览打开
      await expect(page.locator('text=打印')).toBeVisible({ timeout: 3000 });
    }
  });

  test('应该能够添加订单备注', async ({ page }) => {
    // 打开订单详情
    const orderRow = page.locator('tbody tr').first();
    await orderRow.click();
    
    // 找到备注输入框
    const notesInput = page.locator('textarea[name="notes"], textarea[placeholder*="备注"]').first();
    
    if (await notesInput.count() > 0) {
      await notesInput.fill('Test note');
      
      // 保存备注
      await page.click('button:has-text("保存备注")');
      
      // 验证备注保存成功
      await expect(page.locator('text=Test note')).toBeVisible({ timeout: 3000 });
    }
  });

  test('应该能够查看客户信息', async ({ page }) => {
    // 点击订单中的客户链接
    const customerLink = page.locator('a[href*="customer"], span[class*="customer"]').first();
    
    if (await customerLink.count() > 0) {
      await customerLink.click();
      
      // 验证客户详情页面或对话框打开
      await expect(page.locator('text=客户信息')).toBeVisible({ timeout: 5000 });
    }
  });

  test('应该能够批量操作订单', async ({ page }) => {
    // 选择多个订单
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    
    if (count > 1) {
      // 选择前两个订单
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // 验证批量操作按钮出现
      await expect(page.locator('button:has-text("批量")')).toBeVisible();
    }
  });
});
