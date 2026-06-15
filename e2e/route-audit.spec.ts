import { test, expect, Page } from '@playwright/test';
import fs from 'fs';

const SCREENSHOT_DIR = 'd:\\BigLionX\\ProClaw\\test-results\\route-test';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Routes grouped by category
const PUBLIC_ROUTES = ['/login', '/register', '/setup', '/setup-page', '/test'];
const REDIRECT_ROUTES = [
  { from: '/', expect: '/datacenter' },
  { from: '/dashboard', expect: '/datacenter' },
  { from: '/finance', expect: '/datacenter' },
  { from: '/purchase', expect: '/supplychain' },
  { from: '/media-library', expect: '/ai-knowledge' },
  { from: '/qa-library', expect: '/ai-knowledge' },
  { from: '/knowledge-base', expect: '/ai-knowledge' },
];
// /customers, /analytics, /ai-teams are NOT redirects, they are valid routes
const PROTECTED_ROUTES = [
  // Core
  '/datacenter', '/products', '/supplychain', '/settings', '/contacts',
  '/messages', '/call', '/ucenter', '/operations', '/shop/dashboard',
  '/customer-service', '/ai-knowledge', '/sales', '/inventory',
  // AI
  '/teams', '/agents', '/ai-demo', '/ai-sales-order', '/finance-agent', '/project-overview',
  // Aliases
  '/customers', '/analytics', '/ai-teams',
  // Chat/agent dynamic
  '/chat/mock-contact-1', '/agent-profile/mock-agent-1',
  // Industry plugins
  '/pos', '/tables', '/kitchen',
  '/appointments', '/services', '/employees', '/marketing',
  '/pets', '/boarding', '/grooming',
  '/token-billing', '/cloud-backup', '/members',
  '/convenience-pos', '/daily-settlement',
  '/credit-ledger', '/batch-manage',
  '/quotations', '/device-models',
  '/delivery', '/recurring-orders',
  '/vehicle-db', '/oe-search',
  '/hw-credit-ledger', '/cutting-calc',
  '/projects', '/material-bom',
  '/group-buy', '/pickup-verify',
  // Other
  '/faq-management', '/unrecognized-commands', '/user-management',
];

interface RouteResult {
  route: string;
  status: 'OK' | 'BLANK' | 'ERROR' | 'REDIRECT' | 'LOGIN_REQUIRED' | 'CRASH';
  finalUrl: string;
  hasContent: boolean;
  errorText?: string;
  consoleErrors: string[];
}

async function loginAsBoss(page: Page) {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  await page.evaluate(() => {
    const mockUser = {
      id: 'mock-boss-001',
      email: 'boss@proclaw.demo',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const mockSession = {
      access_token: 'mock-access-token-boss',
      refresh_token: 'mock-refresh-token-boss',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: mockUser,
    };
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { user: mockUser, session: mockSession, isLoading: false, error: null, loginDialogOpen: false },
      version: 0,
    }));
  });
}

async function testRoute(page: Page, route: string): Promise<RouteResult> {
  const consoleErrors: string[] = [];
  const handler = (msg: any) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  page.on('console', handler);

  let status: RouteResult['status'] = 'OK';
  let hasContent = false;
  let errorText = '';

  try {
    const url = `http://localhost:3000/#${route}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
    // Just give it a short time to lazy-load
    await page.waitForTimeout(800);

    const finalUrl = page.url();
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    hasContent = bodyText.trim().length > 20;

    if (bodyText.includes('Something went wrong') || bodyText.includes('Application error')) {
      status = 'CRASH';
      errorText = bodyText.substring(0, 200);
    } else if (bodyText.match(/TypeError|ReferenceError|Cannot read|undefined is not/)) {
      status = 'ERROR';
      errorText = bodyText.substring(0, 300);
    } else if (!hasContent) {
      status = 'BLANK';
    }

    const criticalErrors = consoleErrors.filter(e =>
      e.includes('TypeError') || e.includes('ReferenceError') ||
      e.includes('Module not found') || e.includes('Failed to fetch dynamically')
    );
    // Note: Tauri API errors are expected in browser mode, only flag other critical errors
    const nonTauriCritical = criticalErrors.filter(e =>
      !e.includes('__TAURI_INTERNALS__') && !e.includes('window.__TAURI')
    );
    if (nonTauriCritical.length > 0 && status === 'OK') {
      status = 'ERROR';
      errorText = nonTauriCritical[0].substring(0, 200);
    }

    return { route, status, finalUrl, hasContent, errorText, consoleErrors: consoleErrors.slice(0, 3) };
  } catch (e: any) {
    return { route, status: 'CRASH', finalUrl: page.url(), hasContent: false, errorText: e.message, consoleErrors };
  } finally {
    page.off('console', handler);
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('ProClaw Route Audit', () => {
  // Each route as a separate test so one slow page doesn't break others
  for (const route of PUBLIC_ROUTES) {
    test(`PUBLIC: ${route}`, async ({ page }) => {
      test.setTimeout(15000);
      const result = await testRoute(page, route);
      console.log(`[PUBLIC] ${route} → ${result.status}`);
      if (result.status === 'CRASH' || result.status === 'BLANK') {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/FAIL${route.replace(/\//g, '_')}.png` });
      }
    });
  }

  // Setup auth once for protected tests
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsBoss(page);
    await page.close();
  });

  for (const route of PROTECTED_ROUTES) {
    test(`PROTECTED: ${route}`, async ({ page }) => {
      test.setTimeout(15000);
      // Re-login each test to be safe
      await loginAsBoss(page);
      const result = await testRoute(page, route);
      const errMsg = result.errorText ? ` (${result.errorText.substring(0, 80)})` : '';
      console.log(`[PROTECTED] ${route} → ${result.status}${errMsg}`);
      if (result.status === 'CRASH' || result.status === 'BLANK' || result.status === 'ERROR') {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/FAIL${route.replace(/\//g, '_')}.png` });
      }
    });
  }

  for (const { from, expect: expected } of REDIRECT_ROUTES) {
    test(`REDIRECT: ${from} → ${expected}`, async ({ page }) => {
      test.setTimeout(15000);
      await loginAsBoss(page);
      const result = await testRoute(page, from);
      const finalPath = result.finalUrl.split('#')[1] || '';
      const ok = finalPath === expected;
      console.log(`[REDIRECT] ${from} → ${finalPath} (expected ${expected}) → ${ok ? 'OK' : 'FAIL'}`);
      expect(ok, `${from} should redirect to ${expected}, got ${finalPath}`).toBe(true);
    });
  }
});
