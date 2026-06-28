// debug AC#11：访问 /cloud-backup 看页面状态
import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'F:\\chrome-win64\\chrome.exe',
  });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  page.on('console', msg => console.log(`[browser ${msg.type()}]`, msg.text().slice(0, 200)));
  page.on('pageerror', err => console.log(`[browser error]`, err.message));

  await page.goto('http://localhost:3000/#/');
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.waitForLoadState('networkidle');

  await page.goto('http://localhost:3000/#/cloud-backup');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // 列出所有 dialog
  const dialogs = await page.locator('[role="dialog"]').count();
  console.log('=== Dialog count ===', dialogs);

  // 列出页面所有 role
  const allRoles = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role]')).map(el => ({
      role: el.getAttribute('role'),
      text: el.textContent?.slice(0, 50) || '',
    })).slice(0, 30);
  });
  console.log('=== All roles on page ===', JSON.stringify(allRoles, null, 2));

  // 找身份状态相关文本
  const identityTexts = await page.locator('text=/未登录|离线访客|本地账号|演示/').allTextContents();
  console.log('=== Identity texts ===', identityTexts);

  await page.screenshot({ path: 'test-results/debug-cloud-backup.png', fullPage: true });
  await browser.close();
})();