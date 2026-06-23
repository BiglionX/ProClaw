import { generateCodeVerifier, generateCodeChallenge } from './pkce';

const ISSUER = process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc';
const CLIENT_ID = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || 'proclaw-web';
const REDIRECT_URI = process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI || 'https://proclaw.cc/auth/callback';

export interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface IdTokenClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  auth_time?: number;
  nonce?: string;
  email?: string;
  name?: string;
  is_admin?: boolean;
}

export async function startOidcAuth(): Promise<string> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  sessionStorage.setItem('pkce_verifier', verifier);
  sessionStorage.setItem('auth_state', state);
  sessionStorage.setItem('auth_nonce', nonce);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    nonce,
  });

  return ISSUER + '/oauth/authorize?' + params.toString();
}

export async function exchangeCodeForToken(code: string, receivedState: string): Promise<TokenResponse> {
  const savedState = sessionStorage.getItem('auth_state');
  if (receivedState !== savedState) {
    throw new Error('Invalid state');
  }

  const verifier = sessionStorage.getItem('pkce_verifier');
  if (!verifier) {
    throw new Error('No verifier found');
  }

  const response = await fetch(ISSUER + '/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    throw new Error('Token exchange failed: ' + response.status);
  }

  sessionStorage.removeItem('pkce_verifier');
  sessionStorage.removeItem('auth_state');
  sessionStorage.removeItem('auth_nonce');

  const tokens: TokenResponse = await response.json();
  return tokens;
}

export async function refreshToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(ISSUER + '/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed: ' + response.status);
  }

  const tokens: TokenResponse = await response.json();
  return tokens;
}

export async function getUserInfo(accessToken: string): Promise<any> {
  const response = await fetch(ISSUER + '/oauth/userinfo', {
    headers: { Authorization: 'Bearer ' + accessToken },
  });

  if (!response.ok) {
    throw new Error('User info request failed: ' + response.status);
  }

  return await response.json();
}

export async function logout(refreshToken: string): Promise<void> {
  await fetch(ISSUER + '/oauth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refreshToken }),
  });
}

export function getStoredNonce(): string | null {
  return sessionStorage.getItem('auth_nonce');
}
