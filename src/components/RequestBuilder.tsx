import React, { useMemo, useState } from 'react';
import JsonEditor from './JsonEditor';
import AuthForm from './AuthForm';
import type { ApiRequest, ExtractionRule } from '../types';
import { ENV_STYLES, methodColor } from '../utils/envColors';
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
  const [activeSection, setActiveSection] = useState<'params' | 'body' | 'auth' | 'headers' | 'scripts' | 'extract' | 'docs'>('body');
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [editingHeaderKey, setEditingHeaderKey] = useState<string | null>(null);
  const [editingHeaderNewKey, setEditingHeaderNewKey] = useState('');
  const [editingHeaderNewValue, setEditingHeaderNewValue] = useState('');
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [paramDrafts, setParamDrafts] = useState<Array<[string, string]>>([]);
  const [showCurlMenu, setShowCurlMenu] = useState(false);
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
            className={`input w-20 text-xs font-semibold ${methodColor(request.method)}`}
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
            isSingleMode ? (
              <Tooltip content="Show cURL command">
                <button onClick={() => onShowCurl(singleEnvIndex || 1)} className="btn text-xs px-2">cURL</button>
              </Tooltip>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowCurlMenu(v => !v)}
                  className="btn text-xs px-2 flex items-center gap-1"
                  aria-haspopup="menu"
                  aria-expanded={showCurlMenu}
                  title="Show cURL command"
                >
                  cURL
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showCurlMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCurlMenu(false)} />
                    <div role="menu" className="absolute right-0 z-50 mt-1 w-44 rounded-md border border-dark-border bg-dark-bg-secondary p-1 shadow-xl">
                      {([1, 2] as const).map(envIndex => (
                        <button
                          key={envIndex}
                          role="menuitem"
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-text-primary hover:bg-dark-bg-tertiary"
                          onClick={() => { setShowCurlMenu(false); onShowCurl(envIndex); }}
                        >
                          <span className={`w-2 h-2 rounded-full ${ENV_STYLES[envIndex].dot}`} aria-hidden="true" />
                          <span className={ENV_STYLES[envIndex].text}>{envIndex === 1 ? 'Main' : 'Comparison'}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          )}
        </div>

        {resolvedUrls && (resolvedUrls.env1 || resolvedUrls.env2) && (
          <div className="rounded border border-dark-border/70 bg-dark-bg-tertiary/40 px-2 py-1.5 text-[10px] text-text-muted space-y-0.5" title="Variables are substituted when the request is sent">
            <div className="font-medium text-text-secondary">Resolved destination</div>
            {resolvedUrls.env1 && <div className="truncate"><span className={ENV_STYLES[1].text}>Main</span> · {resolvedUrls.env1}</div>}
            {resolvedUrls.env2 && <div className="truncate"><span className={ENV_STYLES[2].text}>Comparison</span> · {resolvedUrls.env2}</div>}
          </div>
        )}

        <div className="flex items-center gap-1 overflow-x-auto border-b border-dark-border pt-1" role="tablist" aria-label="Request options">
          {(['params', 'body', 'auth', 'headers', 'scripts', 'extract', 'docs'] as const).map(section => (
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
          <AuthForm auth={auth} onChange={updateAuth} allowInherit />
          <p className="text-[10px] text-text-muted">Authentication is applied to the Authorization header when the request is sent. JWT/CIBA tokens refresh automatically when expired.</p>
        </div>}

        {activeSection === 'scripts' && <div className="space-y-2">
          <label className="block text-xs font-medium text-text-secondary">Pre-request Script</label>
          <textarea className="input text-xs font-mono" rows={4} value={request.scripts?.pre || ''} spellCheck={false}
            placeholder="// Runs before sending. Available: pm.variables.get/set, request, console.log&#10;// pm.variables.set('timestamp', Date.now());"
            onChange={event => onChange({ ...request, scripts: { ...request.scripts, pre: event.target.value } })} />
          <label className="block text-xs font-medium text-text-secondary">Response Script (tests)</label>
          <textarea className="input text-xs font-mono" rows={4} value={request.scripts?.post || ''} spellCheck={false}
            placeholder="// Runs after the response. Available: pm.response, pm.test, pm.expect&#10;// pm.test('status is 200', () => pm.expect(pm.response.status).toBe(200));"
            onChange={event => onChange({ ...request, scripts: { ...request.scripts, post: event.target.value } })} />
          <p className="text-[10px] text-text-muted">Variables set via pm.variables.set() are saved into the active environment.</p>
        </div>}

        {activeSection === 'extract' && <div className="space-y-2">
          <label className="block text-xs font-medium text-text-secondary">Extract response fields into environment variables</label>
          {(request.extractions || []).map(rule => (
            <div key={rule.id} className="flex items-center gap-1.5">
              <input type="checkbox" aria-label="Enable rule" checked={rule.enabled} onChange={event => onChange({ ...request, extractions: (request.extractions || []).map(r => r.id === rule.id ? { ...r, enabled: event.target.checked } : r) })} />
              <input className="input text-xs flex-1 font-mono" value={rule.path} placeholder="$.data.id" onChange={event => onChange({ ...request, extractions: (request.extractions || []).map(r => r.id === rule.id ? { ...r, path: event.target.value } : r) })} />
              <span className="text-text-muted text-xs">→</span>
              <input className="input text-xs flex-1" value={rule.variable} placeholder="variableName" onChange={event => onChange({ ...request, extractions: (request.extractions || []).map(r => r.id === rule.id ? { ...r, variable: event.target.value } : r) })} />
              <button type="button" aria-label="Remove rule" className="text-text-muted hover:text-red-400 px-1" onClick={() => onChange({ ...request, extractions: (request.extractions || []).filter(r => r.id !== rule.id) })}>×</button>
            </div>
          ))}
          <button type="button" className="btn-accent px-2 py-1 text-xs" onClick={() => onChange({ ...request, extractions: [...(request.extractions || []), { id: crypto.randomUUID(), path: '', variable: '', enabled: true } as ExtractionRule] })}>+ Add Extraction</button>
          <p className="text-[10px] text-text-muted">Paths use JSONPath-lite syntax, e.g. $.data.user.id or $.items[0].token</p>
        </div>}

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
