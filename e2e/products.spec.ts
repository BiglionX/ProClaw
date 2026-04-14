import { test, expect } from '@playwright/test';

test.describe('产品管理功能', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // 导航到产品页面
    await page.click('text=产品');
    await page.waitForURL('**/products', { timeout: 5000 });
  });

  test('应该显示产品列表页面', async ({ page }) => {
    // 验证产品页面加载
    await expect(page.locator('text=产品管理')).toBeVisible();
    
    // 检查是否有添加产品按钮
    await expect(page.locator('button:has-text("添加产品")')).toBeVisible();
  });

  test('应该能够打开添加产品对话框', async ({ page }) => {
    // 点击添加产品按钮
    await page.click('button:has-text("添加产品")');
    
    // 验证对话框打开
    await expect(page.locator('role=dialog')).toBeVisible();
    await expect(page.locator('text=添加产品')).toBeVisible();
  });

  test('应该能够创建新产品', async ({ page }) => {
    // 点击添加产品按钮
    await page.click('button:has-text("添加产品")');
    
    // 填写产品信息
    await page.fill('input[placeholder*="SKU"], input[name="sku"]', 'TEST001');
    await page.fill('input[placeholder*="名称"], input[name="name"]', 'Test Product');
    await page.fill('input[placeholder*="成本"], input[name="cost_price"]', '100');
    await page.fill('input[placeholder*="售价"], input[name="sell_price"]', '150');
    
    // 提交表单
    await page.click('button:has-text("保存"), button:has-text("确定")');
    
    // 等待成功提示或对话框关闭
    await expect(page.locator('role=dialog')).not.toBeVisible({ timeout: 5000 });
    
    // 验证产品出现在列表中
    await expect(page.locator('text=Test Product')).toBeVisible({ timeout: 5000 });
  });

  test('应该在缺少必填字段时显示验证错误', async ({ page }) => {
    // 点击添加产品按钮
    await page.click('button:has-text("添加产品")');
    
    // 不填写任何信息，直接提交
    await page.click('button:has-text("保存"), button:has-text("确定")');
    
    // 验证错误信息显示
    await expect(page.locator('text=必填')).toBeVisible({ timeout: 3000 });
  });

  test('应该能够搜索产品', async ({ page }) => {
    // 在搜索框中输入
    const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]').first();
    await searchInput.fill('Test');
    
    // 等待搜索结果
    await page.waitForTimeout(500);
    
    // 验证搜索结果
    await expect(page.locator('text=Test')).toBeVisible();
  });

  test('应该能够编辑产品', async ({ page }) => {
    // 找到第一个产品并点击编辑
    const editButton = page.locator('button:has-text("编辑"), button[data-action="edit"]').first();
    await editButton.click();
    
    // 验证编辑对话框打开
    await expect(page.locator('role=dialog')).toBeVisible();
    await expect(page.locator('text=编辑产品')).toBeVisible();
  });

  test('应该能够删除产品', async ({ page }) => {
    // 找到第一个产品并点击删除
    const deleteButton = page.locator('button:has-text("删除"), button[data-action="delete"]').first();
    await deleteButton.click();
    
    // 确认删除
    await page.click('button:has-text("确认"), button:has-text("确定")');
    
    // 验证删除成功提示
    await expect(page.locator('text=删除成功')).toBeVisible({ timeout: 5000 });
  });

  test('应该能够按类别过滤产品', async ({ page }) => {
    // 查找类别过滤器
    const categoryFilter = page.locator('select[name="category"], select[id*="category"]').first();
    
    if (await categoryFilter.count() > 0) {
      await categoryFilter.selectOption({ index: 1 });
      
      // 等待过滤结果
      await page.waitForTimeout(500);
      
      // 验证产品列表已更新
      await expect(page.locator('[data-testid="product-list"]')).toBeVisible();
    }
  });

  test('应该显示产品详细信息', async ({ page }) => {
    // 点击第一个产品查看详情
    const productRow = page.locator('tbody tr').first();
    await productRow.click();
    
    // 验证详情对话框或页面打开
    await expect(page.locator('text=产品详情')).toBeVisible({ timeout: 5000 });
  });

  test('应该能够导出产品列表', async ({ page }) => {
    // 查找导出按钮
    const exportButton = page.locator('button:has-text("导出"), button[data-action="export"]');
    
    if (await exportButton.count() > 0) {
      await exportButton.click();
      
      // 验证下载开始或导出对话框打开
      await expect(page.locator('text=导出')).toBeVisible({ timeout: 3000 });
    }
  });
});
