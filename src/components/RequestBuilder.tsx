import React, { useState, useRef, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ApiRequest } from '../types';
import Tooltip from './Tooltip';

interface RequestBuilderProps {
  request: ApiRequest;
  onChange: (req: ApiRequest) => void;
  onSend: () => void;
  loading: boolean;
  onShowCurl?: (envIndex: 1 | 2) => void;
  isSingleMode?: boolean;
  singleEnvIndex?: 1 | 2 | null;
}

const RequestBuilder: React.FC<RequestBuilderProps> = ({ request, onChange, onSend, loading, onShowCurl, isSingleMode, singleEnvIndex }) => {
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [editingHeaderKey, setEditingHeaderKey] = useState<string | null>(null);
  const [editingHeaderNewKey, setEditingHeaderNewKey] = useState('');
  const [editingHeaderNewValue, setEditingHeaderNewValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    try {
      const parsed = JSON.parse(request.body || '{}');
      onChange({ ...request, body: JSON.stringify(parsed, null, 2) });
    } catch {
      // Invalid JSON, do nothing
    }
  };

  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...request, body: e.target.value });
  }, [onChange, request]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange({ ...request, body: newValue });
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }, [onChange, request]);

  // Sync scroll between textarea and syntax highlighter
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (containerRef.current) {
      const pre = containerRef.current.querySelector('pre');
      if (pre) {
        pre.scrollTop = e.currentTarget.scrollTop;
        pre.scrollLeft = e.currentTarget.scrollLeft;
      }
    }
  }, []);

  // Custom dark theme for syntax highlighting
  const darkCodeTheme = {
    ...oneDark,
    'pre[class*="language-"]': {
      ...oneDark['pre[class*="language-"]'],
      background: 'transparent',
      margin: 0,
      padding: '8px',
      fontSize: '11px',
      fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
      lineHeight: '1.4',
      overflow: 'auto',
    },
    'code[class*="language-"]': {
      ...oneDark['code[class*="language-"]'],
      background: 'transparent',
      fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
      fontSize: '11px',
      lineHeight: '1.4',
    },
  };

  const body = request.body || '';

  return (
    <div className="card p-2">
      <div className="space-y-2">
        {/* Request URL bar */}
        <div className="flex gap-1.5">
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
            className="input flex-1 text-xs"
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

        {/* Request body with syntax highlighting */}
        {(request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-text-secondary">
                Request Body
              </label>
              <button
                type="button"
                onClick={formatBody}
                className="btn text-xs"
                title="Beautify JSON"
              >
                Beautify
              </button>
            </div>
            <div
              ref={containerRef}
              className="relative rounded border border-[#30363d]/40 focus-within:border-[#58a6ff]/40 bg-[#0d1117] overflow-hidden transition-colors"
              style={{ minHeight: '120px' }}
            >
              {/* Syntax highlighted background */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <SyntaxHighlighter
                  language="json"
                  style={darkCodeTheme}
                  customStyle={{
                    margin: 0,
                    padding: '8px',
                    background: 'transparent',
                    minHeight: '120px',
                    overflow: 'hidden',
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
                      fontSize: '11px',
                      lineHeight: '1.4',
                    }
                  }}
                >
                  {body || ' '}
                </SyntaxHighlighter>
              </div>
              {/* Transparent textarea for editing */}
              <textarea
                ref={textareaRef}
                value={body}
                onChange={handleBodyChange}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                className="relative w-full bg-transparent text-transparent caret-white resize-y font-mono outline-none"
                style={{
                  padding: '8px',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  minHeight: '120px',
                  fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
                  caretColor: '#58a6ff',
                }}
                placeholder=""
                spellCheck={false}
              />
              {/* Placeholder when empty */}
              {!body && (
                <div
                  className="absolute top-2 left-2 text-text-tertiary text-xs font-mono pointer-events-none"
                  style={{ fontSize: '11px', lineHeight: '1.4' }}
                >
                  {'{"key": "value"}'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Headers */}
        <div>
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
              className="input flex-1 text-xs"
              placeholder="Header key"
            />
            <input
              type="text"
              value={headerValue}
              onChange={(e) => setHeaderValue(e.target.value)}
              className="input flex-1 text-xs"
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
        </div>
      </div>
    </div>
  );
};

export default RequestBuilder;
