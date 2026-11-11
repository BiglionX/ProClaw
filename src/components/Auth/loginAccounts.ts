/**
 * 登录页账号展示：最近登录 + 演示账号，测试垃圾账号默认折叠。
 * 不改鉴权，只决定列表怎么摆。
 */

export const DEMO_ACCOUNT_EMAIL = 'boss@proclaw.demo';
export const DEMO_ACCOUNT_ID = 'mock-boss-001';

export interface LoginAccount {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  last_login_at?: string | null;
}

export function isDemoAccountUser(account: Pick<LoginAccount, 'id' | 'email'>): boolean {
  const email = (account.email || '').trim().toLowerCase();
  return account.id === DEMO_ACCOUNT_ID || email === DEMO_ACCOUNT_EMAIL;
}

/**
 * 测试垃圾账号：`user-时间戳@test.local`、`@test.local` 结尾，
 * 以及一键体验生成的 `boss-时间戳@local.demo`。
 * 正式演示账号 `boss@proclaw.demo` 不会被归进这里。
 */
export function isTestJunkAccount(account: Pick<LoginAccount, 'id' | 'email'>): boolean {
  if (isDemoAccountUser(account)) return false;
  const email = (account.email || '').trim().toLowerCase();
  if (!email) return false;
  if (email.endsWith('test.local')) return true;
  if (/^user-\d+@/.test(email)) return true;
  if (/^(boss|dup)-\d+@/.test(email)) return true;
  return false;
}

export function pickRecentAccount<T extends LoginAccount>(accounts: T[]): T | null {
  const stamped = accounts.filter(account => account.last_login_at);
  if (stamped.length > 0) {
    return [...stamped].sort((a, b) =>
      String(b.last_login_at).localeCompare(String(a.last_login_at)),
    )[0];
  }
  return (
    accounts.find(account => !isTestJunkAccount(account) && !isDemoAccountUser(account)) ||
    accounts.find(account => !isTestJunkAccount(account)) ||
    null
  );
}

/** 登录页默认露出的账号：最近一次登录（若与演示账号不同）+ 演示账号。 */
export function featuredLoginAccounts<T extends LoginAccount>(accounts: T[]): T[] {
  const demo = accounts.find(isDemoAccountUser) || null;
  const recent = pickRecentAccount(accounts);
  const featured: T[] = [];
  if (recent && (!demo || recent.id !== demo.id)) featured.push(recent);
  if (demo) featured.push(demo);
  return featured;
}
