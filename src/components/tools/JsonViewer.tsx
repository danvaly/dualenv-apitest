import { useState, useCallback, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Tooltip from '../Tooltip';

// Custom dark theme for syntax highlighting
const darkCodeTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'transparent',
    margin: 0,
    padding: '12px',
    fontSize: '13px',
    fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
    lineHeight: '1.4',
    overflow: 'auto',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
    fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
    fontSize: '13px',
    lineHeight: '1.4',
  },
};

export default function JsonViewer() {
  const [inputJson, setInputJson] = useState('');
  const [outputJson, setOutputJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [indentSize, setIndentSize] = useState(2);
  const [isMinified, setIsMinified] = useState(false);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const formatJson = useCallback((minify: boolean = false) => {
    setError(null);
    if (!inputJson.trim()) {
      setOutputJson('');
      return;
    }

    try {
      const parsed = JSON.parse(inputJson);
      if (minify) {
        setOutputJson(JSON.stringify(parsed));
        setIsMinified(true);
      } else {
        setOutputJson(JSON.stringify(parsed, null, indentSize));
        setIsMinified(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
      setOutputJson('');
    }
  }, [inputJson, indentSize]);

  const handlePrettify = () => {
    formatJson(false);
  };

  const handleMinify = () => {
    formatJson(true);
  };

  const handleCopy = async () => {
    if (outputJson) {
      await navigator.clipboard.writeText(outputJson);
    }
  };

  const handleClear = () => {
    setInputJson('');
    setOutputJson('');
    setError(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputJson(text);
      setError(null);
    } catch (e) {
      setError('Failed to paste from clipboard');
    }
  };

  // Sync scroll between textarea and syntax highlighter
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (inputContainerRef.current) {
      const pre = inputContainerRef.current.querySelector('pre');
      if (pre) {
        pre.scrollTop = e.currentTarget.scrollTop;
        pre.scrollLeft = e.currentTarget.scrollLeft;
      }
    }
  }, []);

  // Handle tab key for indentation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      setInputJson(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-text-primary">JSON Viewer</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-text-secondary">
            Indent:
            <select
              value={indentSize}
              onChange={(e) => setIndentSize(Number(e.target.value))}
              className="input text-xs py-0.5 px-1.5 w-14"
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Input Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary">Input JSON</span>
            <div className="flex gap-1">
              <Tooltip content="Paste from clipboard">
                <button
                  onClick={handlePaste}
                  className="btn text-xs px-2 py-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </button>
              </Tooltip>
              <Tooltip content="Clear">
                <button
                  onClick={handleClear}
                  className="btn text-xs px-2 py-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </Tooltip>
            </div>
          </div>
          <div
            ref={inputContainerRef}
            className="flex-1 relative rounded border border-dark-border focus-within:ring-1 focus-within:ring-accent-primary bg-dark-bg overflow-hidden"
          >
            {/* Syntax highlighted background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <SyntaxHighlighter
                language="json"
                style={darkCodeTheme}
                customStyle={{
                  margin: 0,
                  padding: '12px',
                  background: 'transparent',
                  height: '100%',
                  overflow: 'hidden',
                }}
                codeTagProps={{
                  style: {
                    fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
                    fontSize: '13px',
                    lineHeight: '1.4',
                  }
                }}
              >
                {inputJson || ' '}
              </SyntaxHighlighter>
            </div>
            {/* Transparent textarea for editing */}
            <textarea
              ref={textareaRef}
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              className="relative w-full h-full bg-transparent text-transparent caret-white resize-none font-mono outline-none"
              style={{
                padding: '12px',
                fontSize: '13px',
                lineHeight: '1.4',
                fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
                caretColor: '#58a6ff',
              }}
              spellCheck={false}
            />
            {/* Placeholder when empty */}
            {!inputJson && (
              <div
                className="absolute top-3 left-3 text-text-tertiary font-mono pointer-events-none"
                style={{ fontSize: '13px', lineHeight: '1.4' }}
              >
                Paste your JSON here...
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-2">
          <Tooltip content="Prettify JSON" position="left">
            <button
              onClick={handlePrettify}
              className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Prettify
            </button>
          </Tooltip>
          <Tooltip content="Minify JSON" position="left">
            <button
              onClick={handleMinify}
              className="btn text-xs px-3 py-2 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
              </svg>
              Minify
            </button>
          </Tooltip>
        </div>

        {/* Output Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary">
              Output {isMinified && outputJson ? '(minified)' : outputJson ? '(prettified)' : ''}
            </span>
            <Tooltip content="Copy to clipboard">
              <button
                onClick={handleCopy}
                className="btn text-xs px-2 py-1"
                disabled={!outputJson}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </Tooltip>
          </div>
          <div className="flex-1 w-full bg-dark-bg border border-dark-border rounded overflow-auto">
            {error ? (
              <div className="p-3 text-sm text-accent-error">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Invalid JSON</span>
                </div>
                <p className="text-xs text-text-muted ml-6">{error}</p>
              </div>
            ) : outputJson ? (
              <SyntaxHighlighter
                language="json"
                style={darkCodeTheme}
                customStyle={{
                  margin: 0,
                  padding: '12px',
                  background: 'transparent',
                  height: '100%',
                }}
                codeTagProps={{
                  style: {
                    fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
                    fontSize: '13px',
                    lineHeight: '1.4',
                  }
                }}
                wrapLongLines={true}
              >
                {outputJson}
              </SyntaxHighlighter>
            ) : (
              <div className="p-3 text-sm text-text-muted italic">
                Output will appear here after formatting...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {outputJson && !error && (
        <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
          <span>Characters: {outputJson.length.toLocaleString()}</span>
          <span>Lines: {outputJson.split('\n').length.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
