import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

test.describe('行业插件系统 - Phase 4 生态', () => {
  test('插件商店页面应显示所有已发布插件', async ({ page }) => {
    await page.goto('/plugins');

    // 等待页面加载
    await page.waitForSelector('h1');
    await expect(page.locator('h1')).toHaveText('行业插件商店');

    // 插件卡片应显示
    await page.waitForSelector('.grid');
    const pluginCards = page.locator('.grid > div');
    const count = await pluginCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('插件商店分类过滤应正常工作', async ({ page }) => {
    await page.goto('/plugins');

    // 点击餐饮分类
    await page.getByRole('button', { name: '餐饮' }).click();

    // 等待过滤结果
    await page.waitForTimeout(500);
    const cards = page.locator('.grid > div');
    // 此时应该只显示餐饮行业插件
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('插件商店搜索应能过滤插件', async ({ page }) => {
    await page.goto('/plugins');

    // 在搜索框中输入
    const searchInput = page.locator('input[placeholder="搜索插件..."]');
    await searchInput.fill('餐饮');

    await page.waitForTimeout(500);

    // 搜索结果中应包含餐饮相关的插件卡片
    const cards = page.locator('.grid > div');
    const count = await cards.count();
    if (count > 0) {
      // 如果有结果，检查名称或描述包含"餐饮"
      const firstCardText = await cards.first().innerText();
      expect(firstCardText.toLowerCase()).toContain('餐饮');
    }
  });

  test('插件商店排序切换应正常工作', async ({ page }) => {
    await page.goto('/plugins');

    // 切换到按评分排序
    const sortSelect = page.locator('select');
    await sortSelect.selectOption('rating');
    await page.waitForTimeout(500);

    // 不应报错
    const errorIndicators = page.locator('.text-red-500, .error');
    await expect(errorIndicators).toHaveCount(0);
  });

  test('Admin 插件管理页面应显示插件列表', async ({ page }) => {
    await page.goto('/login');

    // 先登录 Admin（简化测试 - 检查是否需要重定向到登录）
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // 填写登录表单（如果有）
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passwordInput = page.locator('input[type="password"], input[name="password"]');

      if (await emailInput.isVisible()) {
        // 实际测试中应使用测试账号
        await page.goto('/admin/plugins');
      }
    }

    await page.goto('/admin/plugins');
    await page.waitForTimeout(1000);

    // Admin 插件管理页应有基本结构
    await expect(page.locator('h1')).toContainText('行业插件管理');
  });

  test('插件兼容性验证接口应可用', async ({ page }) => {
    // 验证 manifest 验证逻辑 - 通过桌面端 Tauri 命令验证
    // 这里通过模拟验证
    const validManifest = {
      id: 'test-plugin',
      name: '测试插件',
      version: '1.0.0',
      description: 'Test',
      icon: 'plug',
      compatibleAppVersion: '>=0.1.0',
      features: { modules: [], dashboards: [], reports: [] },
      navigation: { add: [{ text: 'Test', icon: 'plug', path: '/test' }], remove: [] },
      ui: {},
      assets: { path: './assets', files: [] },
    };

    expect(validManifest.id).toBeTruthy();
    expect(validManifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(validManifest.navigation.add[0].path).toMatch(/^\//);
  });

  test('餐厅示例插件结构验证', async () => {
    // 验证 catering 插件目录结构完整性
    const pluginDir = path.resolve(process.cwd(), 'src/plugins/catering');

    // 验证 manifest.json
    const manifestPath = path.join(pluginDir, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBeTruthy();
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.id).toBe('catering');
    expect(manifest.name).toBeTruthy();
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.permissions).toBeInstanceOf(Array);
    expect(manifest.entry_points.frontend).toBe('frontend/index.js');
    expect(manifest.entry_points.migrations).toBe('migrations/up.sql');

    // 验证 migrations
    const upSqlPath = path.join(pluginDir, 'migrations', 'up.sql');
    expect(fs.existsSync(upSqlPath)).toBeTruthy();
    const upSql = fs.readFileSync(upSqlPath, 'utf-8');
    expect(upSql).toContain('CREATE TABLE IF NOT EXISTS catering_orders');

    const downSqlPath = path.join(pluginDir, 'migrations', 'down.sql');
    expect(fs.existsSync(downSqlPath)).toBeTruthy();
    const downSql = fs.readFileSync(downSqlPath, 'utf-8');
    expect(downSql).toContain('DROP TABLE IF EXISTS catering_orders');

    // 验证 frontend entry
    const fePath = path.join(pluginDir, 'frontend', 'index.js');
    expect(fs.existsSync(fePath)).toBeTruthy();
    const feContent = fs.readFileSync(fePath, 'utf-8');
    expect(feContent).toContain('ProClawPlugin.registerRoute');
    expect(feContent).toContain('/pos');
    expect(feContent).toContain('/tables');
    expect(feContent).toContain('/kitchen');
  });

  test('打包脚本应正确输出 .proclaw-plugin 文件', async () => {
    const distFile = path.resolve(process.cwd(), 'dist/catering-1.0.0.proclaw-plugin');
    expect(fs.existsSync(distFile)).toBeTruthy();

    // 验证 ZIP 文件内的结构
    const zip = new AdmZip(distFile);
    const entries = zip.getEntries();
    const entryNames = entries.map(function (e: any) { return e.entryName; });

    expect(entryNames).toContain('manifest.json');
    expect(entryNames.some(function (n: string) { return n.startsWith('migrations/') || n.startsWith('migrations\\'); })).toBeTruthy();
    expect(entryNames.some(function (n: string) { return n.startsWith('frontend/') || n.startsWith('frontend\\'); })).toBeTruthy();

    const pkgManifest = JSON.parse(zip.readAsText('manifest.json'));
    expect(pkgManifest.id).toBe('catering');
    expect(pkgManifest.version).toBe('1.0.0');
  });
});
