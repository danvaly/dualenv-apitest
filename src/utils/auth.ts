import type { AuthConfig, CibaAuthConfig, Environment, EnvironmentVariable, JwtAuthConfig, JwtFetchConfig, JwtSignConfig } from '../types';

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

const substitute = (text: string, variables: EnvironmentVariable[]): string => {
  let result = text;
  for (const variable of variables) {
    if (variable.enabled) {
      result = result.replace(new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g'), variable.value);
    }
  }
  return result;
};

const substituteAuthFields = (config: AuthConfig, variables: EnvironmentVariable[]): AuthConfig => {
  const sub = (value?: string) => (value ? substitute(value, variables) : value);
  const next: AuthConfig = { ...config, token: sub(config.token), username: sub(config.username), password: sub(config.password) };
  if (config.jwt) {
    next.jwt = {
      ...config.jwt,
      fetch: { ...config.jwt.fetch } as JwtFetchConfig,
      sign: { ...config.jwt.sign, secret: sub(config.jwt.sign.secret) || '' } as JwtSignConfig,
    };
    (Object.keys(next.jwt.fetch) as Array<keyof JwtFetchConfig>).forEach(key => {
      const value = next.jwt!.fetch[key];
      if (typeof value === 'string') next.jwt!.fetch[key] = substitute(value, variables) as never;
    });
    next.jwt.sign.header = substitute(next.jwt.sign.header, variables);
    next.jwt.sign.payload = substitute(next.jwt.sign.payload, variables);
  }
  if (config.ciba) {
    next.ciba = { ...config.ciba };
    (['authEndpoint', 'tokenEndpoint', 'clientId', 'clientSecret', 'scope', 'loginHint', 'bindingMessage'] as const).forEach(key => {
      next.ciba![key] = substitute(config.ciba![key], variables);
    });
  }
  return next;
};

/** Resolve the effective auth config for a request against an environment ('inherit' pulls from env). */
export function resolveAuthConfig(requestAuth: AuthConfig | undefined, env: Environment | null): AuthConfig | undefined {
  if (!requestAuth || requestAuth.type === 'none') return requestAuth;
  if (requestAuth.type === 'inherit') return env?.auth;
  return requestAuth;
}

/**
 * Resolve + substitute auth, and ensure a valid token for jwt/ciba types
 * (refreshing when missing or expired). Returns the effective config with a
 * fresh token set, or null when nothing needs to change.
 */
export async function ensureFreshAuth(
  requestAuth: AuthConfig | undefined,
  env: Environment | null,
  onStatus?: (message: string) => void,
): Promise<AuthConfig | undefined> {
  const resolved = resolveAuthConfig(requestAuth, env);
  if (!resolved || resolved.type === 'none' || resolved.type === 'inherit') return resolved;
  const config = substituteAuthFields(resolved, env?.variables || []);
  if (config.type === 'bearer' || config.type === 'basic') return config;
  const stillValid = config.token && config.tokenExpiresAt && Date.now() < config.tokenExpiresAt - 5000;
  if (stillValid) return config;
  if (config.type === 'jwt' && config.jwt) {
    if (config.jwt.mode === 'sign') {
      const token = await signJwt(config.jwt.sign);
      const expiresAt = config.jwt.sign.expiresInSec > 0 ? Date.now() + config.jwt.sign.expiresInSec * 1000 : undefined;
      return { ...config, token, tokenExpiresAt: expiresAt };
    }
    const result = await fetchOAuthToken(config.jwt.fetch);
    return { ...config, token: result.token, tokenExpiresAt: result.expiresAt };
  }
  if (config.type === 'ciba' && config.ciba) {
    const result = await fetchCibaToken(config.ciba, onStatus);
    return { ...config, token: result.token, tokenExpiresAt: result.expiresAt };
  }
  return config;
}

/** Build the Authorization header value for an auth config, if any. */
export function authorizationHeader(config: AuthConfig | undefined): string | null {
  if (!config) return null;
  if ((config.type === 'bearer' || config.type === 'jwt' || config.type === 'ciba') && config.token) {
    return `Bearer ${config.token}`;
  }
  if (config.type === 'basic' && (config.username || config.password)) {
    return `Basic ${btoa(`${config.username || ''}:${config.password || ''}`)}`;
  }
  return null;
}

export const defaultJwtConfig = (): JwtAuthConfig => ({
  mode: 'fetch',
  fetch: { tokenUrl: '', grantType: 'client_credentials', clientId: '', clientSecret: '', scope: '', username: '', password: '' },
  sign: { alg: 'HS256', secret: '', header: '', payload: '', expiresInSec: 3600 },
});

export const defaultCibaConfig = (): CibaAuthConfig => ({
  authEndpoint: '', tokenEndpoint: '', clientId: '', clientSecret: '', scope: 'openid',
  loginHint: '', bindingMessage: '', pollIntervalSec: 5, expiresInSec: 120,
});
