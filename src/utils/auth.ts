import type { CibaAuthConfig, JwtFetchConfig, JwtSignConfig } from '../types';

const base64UrlEncode = (input: string | ArrayBuffer): string => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const hmacAlg = (alg: JwtSignConfig['alg']): string =>
  ({ HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' })[alg];

export async function signJwt(config: JwtSignConfig): Promise<string> {
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = config.header.trim() ? JSON.parse(config.header) : {};
  } catch {
    throw new Error('JWT header is not valid JSON');
  }
  try {
    payload = config.payload.trim() ? JSON.parse(config.payload) : {};
  } catch {
    throw new Error('JWT payload is not valid JSON');
  }
  const now = Math.floor(Date.now() / 1000);
  payload = { iat: now, ...payload };
  if (config.expiresInSec > 0 && payload.exp === undefined) {
    payload.exp = now + config.expiresInSec;
  }
  const fullHeader = { alg: config.alg, typ: 'JWT', ...header };
  const data = `${base64UrlEncode(JSON.stringify(fullHeader))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(config.secret),
    { name: 'HMAC', hash: hmacAlg(config.alg) },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${base64UrlEncode(signature)}`;
}

export interface TokenResult {
  token: string;
  expiresAt?: number; // epoch ms
}

const basicAuthHeader = (clientId: string, clientSecret: string) =>
  `Basic ${btoa(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`)}`;

const readTokenResponse = async (response: Response): Promise<TokenResult> => {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.error_description || data?.error || `HTTP ${response.status}`;
    throw new Error(`Token request failed: ${detail}`);
  }
  if (!data?.access_token) {
    throw new Error('Token response did not contain an access_token');
  }
  const expiresAt = typeof data.expires_in === 'number' ? Date.now() + data.expires_in * 1000 : undefined;
  return { token: data.access_token, expiresAt };
};

export async function fetchOAuthToken(config: JwtFetchConfig): Promise<TokenResult> {
  const params = new URLSearchParams({ grant_type: config.grantType });
  if (config.scope) params.set('scope', config.scope);
  if (config.grantType === 'password') {
    params.set('username', config.username);
    params.set('password', config.password);
  }
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(config.clientId, config.clientSecret),
    },
    body: params.toString(),
  });
  return readTokenResponse(response);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchCibaToken(
  config: CibaAuthConfig,
  onStatus?: (message: string) => void,
): Promise<TokenResult> {
  const authParams = new URLSearchParams({
    client_id: config.clientId,
    scope: config.scope || 'openid',
    login_hint: config.loginHint,
  });
  if (config.bindingMessage) authParams.set('binding_message', config.bindingMessage);
  if (config.expiresInSec > 0) authParams.set('requested_expiry', String(config.expiresInSec));

  onStatus?.('Sending backchannel authentication request…');
  const authResponse = await fetch(config.authEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(config.clientId, config.clientSecret),
    },
    body: authParams.toString(),
  });
  const authData = await authResponse.json().catch(() => null);
  if (!authResponse.ok || !authData?.auth_req_id) {
    const detail = authData?.error_description || authData?.error || `HTTP ${authResponse.status}`;
    throw new Error(`CIBA initiation failed: ${detail}`);
  }
  const authReqId: string = authData.auth_req_id;
  const intervalMs = Math.max(config.pollIntervalSec || authData.interval || 5, 1) * 1000;
  const deadline = Date.now() + (authData.expires_in || config.expiresInSec || 120) * 1000;

  onStatus?.('Waiting for user approval on their device…');
  while (Date.now() < deadline) {
    await sleep(intervalMs);
    const tokenParams = new URLSearchParams({
      grant_type: 'urn:openid:params:grant-type:ciba',
      auth_req_id: authReqId,
    });
    const tokenResponse = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: basicAuthHeader(config.clientId, config.clientSecret),
      },
      body: tokenParams.toString(),
    });
    const data = await tokenResponse.json().catch(() => null);
    if (tokenResponse.ok) {
      if (!data?.access_token) throw new Error('Token response did not contain an access_token');
      const expiresAt = typeof data.expires_in === 'number' ? Date.now() + data.expires_in * 1000 : undefined;
      return { token: data.access_token, expiresAt };
    }
    const error = data?.error;
    if (error === 'authorization_pending') continue;
    if (error === 'slow_down') {
      onStatus?.('Server asked to slow down; increasing poll interval…');
      await sleep(intervalMs);
      continue;
    }
    if (error === 'expired_token') throw new Error('CIBA request expired before approval');
    if (error === 'access_denied') throw new Error('User denied the CIBA authentication request');
    throw new Error(`CIBA token polling failed: ${data?.error_description || error || `HTTP ${tokenResponse.status}`}`);
  }
  throw new Error('CIBA request timed out waiting for user approval');
}
