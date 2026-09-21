import React, { useState } from 'react';
import type { AuthConfig, CibaAuthConfig, JwtAuthConfig } from '../types';
import { defaultCibaConfig, defaultJwtConfig, fetchCibaToken, fetchOAuthToken, signJwt } from '../utils/auth';

interface AuthFormProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
  /** show the "Inherit from environment" option (for requests, not environments) */
  allowInherit?: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({ auth, onChange, allowInherit }) => {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const obtainToken = async () => {
    setBusy(true);
    setStatus(null);
    try {
      let result: { token: string; expiresAt?: number };
      if (auth.type === 'jwt') {
        const jwt = auth.jwt || defaultJwtConfig();
        result = jwt.mode === 'sign'
          ? { token: await signJwt(jwt.sign), expiresAt: jwt.sign.expiresInSec > 0 ? Date.now() + jwt.sign.expiresInSec * 1000 : undefined }
          : await fetchOAuthToken(jwt.fetch);
      } else if (auth.type === 'ciba') {
        result = await fetchCibaToken(auth.ciba || defaultCibaConfig(), setStatus);
      } else {
        return;
      }
      onChange({ ...auth, token: result.token, tokenExpiresAt: result.expiresAt });
      setStatus('Token acquired.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const jwt = auth.jwt || defaultJwtConfig();
  const ciba = auth.ciba || defaultCibaConfig();
  const setJwt = (next: JwtAuthConfig) => onChange({ ...auth, jwt: next });
  const setCiba = (next: CibaAuthConfig) => onChange({ ...auth, ciba: next });

  return (
    <div className="space-y-2">
      <select
        aria-label="Authentication type"
        value={auth.type}
        onChange={event => onChange({ ...auth, type: event.target.value as AuthConfig['type'] })}
        className="input text-xs"
      >
        <option value="none">No Auth</option>
        {allowInherit && <option value="inherit">Inherit from Environment</option>}
        <option value="bearer">Bearer Token</option>
        <option value="basic">Basic Auth</option>
        <option value="jwt">JWT Token</option>
        <option value="ciba">CIBA</option>
      </select>

      {auth.type === 'inherit' && (
        <p className="text-[10px] text-text-muted">The selected environment's authentication will be used when sending.</p>
      )}

      {auth.type === 'bearer' && (
        <input className="input text-xs" type="password" value={auth.token || ''} placeholder="Token" onChange={event => onChange({ ...auth, token: event.target.value })} />
      )}

      {auth.type === 'basic' && (
        <div className="grid grid-cols-2 gap-1.5">
          <input className="input text-xs" value={auth.username || ''} placeholder="Username" onChange={event => onChange({ ...auth, username: event.target.value })} />
          <input className="input text-xs" type="password" value={auth.password || ''} placeholder="Password" onChange={event => onChange({ ...auth, password: event.target.value })} />
        </div>
      )}

      {(auth.type === 'jwt' || auth.type === 'ciba') && (
        <div className="space-y-2">
          {auth.type === 'jwt' && <>
            <select aria-label="JWT mode" value={jwt.mode} onChange={event => setJwt({ ...jwt, mode: event.target.value as JwtAuthConfig['mode'] })} className="input text-xs">
              <option value="fetch">Fetch token (OAuth2)</option>
              <option value="sign">Sign JWT locally</option>
            </select>
            {jwt.mode === 'fetch' && <>
              <input className="input text-xs" value={jwt.fetch.tokenUrl} placeholder="Token URL" onChange={event => setJwt({ ...jwt, fetch: { ...jwt.fetch, tokenUrl: event.target.value } })} />
              <select aria-label="Grant type" value={jwt.fetch.grantType} onChange={event => setJwt({ ...jwt, fetch: { ...jwt.fetch, grantType: event.target.value as JwtAuthConfig['fetch']['grantType'] } })} className="input text-xs">
                <option value="client_credentials">Client Credentials</option>
                <option value="password">Resource Owner Password</option>
              </select>
              <div className="grid grid-cols-2 gap-1.5">
                <input className="input text-xs" value={jwt.fetch.clientId} placeholder="Client ID" onChange={event => setJwt({ ...jwt, fetch: { ...jwt.fetch, clientId: event.target.value } })} />
                <input className="input text-xs" type="password" value={jwt.fetch.clientSecret} placeholder="Client Secret" onChange={event => setJwt({ ...jwt, fetch: { ...jwt.fetch, clientSecret: event.target.value } })} />
              </div>
              <input className="input text-xs" value={jwt.fetch.scope} placeholder="Scope (optional)" onChange={event => setJwt({ ...jwt, fetch: { ...jwt.fetch, scope: event.target.value } })} />
              {jwt.fetch.grantType === 'password' && <div className="grid grid-cols-2 gap-1.5">
                <input className="input text-xs" value={jwt.fetch.username} placeholder="Username" onChange={event => setJwt({ ...jwt, fetch: { ...jwt.fetch, username: event.target.value } })} />
                <input className="input text-xs" type="password" value={jwt.fetch.password} placeholder="Password" onChange={event => setJwt({ ...jwt, fetch: { ...jwt.fetch, password: event.target.value } })} />
              </div>}
            </>}
            {jwt.mode === 'sign' && <>
              <div className="grid grid-cols-2 gap-1.5">
                <select aria-label="JWT algorithm" value={jwt.sign.alg} onChange={event => setJwt({ ...jwt, sign: { ...jwt.sign, alg: event.target.value as JwtAuthConfig['sign']['alg'] } })} className="input text-xs">
                  <option value="HS256">HS256</option>
                  <option value="HS384">HS384</option>
                  <option value="HS512">HS512</option>
                </select>
                <input className="input text-xs" type="number" min={0} value={jwt.sign.expiresInSec} placeholder="Expires in (sec, 0 = none)" onChange={event => setJwt({ ...jwt, sign: { ...jwt.sign, expiresInSec: Number(event.target.value) || 0 } })} />
              </div>
              <input className="input text-xs" type="password" value={jwt.sign.secret} placeholder="HMAC secret" onChange={event => setJwt({ ...jwt, sign: { ...jwt.sign, secret: event.target.value } })} />
              <textarea className="input text-xs font-mono" rows={2} value={jwt.sign.header} placeholder='Header JSON (optional), e.g. {"kid":"1"}' onChange={event => setJwt({ ...jwt, sign: { ...jwt.sign, header: event.target.value } })} />
              <textarea className="input text-xs font-mono" rows={3} value={jwt.sign.payload} placeholder='Payload JSON, e.g. {"sub":"user-1"}' onChange={event => setJwt({ ...jwt, sign: { ...jwt.sign, payload: event.target.value } })} />
            </>}
          </>}
          {auth.type === 'ciba' && <>
            <input className="input text-xs" value={ciba.authEndpoint} placeholder="Backchannel authentication endpoint" onChange={event => setCiba({ ...ciba, authEndpoint: event.target.value })} />
            <input className="input text-xs" value={ciba.tokenEndpoint} placeholder="Token endpoint" onChange={event => setCiba({ ...ciba, tokenEndpoint: event.target.value })} />
            <div className="grid grid-cols-2 gap-1.5">
              <input className="input text-xs" value={ciba.clientId} placeholder="Client ID" onChange={event => setCiba({ ...ciba, clientId: event.target.value })} />
              <input className="input text-xs" type="password" value={ciba.clientSecret} placeholder="Client Secret" onChange={event => setCiba({ ...ciba, clientSecret: event.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input className="input text-xs" value={ciba.scope} placeholder="Scope" onChange={event => setCiba({ ...ciba, scope: event.target.value })} />
              <input className="input text-xs" value={ciba.loginHint} placeholder="Login hint (user identifier)" onChange={event => setCiba({ ...ciba, loginHint: event.target.value })} />
            </div>
            <input className="input text-xs" value={ciba.bindingMessage} placeholder="Binding message (optional)" onChange={event => setCiba({ ...ciba, bindingMessage: event.target.value })} />
            <div className="grid grid-cols-2 gap-1.5">
              <label className="text-[10px] text-text-muted">Poll interval (s)<input className="input text-xs mt-0.5" type="number" min={1} value={ciba.pollIntervalSec} onChange={event => setCiba({ ...ciba, pollIntervalSec: Number(event.target.value) || 5 })} /></label>
              <label className="text-[10px] text-text-muted">Requested expiry (s)<input className="input text-xs mt-0.5" type="number" min={0} value={ciba.expiresInSec} onChange={event => setCiba({ ...ciba, expiresInSec: Number(event.target.value) || 0 })} /></label>
            </div>
          </>}
          <button type="button" disabled={busy} onClick={obtainToken} className="btn-primary w-full px-2 py-1 text-xs disabled:opacity-50">
            {busy ? 'Working…' : auth.type === 'jwt' ? (jwt.mode === 'sign' ? 'Generate JWT' : 'Fetch Token') : 'Start CIBA Authentication'}
          </button>
          {auth.token && <input className="input text-xs" type="password" readOnly value={auth.token} title={auth.tokenExpiresAt ? `Expires: ${new Date(auth.tokenExpiresAt).toLocaleString()}` : 'Acquired token'} />}
          {status && <p className="text-[10px] text-text-muted break-all">{status}</p>}
        </div>
      )}
    </div>
  );
};

export default AuthForm;
