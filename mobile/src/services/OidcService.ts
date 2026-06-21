import { Platform, Linking } from 'react-native';
import { secureGet, secureSet, secureDelete } from './SecureConfig';
import { logger } from '../utils/logger';

const ISSUER = 'https://account.proclaw.cc';
const CLIENT_ID = 'proclaw_mobile';
const REDIRECT_URI = 'proclaw://oauth/callback';

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

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(new Uint8Array(digest));
}

function base64urlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function startOidcAuth(): Promise<string> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  await secureSet('pkce_verifier', verifier);
  await secureSet('auth_state', state);
  await secureSet('auth_nonce', nonce);

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

  const authUrl = ISSUER + '/oauth/authorize?' + params.toString();
  
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Linking.openURL(authUrl).catch(err => {
      logger.error('Failed to open auth URL:', err);
    });
  }

  return authUrl;
}

export async function exchangeCodeForToken(code: string, receivedState: string): Promise<TokenResponse> {
  const savedState = await secureGet('auth_state');
  if (receivedState !== savedState) {
    throw new Error('Invalid state');
  }

  const verifier = await secureGet('pkce_verifier');
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

  await secureDelete('pkce_verifier');
  await secureDelete('auth_state');
  await secureDelete('auth_nonce');

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

export async function getStoredNonce(): Promise<string | null> {
  return await secureGet('auth_nonce');
}
