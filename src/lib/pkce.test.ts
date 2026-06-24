import { describe, it, expect } from 'vitest';
import { generateCodeVerifier, generateCodeChallenge } from './pkce';

describe('PKCE 工具函数', () => {
  it('generateCodeVerifier 应该返回 43 字符的 base64url 字符串', () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toHaveLength(43);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generateCodeVerifier 每次调用应返回不同的值', () => {
    const v1 = generateCodeVerifier();
    const v2 = generateCodeVerifier();
    const v3 = generateCodeVerifier();
    expect(v1).not.toBe(v2);
    expect(v2).not.toBe(v3);
    expect(v1).not.toBe(v3);
  });

  it('generateCodeChallenge 应该返回 43 字符的 SHA-256 哈希', async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).toHaveLength(43);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generateCodeChallenge 对相同输入应该返回相同输出', async () => {
    const verifier = 'test-verifier-fixed-string-for-consistency';
    const c1 = await generateCodeChallenge(verifier);
    const c2 = await generateCodeChallenge(verifier);
    expect(c1).toBe(c2);
  });

  it('generateCodeChallenge 对不同输入应该返回不同输出', async () => {
    const v1 = 'verifier-one-different-string';
    const v2 = 'verifier-two-different-string';
    const c1 = await generateCodeChallenge(v1);
    const c2 = await generateCodeChallenge(v2);
    expect(c1).not.toBe(c2);
  });

  it('PKCE challenge 与 verifier 不应相等（哈希特性）', async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).not.toBe(verifier);
  });

  it('base64url 编码不应包含填充字符 =', () => {
    const verifier = generateCodeVerifier();
    expect(verifier).not.toMatch(/=/);
  });

  it('base64url 编码不应包含标准 base64 字符 + 和 /', () => {
    for (let i = 0; i < 10; i++) {
      const verifier = generateCodeVerifier();
      expect(verifier).not.toMatch(/[+/]/);
    }
  });
});
