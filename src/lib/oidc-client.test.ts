import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  startOidcAuth,
  exchangeCodeForToken,
  refreshToken,
  getUserInfo,
  logout,
  clearOidcState,
  getStoredNonce,
  type TokenResponse,
  type IdTokenClaims,
} from './oidc-client';

describe('OIDC 客户端 - URL 构造', () => {
  it('startOidcAuth 应该返回完整的授权 URL', async () => {
    const url = await startOidcAuth();
    expect(url).toMatch(/^https:\/\/account\.proclaw\.cc\/oauth\/authorize\?/);
  });

  it('startOidcAuth URL 应包含所有 OIDC 必需参数', async () => {
    const url = await startOidcAuth();
    expect(url).toContain('response_type=code');
    expect(url).toContain('client_id=proclaw_desktop');
    expect(url).toContain('redirect_uri=');
    expect(url).toContain('scope=openid+profile+email');
    expect(url).toContain('state=');
    expect(url).toContain('code_challenge=');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('nonce=');
  });

  it('每次 startOidcAuth 调用应返回不同的 state 和 nonce', async () => {
    const url1 = await startOidcAuth();
    const url2 = await startOidcAuth();
    const params1 = new URL(url1).searchParams;
    const params2 = new URL(url2).searchParams;
    expect(params1.get('state')).not.toBe(params2.get('state'));
    expect(params1.get('nonce')).not.toBe(params2.get('nonce'));
  });

  it('code_challenge 应该是 base64url 编码的 43 字符', async () => {
    const url = await startOidcAuth();
    const challenge = new URL(url).searchParams.get('code_challenge');
    expect(challenge).toHaveLength(43);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('OIDC 客户端 - State 管理', () => {
  beforeEach(() => {
    clearOidcState();
  });

  it('startOidcAuth 后应该存储 nonce', async () => {
    expect(getStoredNonce()).toBeNull();
    await startOidcAuth();
    const nonce = getStoredNonce();
    expect(nonce).not.toBeNull();
    expect(nonce).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('clearOidcState 应该清空所有存储', async () => {
    await startOidcAuth();
    expect(getStoredNonce()).not.toBeNull();
    clearOidcState();
    expect(getStoredNonce()).toBeNull();
  });
});

describe('OIDC 客户端 - State 验证', () => {
  beforeEach(() => {
    clearOidcState();
  });

  it('exchangeCodeForToken 在 state 不匹配时应抛出错误', async () => {
    await startOidcAuth();
    await expect(
      exchangeCodeForToken('valid-code', 'tampered-state')
    ).rejects.toThrow('Invalid state');
  });

  it('exchangeCodeForToken 在未启动 auth 时应抛出 Invalid state', async () => {
    await expect(
      exchangeCodeForToken('some-code', 'some-state')
    ).rejects.toThrow('Invalid state');
  });
});

describe('OIDC 客户端 - 网络请求', () => {
  beforeEach(() => {
    clearOidcState();
  });

  it('exchangeCodeForToken 在服务器错误时应抛出错误', async () => {
    const state = new URL(await startOidcAuth()).searchParams.get('state');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
    });
    global.fetch = mockFetch as any;

    await expect(
      exchangeCodeForToken('valid-code', state!)
    ).rejects.toThrow('Token exchange failed: 400');
  });

  it('refreshToken 在网络错误时应抛出错误', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    global.fetch = mockFetch as any;

    await expect(refreshToken('some-refresh-token')).rejects.toThrow(
      'Token refresh failed: 500'
    );
  });

  it('refreshToken 成功时应返回新的 token', async () => {
    const mockTokens: TokenResponse = {
      access_token: 'new-access',
      id_token: 'new-id',
      refresh_token: 'new-refresh',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'openid profile email',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTokens,
    });
    global.fetch = mockFetch as any;

    const result = await refreshToken('old-refresh');
    expect(result).toEqual(mockTokens);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://account.proclaw.cc/oauth/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    );
  });

  it('getUserInfo 应使用 Bearer token 发送请求', async () => {
    const mockUser: IdTokenClaims & { email: string; name: string; is_admin: boolean } = {
      iss: 'https://account.proclaw.cc',
      sub: 'user-123',
      aud: 'proclaw_desktop',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      email: 'test@proclaw.cc',
      name: 'Test User',
      is_admin: false,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    });
    global.fetch = mockFetch as any;

    const result = await getUserInfo('test-access-token');
    expect(result).toEqual(mockUser);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://account.proclaw.cc/oauth/userinfo',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-access-token' },
      })
    );
  });

  it('logout 应发送 POST 到 logout 端点', async () => {
    const mockFetch = vi.fn().mockResolvedValue({});
    global.fetch = mockFetch as any;

    await logout('some-refresh-token');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://account.proclaw.cc/oauth/logout',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});
