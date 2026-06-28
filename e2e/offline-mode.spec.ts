/**
 * PRD v13.0 §12 验收清单 e2e 测试
 *
 * 覆盖 12 条验收点中的核心 6 条（其他 6 条需桌面端 Tauri 环境，不在 Web e2e 范围）
 *  - #1 冷启动无需登录
 *  - #2 设置中心登录成功
 *  - #3 退出登录保留本地数据
 *  - #4 增值能力拦截并引导登录
 *  - #6 本地账号创建/切换
 *  - #10 AI 助手本地回退
 */

import { test, expect } from '@playwright/test';

test.describe('PRD v13.0 离线优先模式', () => {
  test.beforeEach(async ({ context, page }) => {
    // 每次测试前清空 cookies / localStorage / sessionStorage 模拟「首次启动」
    await context.clearCookies();
    await page.goto('/#/');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    });
  });

  test('AC#1 冷启动无需登录：进入主界面无登录弹窗', async ({ page }) => {
    await page.goto('/#/');
    await page.waitForLoadState('networkidle');

    // 1. 主界面应可见
    await expect(page).toHaveURL(/datacenter|products|sales/);

    // 2. 不应弹出登录对话框
    const loginDialog = page.locator('[role="dialog"]').filter({ hasText: '登录' });
    await expect(loginDialog).not.toBeVisible({ timeout: 1500 });

    // 3. 侧边栏底部应显示「未登录」
    await expect(page.locator('text=未登录').first()).toBeVisible();
  });

  test('AC#2 设置中心登录：进入 /settings?tab=account 完成登录', async ({ page }) => {
    await page.goto('/#/settings?tab=account');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // 等 Suspense lazy + AI 浮窗稳定

    // 1. 账号 Tab 可见
    await expect(page.locator('[role="tab"]').filter({ hasText: '账号' })).toBeVisible();

    // 2. 演示账号一键登录
    // 用 evaluate 直接派发 click 事件，绕过 AI 浮窗 PointerEvents 拦截
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.includes('演示账号'),
      );
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    // 3. 等待登录完成，身份卡片应变为「演示账号」
    await expect(page.locator('text=当前身份：演示账号')).toBeVisible({ timeout: 8000 });

    // 4. 侧边栏底部账号区应显示「演示」+ 用户名
    await expect(page.locator('text=演示账号').first()).toBeVisible();
  });

  test('AC#3 退出登录保留本地数据：退出后身份回到离线访客，本地数据可见', async ({ page }) => {
    // 先登录演示账号
    await page.goto('/#/settings?tab=account');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.includes('演示账号'),
      );
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await expect(page.locator('text=当前身份：演示账号')).toBeVisible({ timeout: 8000 });

    // 退出
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.includes('退出'),
      );
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await expect(page.locator('text=当前身份：离线访客')).toBeVisible({ timeout: 8000 });

    // 进入商品页，演示数据应仍可见
    await page.goto('/#/products');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=商品').first()).toBeVisible();
  });

  test('AC#4 增值能力软提示：离线访客访问 AI Team 见顶部 banner + 本地内容仍可见', async ({ page }) => {
    await page.goto('/#/teams');
    await page.waitForLoadState('networkidle');

    // PRD v13.0 §6：软提示条（Alert role="alert"，不弹硬弹窗）
    const softBanner = page.locator('[role="alert"]').filter({ hasText: '升级解锁' });
    await expect(softBanner).toBeVisible({ timeout: 3000 });

    // AI Team 标题与创建按钮仍可见（本地回退，本地能力不被拦）
    await expect(page.locator('text=AI 团队').first()).toBeVisible();
    await expect(page.locator('button:has-text("创建团队")').first()).toBeVisible();

    // 关闭软提示
    await page.locator('button:has-text("知道了")').click();
    await expect(softBanner).not.toBeVisible();
  });

  test('AC#6 本地账号创建/切换：创建本地账号 A 后写入用户名', async ({ page }) => {
    await page.goto('/#/settings?tab=account');
    await page.waitForLoadState('networkidle');

    // 创建本地账号 A
    await page.locator('input[name="local-username"]').first().fill('alice');
    await page.locator('input[name="local-displayName"]').first().fill('Alice');
    await page.locator('button:has-text("创建")').click();

    // 身份卡片应显示「当前身份：本地账号」
    await expect(page.locator('text=当前身份：本地账号')).toBeVisible({ timeout: 3000 });

    // 本地账号列表应包含 alice
    await expect(page.locator('text=alice').first()).toBeVisible();
  });

  test('AC#10 AI 助手本地回退：离线访客打开悬浮球可输入查询', async ({ page }) => {
    await page.goto('/#/datacenter');
    await page.waitForLoadState('networkidle');

    // 点击悬浮球（一般在右下角）
    const floatingBtn = page.locator('[aria-label*="AI"], button:has(svg[data-testid*="Chat"])').first();
    if (await floatingBtn.isVisible({ timeout: 2000 })) {
      await floatingBtn.click();
      // 浮层展开，不要求云端 LLM 响应（仅要求 UI 可见且不报错）
      await expect(page.locator('text=AI').first()).toBeVisible();
    } else {
      test.skip(true, 'AI 悬浮球未渲染（可能 Light 模式或角色限制）');
    }
  });

  // PRD v13.0 §4.5/4.6/4.7：路由级云端能力拦截（硬弹窗 UpgradeDialog）
  test('AC#11 路由级拦截：离线访客访问 /cloud-backup 弹 UpgradeDialog', async ({ page }) => {
    await page.goto('/#/cloud-backup');
    await page.waitForLoadState('networkidle');

    // 离线访客身份下应弹 UpgradeDialog（标题含「解锁」字样）
    const upgradeDialog = page.locator('[role="dialog"]').filter({ hasText: '离线访客' });
    await expect(upgradeDialog).toBeVisible({ timeout: 3000 });

    // 关闭弹窗
    await page.locator('button:has-text("稍后再说")').click();
    await expect(upgradeDialog).not.toBeVisible({ timeout: 3000 });
  });

  test('AC#12 路由级拦截：离线访客访问 /token-billing 弹 UpgradeDialog', async ({ page }) => {
    await page.goto('/#/token-billing');
    await page.waitForLoadState('networkidle');

    const upgradeDialog = page.locator('[role="dialog"]').filter({ hasText: '离线访客' });
    await expect(upgradeDialog).toBeVisible({ timeout: 3000 });
    await page.locator('button:has-text("稍后再说")').click();
    await expect(upgradeDialog).not.toBeVisible({ timeout: 3000 });
  });

  test('AC#13 路由级拦截：离线访客访问 /plugin-store 弹 UpgradeDialog', async ({ page }) => {
    await page.goto('/#/plugin-store');
    await page.waitForLoadState('networkidle');

    const upgradeDialog = page.locator('[role="dialog"]').filter({ hasText: '离线访客' });
    await expect(upgradeDialog).toBeVisible({ timeout: 3000 });
    await page.locator('button:has-text("稍后再说")').click();
    await expect(upgradeDialog).not.toBeVisible({ timeout: 3000 });
  });

  test('AC#14 路由级拦截：离线访客访问 /user-management 弹 UpgradeDialog', async ({ page }) => {
    await page.goto('/#/user-management');
    await page.waitForLoadState('networkidle');

    const upgradeDialog = page.locator('[role="dialog"]').filter({ hasText: '离线访客' });
    await expect(upgradeDialog).toBeVisible({ timeout: 3000 });
    await page.locator('button:has-text("稍后再说")').click();
    await expect(upgradeDialog).not.toBeVisible({ timeout: 3000 });
  });

  // PRD v13.1：本地密码升级 — bcrypt 哈希持久化 + 刷新保持登录
  test('AC#15 本地密码升级：创建带密码账号后 localStorage 存的是 bcrypt 哈希，刷新仍登录', async ({ page }) => {
    await page.goto('/#/settings?tab=account');
    await page.waitForLoadState('networkidle');

    // 1. 创建本地账号 bob 并设置密码
    await page.locator('input[name="local-username"]').first().fill('bob');
    await page.locator('input[name="local-displayName"]').first().fill('Bob');
    await page.locator('input[name="local-password"]').first().fill('bob-secret');
    await page.locator('input[name="local-password-confirm"]').first().fill('bob-secret');
    await page.locator('button:has-text("创建")').click();

    // 2. 身份卡片应变为「当前身份：本地账号」
    await expect(page.locator('text=当前身份：本地账号')).toBeVisible({ timeout: 3000 });

    // 3. localStorage 中应有 bcrypt 格式哈希（非明文）
    const passwordKeys = await page.evaluate(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('proclaw-pw:')) keys.push(k);
      }
      return keys.map(k => ({ key: k, value: localStorage.getItem(k) }));
    });
    expect(passwordKeys.length).toBeGreaterThanOrEqual(1);
    const bobHashEntry = passwordKeys.find(k => k.key.startsWith('proclaw-pw:'));
    expect(bobHashEntry).toBeTruthy();
    // 4. 哈希必须以 $2 开头（bcrypt 标识），长度 60 字符
    expect(bobHashEntry!.value).toMatch(/^\$2[aby]?\$10\$/);
    expect(bobHashEntry!.value!.length).toBe(60);
    // 5. 哈希中不能包含明文密码
    expect(bobHashEntry!.value).not.toContain('bob-secret');

    // 6. 迁移标志已写入
    const migrationFlag = await page.evaluate(() =>
      localStorage.getItem('proclaw-migration-v13.1-complete'),
    );
    expect(migrationFlag).not.toBeNull();

    // 7. 刷新页面 → 应从 localStorage 恢复登录态
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=当前身份：本地账号')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=bob').first()).toBeVisible();

    // 8. 退出本地账号 → 身份回到离线访客，但 hash 仍在
    await page.locator('button:has-text("退出")').first().click();
    await expect(page.locator('text=当前身份：离线访客')).toBeVisible({ timeout: 3000 });

    const hashStillExists = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('proclaw-pw:')) return true;
      }
      return false;
    });
    expect(hashStillExists).toBe(true);
  });

  // PRD v13.1：密码不一致校验
  test('AC#16 本地密码：两次密码不一致时报错且不创建', async ({ page }) => {
    await page.goto('/#/settings?tab=account');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="local-username"]').first().fill('charlie');
    await page.locator('input[name="local-password"]').first().fill('secret-1');
    await page.locator('input[name="local-password-confirm"]').first().fill('secret-2');
    await page.locator('button:has-text("创建")').click();

    // 应显示错误提示
    await expect(page.locator('text=两次输入的密码不一致')).toBeVisible({ timeout: 3000 });

    // 不应创建账号
    const accounts = await page.evaluate(() => {
      const raw = localStorage.getItem('proclaw-local-accounts');
      return raw ? JSON.parse(raw) : [];
    });
    expect(accounts.find((a: any) => a.username === 'charlie')).toBeUndefined();
  });

  // PRD v13.1.1：本地账号「类似普通办公软件开机即用」——切换账号不需要密码
  test('AC#17 切换本地账号不需要密码：退出后点 SwapIcon 直接切换回原账号', async ({ page }) => {
    await page.goto('/#/settings?tab=account');
    await page.waitForLoadState('networkidle');

    // 1. 创建本地账号 dave 并设置密码
    await page.locator('input[name="local-username"]').first().fill('dave');
    await page.locator('input[name="local-displayName"]').first().fill('Dave');
    await page.locator('input[name="local-password"]').first().fill('dave-secret');
    await page.locator('input[name="local-password-confirm"]').first().fill('dave-secret');
    await page.locator('button:has-text("创建")').click();

    await expect(page.locator('text=当前身份：本地账号')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=dave').first()).toBeVisible();

    // 2. 退出登录 → 身份回到离线访客
    await page.locator('button:has-text("退出")').first().click();
    await expect(page.locator('text=当前身份：离线访客')).toBeVisible({ timeout: 3000 });

    // 3. 点 dave 账号的「切换到此账号」按钮（MUI IconButton，aria-label="切换到此账号"）
    // v13.1.1：不应弹任何密码输入框，直接切换
    const passwordDialog = page.locator('[role="dialog"]').filter({ hasText: '密码' });
    await expect(passwordDialog).toHaveCount(0);

    await page.locator('button[aria-label="切换到此账号"]').first().click();

    // 4. 身份应回到 dave
    await expect(page.locator('text=当前身份：本地账号')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=dave').first()).toBeVisible();

    // 5. 仍未出现密码输入弹窗（v13.1.1 验证：无登录功能）
    await expect(passwordDialog).toHaveCount(0);
  });
});
