import React, { useMemo, useState } from 'react';
import JsonEditor from './JsonEditor';
import type { ApiRequest, CibaAuthConfig, JwtAuthConfig } from '../types';
import { fetchCibaToken, fetchOAuthToken, signJwt } from '../utils/auth';
import Tooltip from './Tooltip';

interface RequestBuilderProps {
  request: ApiRequest;
  onChange: (req: ApiRequest) => void;
  onSend: () => void;
  onCancel?: () => void;
  loading: boolean;
  resolvedUrls?: { env1: string | null; env2: string | null };
  onShowCurl?: (envIndex: 1 | 2) => void;
  isSingleMode?: boolean;
  singleEnvIndex?: 1 | 2 | null;
}

const RequestBuilder: React.FC<RequestBuilderProps> = ({ request, onChange, onSend, onCancel, loading, resolvedUrls, onShowCurl, isSingleMode, singleEnvIndex }) => {
  const [activeSection, setActiveSection] = useState<'params' | 'body' | 'auth' | 'headers' | 'scripts' | 'docs'>('body');
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [editingHeaderKey, setEditingHeaderKey] = useState<string | null>(null);
  const [editingHeaderNewKey, setEditingHeaderNewKey] = useState('');
  const [editingHeaderNewValue, setEditingHeaderNewValue] = useState('');
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [paramDrafts, setParamDrafts] = useState<Array<[string, string]>>([]);
  const bodyType = request.bodyType || (request.body ? 'json' : 'none');
  const queryEntries = useMemo(() => {
    const [, query = ''] = request.endpoint.split('?');
    return Array.from(new URLSearchParams(query).entries());
  }, [request.endpoint]);
  const updateQueryEntries = (entries: Array<[string, string]>) => {
    const path = request.endpoint.split('?')[0];
    const query = new URLSearchParams(entries.filter(([key]) => key.trim())).toString();
    onChange({ ...request, endpoint: query ? `${path}?${query}` : path });
  };
  const paramRows = queryEntries.length ? queryEntries : paramDrafts;
  const updateParamRow = (index: number, key: string, value: string) => {
    const next = [...paramRows];
    next[index] = [key, value];
    if (queryEntries.length || key.trim()) {
      updateQueryEntries(next);
      setParamDrafts([]);
    } else {
      setParamDrafts(next);
    }
  };
  const auth = request.auth || { type: 'none' as const };
  const defaultJwt = (): JwtAuthConfig => ({
    mode: 'fetch',
    fetch: { tokenUrl: '', grantType: 'client_credentials', clientId: '', clientSecret: '', scope: '', username: '', password: '' },
    sign: { alg: 'HS256', secret: '', header: '', payload: '', expiresInSec: 3600 },
  });
  const defaultCiba = (): CibaAuthConfig => ({
    authEndpoint: '', tokenEndpoint: '', clientId: '', clientSecret: '', scope: 'openid',
    loginHint: '', bindingMessage: '', pollIntervalSec: 5, expiresInSec: 120,
  });
  const [authBusy, setAuthBusy] = useState(false);
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const obtainToken = async () => {
    setAuthBusy(true);
    setAuthStatus(null);
    try {
      let result: { token: string; expiresAt?: number };
      if (auth.type === 'jwt') {
        const jwt = auth.jwt || defaultJwt();
        result = jwt.mode === 'sign'
          ? { token: await signJwt(jwt.sign), expiresAt: jwt.sign.expiresInSec > 0 ? Date.now() + jwt.sign.expiresInSec * 1000 : undefined }
          : await fetchOAuthToken(jwt.fetch);
      } else if (auth.type === 'ciba') {
        result = await fetchCibaToken(auth.ciba || defaultCiba(), setAuthStatus);
      } else {
        return;
      }
      updateAuth({ ...auth, token: result.token, tokenExpiresAt: result.expiresAt });
      setAuthStatus('Token acquired and applied to the Authorization header.');
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setAuthBusy(false);
    }
  };
  const updateAuth = (next: ApiRequest['auth']) => {
    const headers = { ...(request.headers || {}) };
    delete headers.Authorization;
    delete headers.authorization;
    if ((next?.type === 'bearer' || next?.type === 'jwt' || next?.type === 'ciba') && next.token) headers.Authorization = `Bearer ${next.token}`;
    if (next?.type === 'basic' && (next.username || next.password)) {
      headers.Authorization = `Basic ${btoa(`${next.username || ''}:${next.password || ''}`)}`;
    }
    onChange({ ...request, auth: next, headers });
  };

  const addHeader = () => {
    if (headerKey && headerValue) {
      onChange({
        ...request,
        headers: {
          ...request.headers,
          [headerKey]: headerValue,
        },
      });
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const removeHeader = (key: string) => {
    if (!request.headers) return;
    const newHeaders = { ...request.headers };
    delete newHeaders[key];
    onChange({
      ...request,
      headers: newHeaders,
    });
  };

  const startEditingHeader = (key: string, value: string) => {
    setEditingHeaderKey(key);
    setEditingHeaderNewKey(key);
    setEditingHeaderNewValue(value);
  };

  const saveEditingHeader = () => {
    if (!editingHeaderKey || !request.headers) return;
    if (!editingHeaderNewKey.trim()) {
      setEditingHeaderKey(null);
      return;
    }

    const newHeaders: Record<string, string> = {};
    const currentHeaders = request.headers as Record<string, string>;
    // Preserve order: rebuild headers with the edited one in place
    for (const [k, v] of Object.entries(currentHeaders)) {
      if (k === editingHeaderKey) {
        newHeaders[editingHeaderNewKey.trim()] = editingHeaderNewValue;
      } else if (k !== editingHeaderNewKey.trim()) {
        // Only add if it's not the new key (to avoid duplicates)
        newHeaders[k] = v;
      }
    }

    onChange({
      ...request,
      headers: newHeaders,
    });
    setEditingHeaderKey(null);
    setEditingHeaderNewKey('');
    setEditingHeaderNewValue('');
  };

  const cancelEditingHeader = () => {
    setEditingHeaderKey(null);
    setEditingHeaderNewKey('');
    setEditingHeaderNewValue('');
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'text-method-get';
      case 'POST': return 'text-method-post';
      case 'PUT': return 'text-method-put';
      case 'PATCH': return 'text-method-patch';
      case 'DELETE': return 'text-method-delete';
      default: return 'text-text-primary';
    }
  };

  const formatBody = () => {
    setBodyError(null);
    try {
      const parsed = JSON.parse(request.body || '{}');
      onChange({ ...request, bodyType: 'json', body: JSON.stringify(parsed, null, 2) });
    } catch (error) {
      setBodyError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const body = request.body || '';

  return (
    <div className="card p-2">
      <div className="space-y-2">
        {/* Request URL bar */}
        <div className="flex flex-wrap gap-1.5">
          <select
            value={request.method}
            onChange={(e) => onChange({ ...request, method: e.target.value as ApiRequest['method'] })}
            className={`input w-20 text-xs font-semibold ${getMethodColor(request.method)}`}
          >
            <option value="GET" className="text-method-get">GET</option>
            <option value="POST" className="text-method-post">POST</option>
            <option value="PUT" className="text-method-put">PUT</option>
            <option value="PATCH" className="text-method-patch">PATCH</option>
            <option value="DELETE" className="text-method-delete">DELETE</option>
          </select>
          <input
            type="text"
            value={request.endpoint}
            onChange={(e) => onChange({ ...request, endpoint: e.target.value })}
            className="input flex-1 min-w-0 text-xs"
            placeholder="/api/users"
          />
          <button
            onClick={onSend}
            disabled={loading}
            className="btn-primary px-3 text-xs flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                Send
              </>
            )}
          </button>
          {loading && onCancel && (
            <button onClick={onCancel} className="btn text-xs px-2 text-accent-error" title="Cancel request">
              Cancel
            </button>
          )}
          {onShowCurl && (
            <div className="flex gap-1">
              {isSingleMode ? (
                // Single environment mode - show one button
                <Tooltip content="Show cURL command">
                  <button
                    onClick={() => onShowCurl(singleEnvIndex || 1)}
                    className="btn text-xs px-2"
                  >
                    cURL
                  </button>
                </Tooltip>
              ) : (
                // Dual environment mode - show both buttons
                <>
                  <Tooltip content="Show cURL for Environment 1">
                    <button
                      onClick={() => onShowCurl(1)}
                      className="btn text-xs px-2"
                    >
                      cURL 1
                    </button>
                  </Tooltip>
                  <Tooltip content="Show cURL for Environment 2">
                    <button
                      onClick={() => onShowCurl(2)}
                      className="btn text-xs px-2"
                    >
                      cURL 2
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
          )}
        </div>

        {resolvedUrls && (resolvedUrls.env1 || resolvedUrls.env2) && (
          <div className="rounded border border-dark-border/70 bg-dark-bg-tertiary/40 px-2 py-1.5 text-[10px] text-text-muted space-y-0.5" title="Variables are substituted when the request is sent">
            <div className="font-medium text-text-secondary">Resolved destination</div>
            {resolvedUrls.env1 && <div className="truncate"><span className="text-accent-primary">Main</span> · {resolvedUrls.env1}</div>}
            {resolvedUrls.env2 && <div className="truncate"><span className="text-accent-primary">Comparison</span> · {resolvedUrls.env2}</div>}
          </div>
        )}

        <div className="flex items-center gap-1 overflow-x-auto border-b border-dark-border pt-1" role="tablist" aria-label="Request options">
          {(['params', 'body', 'auth', 'headers', 'scripts', 'docs'] as const).map(section => (
            <button key={section} type="button" role="tab" aria-selected={activeSection === section} onClick={() => setActiveSection(section)}
              className={`shrink-0 px-2 py-1 text-[10px] capitalize ${activeSection === section ? 'border-b-2 border-accent-primary text-text-primary' : 'text-text-muted hover:text-text-primary'}`}>
              {section === 'headers' ? `Headers${Object.keys(request.headers || {}).length ? ` (${Object.keys(request.headers || {}).length})` : ''}` : section}
            </button>
          ))}
        </div>

        {activeSection === 'params' && <div className="space-y-2">
          <div className="text-xs text-text-secondary">Query parameters</div>
          {paramRows.map(([key, value], index) => <div key={`${index}-${key}`} className="flex gap-1.5">
            <input className="input text-xs" value={key} placeholder="Parameter" onChange={event => updateParamRow(index, event.target.value, value)} />
            <input className="input text-xs" value={value} placeholder="Value" onChange={event => updateParamRow(index, key, event.target.value)} />
            <button className="btn text-xs" aria-label={`Remove parameter ${key || index + 1}`} onClick={() => queryEntries.length ? updateQueryEntries(queryEntries.filter((_, entryIndex) => entryIndex !== index)) : setParamDrafts(paramDrafts.filter((_, entryIndex) => entryIndex !== index))}>×</button>
          </div>)}
          <button className="btn text-xs" onClick={() => setParamDrafts([...paramRows, ['', '']])}>+ Add parameter</button>
        </div>}

        {/* Request body with syntax highlighting */}
        {activeSection === 'body' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-text-secondary">Request body</label>
              <select aria-label="Body type" value={bodyType} onChange={event => onChange({ ...request, bodyType: event.target.value as ApiRequest['bodyType'], body: event.target.value === 'none' ? '' : request.body })} className="input w-40 text-xs">
                <option value="none">No Body</option><option value="json">JSON</option><option value="text">Plain Text</option><option value="xml">XML</option><option value="yaml">YAML</option><option value="graphql">GraphQL</option><option value="form-data">Form Data</option><option value="form-urlencoded">Form URL Encoded</option><option value="file">File</option>
              </select>
            </div>
            {bodyType !== 'none' && <>
              {bodyType === 'json' && <button type="button" onClick={formatBody} className="btn text-xs" title="Beautify JSON">Beautify</button>}
              {bodyType !== 'json' && <p className="mb-1 text-[10px] text-text-muted">{bodyType === 'file' ? 'File upload support is coming next.' : `${bodyType} body`}</p>}
            <JsonEditor
              label="Request body JSON"
              value={body}
              onChange={body => { setBodyError(null); onChange({ ...request, body }); }}
              placeholder='{"key": "value"}'
              className="h-64 min-h-[120px] max-h-[60vh] resize-y"
            />
            {bodyError && <p role="alert" className="mt-1 text-xs text-accent-error">{bodyError}</p>}
            </>}

          </div>
        )}

        {activeSection === 'auth' && <div className="space-y-2">
          <label className="block text-xs font-medium text-text-secondary">Authentication</label>
          <select aria-label="Authentication type" value={auth.type} onChange={event => updateAuth({ ...auth, type: event.target.value as NonNullable<ApiRequest['auth']>['type'] })} className="input text-xs">
            <option value="none">No Auth</option><option value="bearer">Bearer Token</option><option value="basic">Basic Auth</option><option value="jwt">JWT Token</option><option value="ciba">CIBA</option>
          </select>
          {auth.type === 'bearer' && <input className="input text-xs" type="password" value={auth.token || ''} placeholder="Bearer token" onChange={event => updateAuth({ ...auth, token: event.target.value })} />}
          {auth.type === 'basic' && <div className="grid grid-cols-2 gap-1.5"><input className="input text-xs" value={auth.username || ''} placeholder="Username" onChange={event => updateAuth({ ...auth, username: event.target.value })} /><input className="input text-xs" type="password" value={auth.password || ''} placeholder="Password" onChange={event => updateAuth({ ...auth, password: event.target.value })} /></div>}
          {(auth.type === 'jwt' || auth.type === 'ciba') && (() => {
            const jwt = auth.jwt || defaultJwt();
            const ciba = auth.ciba || defaultCiba();
            const setJwt = (next: JwtAuthConfig) => updateAuth({ ...auth, jwt: next });
            const setCiba = (next: CibaAuthConfig) => updateAuth({ ...auth, ciba: next });
            return <div className="space-y-2">
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
              <button type="button" disabled={authBusy} onClick={obtainToken} className="btn-primary w-full px-2 py-1 text-xs disabled:opacity-50">
                {authBusy ? 'Working…' : auth.type === 'jwt' ? (jwt.mode === 'sign' ? 'Generate JWT' : 'Fetch Token') : 'Start CIBA Authentication'}
              </button>
              {auth.token && <input className="input text-xs" type="password" readOnly value={auth.token} title={auth.tokenExpiresAt ? `Expires: ${new Date(auth.tokenExpiresAt).toLocaleString()}` : 'Acquired token'} />}
              {authStatus && <p className="text-[10px] text-text-muted break-all">{authStatus}</p>}
            </div>;
          })()}
          <p className="text-[10px] text-text-muted">Authentication is applied to the Authorization header when the request is sent.</p>
        </div>}

        {activeSection === 'scripts' && <div className="rounded border border-dashed border-dark-border p-4 text-center text-xs text-text-muted">Pre-request and response scripts will be supported here.</div>}
        {activeSection === 'docs' && <div className="rounded border border-dashed border-dark-border p-4 text-center text-xs text-text-muted">Add notes and documentation for this request here.</div>}

        {/* Headers */}
        {activeSection === 'headers' && <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Request Headers
          </label>

          {request.headers && Object.keys(request.headers).length > 0 && (
            <div className="space-y-1 mb-1.5">
              {Object.entries(request.headers).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-1.5 bg-dark-bg-tertiary px-2 py-1 rounded text-xs group"
                >
                  {editingHeaderKey === key ? (
                    <>
                      <input
                        type="text"
                        value={editingHeaderNewKey}
                        onChange={(e) => setEditingHeaderNewKey(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditingHeader();
                          if (e.key === 'Escape') cancelEditingHeader();
                        }}
                        className="input flex-1 py-0.5 text-xs"
                        placeholder="Header key"
                        autoFocus
                      />
                      <span className="text-text-tertiary">:</span>
                      <input
                        type="text"
                        value={editingHeaderNewValue}
                        onChange={(e) => setEditingHeaderNewValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditingHeader();
                          if (e.key === 'Escape') cancelEditingHeader();
                        }}
                        className="input flex-1 py-0.5 text-xs font-mono"
                        placeholder="Header value"
                      />
                      <Tooltip content="Save">
                        <button
                          onClick={saveEditingHeader}
                          className="text-text-tertiary hover:text-accent-success transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </Tooltip>
                      <Tooltip content="Cancel">
                        <button
                          onClick={cancelEditingHeader}
                          className="text-text-tertiary hover:text-accent-error transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-text-primary">{key}:</span>
                      <span className="text-text-secondary truncate flex-1 font-mono">
                        {value}
                      </span>
                      <Tooltip content="Edit header">
                        <button
                          onClick={() => startEditingHeader(key, value)}
                          className="text-text-tertiary hover:text-accent-primary transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </Tooltip>
                      <Tooltip content="Remove header">
                        <button
                          onClick={() => removeHeader(key)}
                          className="text-text-tertiary hover:text-accent-error transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </Tooltip>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-1.5">
            <input
              type="text"
              value={headerKey}
              onChange={(e) => setHeaderKey(e.target.value)}
              className="input flex-1 min-w-0 text-xs"
              placeholder="Header key"
            />
            <input
              type="text"
              value={headerValue}
              onChange={(e) => setHeaderValue(e.target.value)}
              className="input flex-1 min-w-0 text-xs"
              placeholder="Header value"
            />
            <Tooltip content="Add header">
              <button
                onClick={addHeader}
                className="btn px-3 text-xs"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>}
      </div>
    </div>
  );
};

export default RequestBuilder;
