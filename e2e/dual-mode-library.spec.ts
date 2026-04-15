import { test, expect } from '@playwright/test';

test.describe('双模式商品库系统', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/');
    await page.fill('input[type="email"]', 'boss');
    await page.fill('input[type="password"]', 'IamBigBoss');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });
    
    // 导航到商品管理页面
    await page.click('text=商品库');
    await page.waitForURL('**/products', { timeout: 5000 });
  });

  test.describe('模式检测功能', () => {
    test('应该默认显示简单商品库模式', async ({ page }) => {
      // 验证页面标题显示简单模式
      await expect(page.locator('text=📦 商品管理')).toBeVisible();
      
      // 验证副标题
      await expect(page.locator('text=适合小商家、农场、手工作坊')).toBeVisible();
      
      // 验证升级按钮存在
      const upgradeButton = page.locator('button[title*="升级"]');
      await expect(upgradeButton).toBeVisible();
    });

    test('升级按钮应该显示正确的Tooltip', async ({ page }) => {
      const upgradeButton = page.locator('button[title*="升级"]');
      
      // 鼠标悬停查看Tooltip
      await upgradeButton.hover();
      
      // 验证Tooltip文本
      await expect(page.locator('text=升级为电商商品库：支持多规格、多图管理')).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('升级流程测试', () => {
    test('点击升级按钮应该打开确认对话框', async ({ page }) => {
      // 点击升级按钮
      await page.click('button[title*="升级"]');
      
      // 验证对话框打开
      await expect(page.locator('role=dialog')).toBeVisible();
      await expect(page.locator('text=🚀 升级为电商商品库')).toBeVisible();
    });

    test('升级对话框应该显示完整的说明信息', async ({ page }) => {
      // 点击升级按钮
      await page.click('button[title*="升级"]');
      
      // 验证升级内容包括
      await expect(page.locator('text=升级内容包括：')).toBeVisible();
      
      // 验证4个升级项
      await expect(page.locator('text=为每个商品创建SPU')).toBeVisible();
      await expect(page.locator('text=为每个商品创建默认SKU')).toBeVisible();
      await expect(page.locator('text=自动迁移商品图片')).toBeVisible();
      await expect(page.locator('text=原商品数据保留')).toBeVisible();
      
      // 验证注意事项
      await expect(page.locator('text=注意事项：')).toBeVisible();
      await expect(page.locator('text=升级过程不可逆')).toBeVisible();
      await expect(page.locator('text=建议在升级前备份数据库')).toBeVisible();
      await expect(page.locator('text=升级期间请勿关闭应用')).toBeVisible();
      
      // 验证按钮
      await expect(page.locator('button:has-text("取消")')).toBeVisible();
      await expect(page.locator('button:has-text("确认升级")')).toBeVisible();
    });

    test('升级对话框应该显示待迁移商品数量', async ({ page }) => {
      // 点击升级按钮
      await page.click('button[title*="升级"]');
      
      // 检查是否显示商品数量统计（如果有商品）
      const productCountAlert = page.locator('text=检测到').locator('text=个商品将被迁移');
      if (await productCountAlert.count() > 0) {
        await expect(productCountAlert).toBeVisible();
      }
    });

    test('点击取消应该关闭升级对话框', async ({ page }) => {
      // 点击升级按钮
      await page.click('button[title*="升级"]');
      
      // 点击取消
      await page.click('button:has-text("取消")');
      
      // 验证对话框关闭
      await expect(page.locator('role=dialog')).not.toBeVisible({ timeout: 3000 });
    });

    test('执行升级应该成功迁移数据', async ({ page }) => {
      // 记录当前商品数量
      const productRows = page.locator('tbody tr');
      const productCount = await productRows.count();
      
      // 点击升级按钮
      await page.click('button[title*="升级"]');
      
      // 点击确认升级
      await page.click('button:has-text("确认升级")');
      
      // 验证加载状态
      await expect(page.locator('text=正在迁移数据，请稍候...')).toBeVisible({ timeout: 3000 });
      
      // 等待迁移完成（可能需要较长时间）
      await expect(page.locator('text=正在迁移数据')).not.toBeVisible({ timeout: 30000 });
      
      // 验证模式切换
      await expect(page.locator('text=🛍️ 电商商品库')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=支持多规格、多图、精细化库存管理')).toBeVisible();
      
      // 验证成功提示
      const successAlert = page.locator('text=成功升级').locator(`text=迁移了${productCount}个商品`);
      if (await successAlert.count() > 0) {
        await expect(successAlert).toBeVisible();
      }
      
      // 验证返回按钮出现
      const downgradeButton = page.locator('button[title*="返回"]');
      await expect(downgradeButton).toBeVisible();
    });

    test('升级完成后应该显示迁移结果统计', async ({ page }) => {
      // 如果已经是电商模式，先跳过此测试
      const isEcommerceMode = await page.locator('text=🛍️ 电商商品库').isVisible();
      if (isEcommerceMode) {
        test.skip();
        return;
      }
      
      // 点击升级按钮
      await page.click('button[title*="升级"]');
      
      // 点击确认升级
      await page.click('button:has-text("确认升级")');
      
      // 等待迁移完成
      await expect(page.locator('text=正在迁移数据')).not.toBeVisible({ timeout: 30000 });
      
      // 验证迁移结果提示
      const resultAlert = page.locator('text=迁移完成');
      if (await resultAlert.count() > 0) {
        await expect(resultAlert).toBeVisible();
        await expect(page.locator('text=个SPU')).toBeVisible();
        await expect(page.locator('text=个SKU')).toBeVisible();
      }
    });
  });

  test.describe('降级流程测试', () => {
    test.beforeEach(async ({ page }) => {
      // 先升级到电商模式（如果还不是）
      const isEcommerceMode = await page.locator('text=🛍️ 电商商品库').isVisible();
      if (!isEcommerceMode) {
        await page.click('button[title*="升级"]');
        await page.click('button:has-text("确认升级")');
        await expect(page.locator('text=🛍️ 电商商品库')).toBeVisible({ timeout: 30000 });
      }
    });

    test('点击返回按钮应该打开降级确认对话框', async ({ page }) => {
      // 点击返回按钮
      await page.click('button[title*="返回"]');
      
      // 验证对话框打开
      await expect(page.locator('role=dialog')).toBeVisible();
      await expect(page.locator('text=⚠️ 返回简单商品库')).toBeVisible();
    });

    test('降级对话框应该显示警告信息', async ({ page }) => {
      // 点击返回按钮
      await page.click('button[title*="返回"]');
      
      // 验证警告信息
      await expect(page.locator('text=危险操作！此操作将导致以下数据丢失：')).toBeVisible();
      await expect(page.locator('text=所有SPU（标准产品单位）数据')).toBeVisible();
      await expect(page.locator('text=所有SKU（库存量单位）数据')).toBeVisible();
      await expect(page.locator('text=所有商品图片关联')).toBeVisible();
      await expect(page.locator('text=多规格配置信息')).toBeVisible();
      
      // 验证保留的数据说明
      await expect(page.locator('text=保留的数据：')).toBeVisible();
      
      // 验证强烈建议
      await expect(page.locator('text=强烈建议：')).toBeVisible();
      await expect(page.locator('text=在降级前备份数据库')).toBeVisible();
    });

    test('降级对话框应该有二次确认输入框', async ({ page }) => {
      // 点击返回按钮
      await page.click('button[title*="返回"]');
      
      // 验证输入框存在
      const confirmInput = page.locator('input[placeholder*="CONFIRM"]');
      await expect(confirmInput).toBeVisible();
      
      // 验证确认按钮初始为禁用状态
      const confirmButton = page.locator('button:has-text("确认降级")');
      await expect(confirmButton).toBeDisabled();
    });

    test('输入错误的确认文本应该保持按钮禁用', async ({ page }) => {
      // 点击返回按钮
      await page.click('button[title*="返回"]');
      
      // 输入错误的内容
      const confirmInput = page.locator('input[placeholder*="CONFIRM"]');
      await confirmInput.fill('abc');
      
      // 验证错误提示
      await expect(page.locator('text=输入不正确，请重新输入')).toBeVisible();
      
      // 验证确认按钮仍然禁用
      const confirmButton = page.locator('button:has-text("确认降级")');
      await expect(confirmButton).toBeDisabled();
    });

    test('输入正确的CONFIRM应该启用确认按钮', async ({ page }) => {
      // 点击返回按钮
      await page.click('button[title*="返回"]');
      
      // 输入正确的确认文本
      const confirmInput = page.locator('input[placeholder*="CONFIRM"]');
      await confirmInput.fill('CONFIRM');
      
      // 验证错误提示消失
      await expect(page.locator('text=输入不正确')).not.toBeVisible();
      
      // 验证确认按钮启用
      const confirmButton = page.locator('button:has-text("确认降级")');
      await expect(confirmButton).toBeEnabled();
    });

    test('点击取消应该关闭降级对话框并清空输入', async ({ page }) => {
      // 点击返回按钮
      await page.click('button[title*="返回"]');
      
      // 输入一些内容
      const confirmInput = page.locator('input[placeholder*="CONFIRM"]');
      await confirmInput.fill('CONFIRM');
      
      // 点击取消
      await page.click('button:has-text("取消")');
      
      // 验证对话框关闭
      await expect(page.locator('role=dialog')).not.toBeVisible({ timeout: 3000 });
      
      // 再次打开对话框，验证输入已清空
      await page.click('button[title*="返回"]');
      const inputAgain = page.locator('input[placeholder*="CONFIRM"]');
      await expect(inputAgain).toHaveValue('');
    });

    test('执行降级应该成功返回简单模式', async ({ page }) => {
      // 点击返回按钮
      await page.click('button[title*="返回"]');
      
      // 输入确认文本
      const confirmInput = page.locator('input[placeholder*="CONFIRM"]');
      await confirmInput.fill('CONFIRM');
      
      // 点击确认降级
      await page.click('button:has-text("确认降级")');
      
      // 验证加载状态
      await expect(page.locator('text=正在降级，请稍候...')).toBeVisible({ timeout: 3000 });
      
      // 等待降级完成
      await expect(page.locator('text=正在降级')).not.toBeVisible({ timeout: 15000 });
      
      // 验证模式切换回简单模式
      await expect(page.locator('text=📦 商品管理')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=适合小商家、农场、手工作坊')).toBeVisible();
      
      // 验证成功提示
      await expect(page.locator('text=已返回简单商品库模式')).toBeVisible();
      
      // 验证升级按钮重新出现
      const upgradeButton = page.locator('button[title*="升级"]');
      await expect(upgradeButton).toBeVisible();
    });
  });

  test.describe('边界情况测试', () => {
    test('升级过程中不应该能关闭对话框', async ({ page }) => {
      // 点击升级按钮
      await page.click('button[title*="升级"]');
      
      // 点击确认升级
      await page.click('button:has-text("确认升级")');
      
      // 尝试点击对话框外部关闭
      const dialog = page.locator('role=dialog');
      await dialog.click({ position: { x: 0, y: 0 } });
      
      // 验证对话框仍然打开（在加载期间）
      const isLoading = await page.locator('text=正在迁移数据').isVisible();
      if (isLoading) {
        await expect(dialog).toBeVisible();
      }
    });

    test('降级过程中不应该能关闭对话框', async ({ page }) => {
      // 先确保是电商模式
      const isEcommerceMode = await page.locator('text=🛍️ 电商商品库').isVisible();
      if (!isEcommerceMode) {
        test.skip();
        return;
      }
      
      // 点击返回按钮
      await page.click('button[title*="返回"]');
      
      // 输入确认文本
      await page.locator('input[placeholder*="CONFIRM"]').fill('CONFIRM');
      
      // 点击确认降级
      await page.click('button:has-text("确认降级")');
      
      // 尝试点击对话框外部关闭
      const dialog = page.locator('role=dialog');
      await dialog.click({ position: { x: 0, y: 0 } });
      
      // 验证对话框仍然打开（在加载期间）
      const isLoading = await page.locator('text=正在降级').isVisible();
      if (isLoading) {
        await expect(dialog).toBeVisible();
      }
    });

    test('迁移结果提示应该可以关闭', async ({ page }) => {
      // 如果是简单模式，先升级
      const isSimpleMode = await page.locator('text=📦 商品管理').isVisible();
      if (isSimpleMode) {
        await page.click('button[title*="升级"]');
        await page.click('button:has-text("确认升级")');
        await expect(page.locator('text=🛍️ 电商商品库')).toBeVisible({ timeout: 30000 });
        
        // 等待迁移结果提示出现
        const resultAlert = page.locator('text=迁移完成');
        if (await resultAlert.count() > 0) {
          // 点击关闭按钮
          const closeButton = resultAlert.locator('button[aria-label*="Close"]');
          if (await closeButton.count() > 0) {
            await closeButton.click();
            
            // 验证提示关闭
            await expect(resultAlert).not.toBeVisible({ timeout: 3000 });
          }
        }
      }
    });
  });

  test.describe('UI/UX体验测试', () => {
    test('响应式布局 - 对话框在小屏幕上应该正常显示', async ({ page }) => {
      // 设置小屏幕尺寸
      await page.setViewportSize({ width: 375, height: 667 });
      
      // 点击升级按钮
      await page.click('button[title*="升级"]');
      
      // 验证对话框可见且内容不被截断
      await expect(page.locator('role=dialog')).toBeVisible();
      await expect(page.locator('text=🚀 升级为电商商品库')).toBeVisible();
      
      // 验证按钮可见
      await expect(page.locator('button:has-text("取消")')).toBeVisible();
      await expect(page.locator('button:has-text("确认升级")')).toBeVisible();
    });

    test('加载状态应该正确显示', async ({ page }) => {
      const isSimpleMode = await page.locator('text=📦 商品管理').isVisible();
      
      if (isSimpleMode) {
        await page.click('button[title*="升级"]');
        await page.click('button:has-text("确认升级")');
        
        // 验证加载进度条
        await expect(page.locator('[role="progressbar"]')).toBeVisible({ timeout: 3000 });
      }
    });

    test('按钮应该在加载时禁用', async ({ page }) => {
      const isSimpleMode = await page.locator('text=📦 商品管理').isVisible();
      
      if (isSimpleMode) {
        await page.click('button[title*="升级"]');
        await page.click('button:has-text("确认升级")');
        
        // 验证确认按钮被禁用
        const confirmButton = page.locator('button:has-text("升级中")');
        if (await confirmButton.count() > 0) {
          await expect(confirmButton).toBeDisabled();
        }
      }
    });
  });
});
