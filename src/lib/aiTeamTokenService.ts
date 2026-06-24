/**
 * AI Team 群聊 Token 管理服务
 * 演示账号赠送 10,000 token，每次 LLM 调用扣减
 */
import { useAuthStore } from './authStore';

const STORAGE_KEY = 'proclaw_ai_team_tokens';
const DEMO_TOKEN_BALANCE = 10000;

/** 演示账号邮箱 */
export const DEMO_EMAIL = 'boss@proclaw.demo';
const DEMO_USER_ID = 'mock-boss-001';

/** 是否为演示账号 */
export function isDemoAccount(): boolean {
  const user = useAuthStore.getState().user;
  if (user?.email === DEMO_EMAIL || user?.id === DEMO_USER_ID) return true;
  try {
    const raw = sessionStorage.getItem('proclaw-auth-session');
    if (raw) {
      const parsed = JSON.parse(raw) as { user?: { email?: string; id?: string } };
      const u = parsed.user;
      if (u?.email === DEMO_EMAIL || u?.id === DEMO_USER_ID) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** 获取 local 存储的 token 余额 */
function getStoredBalance(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseInt(raw, 10) : -1;
  } catch {
    return -1;
  }
}

/** 写入 token 余额到 local 存储 */
function setStoredBalance(balance: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(balance))));
  } catch { /* ignore */ }
}

/** 获取当前可用 token 余额 */
export function getTokenBalance(): number {
  if (!isDemoAccount()) return -1; // 非演示账号不限制
  const stored = getStoredBalance();
  if (stored < 0) {
    // 首次使用，初始化 10000 token
    setStoredBalance(DEMO_TOKEN_BALANCE);
    return DEMO_TOKEN_BALANCE;
  }
  return stored;
}

/** 扣减 token，返回剩余余额。余额不足时抛出错误 */
export function deductTokens(amount: number): number {
  if (!isDemoAccount()) return -1;
  const current = getTokenBalance();
  if (current < amount) {
    throw new Error(`Token 余额不足！当前剩余 ${current} PT，本次需要 ${amount} PT。`);
  }
  const remaining = current - amount;
  setStoredBalance(remaining);
  return remaining;
}

/** 重置演示账号 token（仅开发调试用） */
export function resetDemoTokens(): void {
  setStoredBalance(DEMO_TOKEN_BALANCE);
}

/** 演示账号初始 token 数 */
export { DEMO_TOKEN_BALANCE };
