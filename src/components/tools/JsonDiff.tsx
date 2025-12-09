import { useState, useCallback, useMemo, useRef } from 'react';
import { diffJson, type Change } from 'diff';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Tooltip from '../Tooltip';

type ViewMode = 'side-by-side' | 'inline';

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

// Recursively sort object keys and array elements for semantic comparison
const sortObjectKeys = (obj: unknown): unknown => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    // Sort array elements - for objects, sort by JSON representation
    const sortedArray = obj.map(sortObjectKeys);
    return sortedArray.sort((a, b) => {
      const aStr = JSON.stringify(a);
      const bStr = JSON.stringify(b);
      return aStr.localeCompare(bStr);
    });
  }

  // Sort object keys alphabetically
  const sortedObj: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  for (const key of keys) {
    sortedObj[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sortedObj;
};

export default function JsonDiff() {
  const [leftJson, setLeftJson] = useState('');
  const [rightJson, setRightJson] = useState('');
  const [error, setError] = useState<{ left?: string; right?: string }>({});
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false);
  const [ignoreKeyOrder, setIgnoreKeyOrder] = useState(true);
  const leftContainerRef = useRef<HTMLDivElement>(null);
  const rightContainerRef = useRef<HTMLDivElement>(null);

  const parseAndFormat = useCallback((json: string, normalize: boolean): { parsed: object; formatted: string } | null => {
    if (!json.trim()) return null;
    try {
      let parsed = JSON.parse(json);
      if (normalize) {
        parsed = sortObjectKeys(parsed);
      }
      return { parsed: parsed as object, formatted: JSON.stringify(parsed, null, 2) };
    } catch {
      return null;
    }
  }, []);

  const diffResult = useMemo(() => {
    setError({});

    if (!leftJson.trim() && !rightJson.trim()) {
      return null;
    }

    const leftParsed = parseAndFormat(leftJson, ignoreKeyOrder);
    const rightParsed = parseAndFormat(rightJson, ignoreKeyOrder);

    const newError: { left?: string; right?: string } = {};
    if (leftJson.trim() && !leftParsed) {
      newError.left = 'Invalid JSON';
    }
    if (rightJson.trim() && !rightParsed) {
      newError.right = 'Invalid JSON';
    }

    if (newError.left || newError.right) {
      setError(newError);
      return null;
    }

    if (!leftParsed || !rightParsed) {
      return null;
    }

    const changes = diffJson(leftParsed.parsed, rightParsed.parsed);
    return {
      changes,
      leftFormatted: leftParsed.formatted,
      rightFormatted: rightParsed.formatted,
      hasDifferences: changes.some(c => c.added || c.removed),
    };
  }, [leftJson, rightJson, parseAndFormat, ignoreKeyOrder]);

  const handleClear = (side: 'left' | 'right' | 'both') => {
    if (side === 'left' || side === 'both') {
      setLeftJson('');
    }
    if (side === 'right' || side === 'both') {
      setRightJson('');
    }
    setError({});
  };

  const handlePaste = async (side: 'left' | 'right') => {
    try {
      const text = await navigator.clipboard.readText();
      if (side === 'left') {
        setLeftJson(text);
      } else {
        setRightJson(text);
      }
    } catch {
      // Ignore paste errors
    }
  };

  const handleSwap = () => {
    const temp = leftJson;
    setLeftJson(rightJson);
    setRightJson(temp);
  };

  // Beautify JSON for a given side
  const handleBeautify = (side: 'left' | 'right') => {
    try {
      const json = side === 'left' ? leftJson : rightJson;
      if (!json.trim()) return;
      const parsed = JSON.parse(json);
      const formatted = JSON.stringify(parsed, null, 2);
      if (side === 'left') {
        setLeftJson(formatted);
      } else {
        setRightJson(formatted);
      }
    } catch {
      // Invalid JSON, do nothing
    }
  };

  // Sync scroll between textarea and syntax highlighter
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>, containerRef: React.RefObject<HTMLDivElement | null>) => {
    if (containerRef.current) {
      const pre = containerRef.current.querySelector('pre');
      if (pre) {
        pre.scrollTop = e.currentTarget.scrollTop;
        pre.scrollLeft = e.currentTarget.scrollLeft;
      }
    }
  }, []);

  // Handle tab key for indentation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, side: 'left' | 'right') => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      if (side === 'left') {
        setLeftJson(newValue);
      } else {
        setRightJson(newValue);
      }
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }, []);

  const renderSideBySide = (changes: Change[]) => {
    const leftLines: { text: string; type: 'normal' | 'removed' }[] = [];
    const rightLines: { text: string; type: 'normal' | 'added' }[] = [];

    changes.forEach((change) => {
      const lines = change.value.split('\n').filter((_, i, arr) => i !== arr.length - 1 || change.value.endsWith('\n') ? true : change.value.split('\n').length === 1 || i !== arr.length - 1);
      const actualLines = change.value.endsWith('\n') ? lines.slice(0, -1) : lines;

      if (change.added) {
        actualLines.forEach((line) => {
          rightLines.push({ text: line, type: 'added' });
          if (!showOnlyDiffs) {
            leftLines.push({ text: '', type: 'normal' });
          }
        });
      } else if (change.removed) {
        actualLines.forEach((line) => {
          leftLines.push({ text: line, type: 'removed' });
          if (!showOnlyDiffs) {
            rightLines.push({ text: '', type: 'normal' });
          }
        });
      } else if (!showOnlyDiffs) {
        actualLines.forEach((line) => {
          leftLines.push({ text: line, type: 'normal' });
          rightLines.push({ text: line, type: 'normal' });
        });
      }
    });

    // Balance line counts
    while (leftLines.length < rightLines.length) {
      leftLines.push({ text: '', type: 'normal' });
    }
    while (rightLines.length < leftLines.length) {
      rightLines.push({ text: '', type: 'normal' });
    }

    return (
      <div className="flex flex-1 gap-2 min-h-0 overflow-hidden">
        {/* Left panel */}
        <div className="flex-1 flex flex-col min-w-0 border border-dark-border rounded overflow-hidden">
          <div className="px-3 py-1.5 bg-dark-bg-tertiary border-b border-dark-border text-xs font-medium text-text-secondary">
            Left (Original)
          </div>
          <div className="flex-1 overflow-auto bg-dark-bg">
            <pre className="p-2 text-xs font-mono">
              {leftLines.map((line, i) => (
                <div
                  key={i}
                  className={`px-2 py-0.5 ${
                    line.type === 'removed'
                      ? 'bg-accent-error/20 text-accent-error'
                      : 'text-text-primary'
                  }`}
                >
                  <span className="text-text-muted w-8 inline-block text-right mr-2 select-none">
                    {line.text !== '' || line.type === 'removed' ? i + 1 : ''}
                  </span>
                  {line.type === 'removed' && <span className="text-accent-error mr-1">-</span>}
                  {line.text || '\u00A0'}
                </div>
              ))}
            </pre>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col min-w-0 border border-dark-border rounded overflow-hidden">
          <div className="px-3 py-1.5 bg-dark-bg-tertiary border-b border-dark-border text-xs font-medium text-text-secondary">
            Right (Modified)
          </div>
          <div className="flex-1 overflow-auto bg-dark-bg">
            <pre className="p-2 text-xs font-mono">
              {rightLines.map((line, i) => (
                <div
                  key={i}
                  className={`px-2 py-0.5 ${
                    line.type === 'added'
                      ? 'bg-accent-success/20 text-accent-success'
                      : 'text-text-primary'
                  }`}
                >
                  <span className="text-text-muted w-8 inline-block text-right mr-2 select-none">
                    {line.text !== '' || line.type === 'added' ? i + 1 : ''}
                  </span>
                  {line.type === 'added' && <span className="text-accent-success mr-1">+</span>}
                  {line.text || '\u00A0'}
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  const renderInline = (changes: Change[]) => {
    return (
      <div className="flex-1 border border-dark-border rounded overflow-hidden">
        <div className="px-3 py-1.5 bg-dark-bg-tertiary border-b border-dark-border text-xs font-medium text-text-secondary">
          Unified Diff
        </div>
        <div className="flex-1 overflow-auto bg-dark-bg">
          <pre className="p-2 text-xs font-mono">
            {changes.map((change, changeIdx) => {
              const lines = change.value.split('\n');
              const actualLines = change.value.endsWith('\n') ? lines.slice(0, -1) : lines;

              if (showOnlyDiffs && !change.added && !change.removed) {
                return null;
              }

              return actualLines.map((line, lineIdx) => (
                <div
                  key={`${changeIdx}-${lineIdx}`}
                  className={`px-2 py-0.5 ${
                    change.added
                      ? 'bg-accent-success/20 text-accent-success'
                      : change.removed
                      ? 'bg-accent-error/20 text-accent-error'
                      : 'text-text-primary'
                  }`}
                >
                  <span className="mr-2 select-none">
                    {change.added ? '+' : change.removed ? '-' : ' '}
                  </span>
                  {line || '\u00A0'}
                </div>
              ));
            })}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-text-primary">JSON Diff</h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-text-secondary" title="When enabled, keys and array elements are sorted before comparison, ignoring positional differences">
            <input
              type="checkbox"
              checked={ignoreKeyOrder}
              onChange={(e) => setIgnoreKeyOrder(e.target.checked)}
              className="rounded border-dark-border bg-dark-bg text-accent-primary focus:ring-accent-primary focus:ring-offset-0"
            />
            Ignore key order
          </label>
          <label className="flex items-center gap-1.5 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={showOnlyDiffs}
              onChange={(e) => setShowOnlyDiffs(e.target.checked)}
              className="rounded border-dark-border bg-dark-bg text-accent-primary focus:ring-accent-primary focus:ring-offset-0"
            />
            Show only differences
          </label>
          <div className="flex items-center gap-1 bg-dark-bg rounded p-0.5">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setViewMode('inline')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'inline'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Inline
            </button>
          </div>
        </div>
      </div>

      {/* Input panels */}
      <div className="flex gap-4 mb-4">
        {/* Left input */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary">Left JSON</span>
            <div className="flex gap-1">
              <Tooltip content="Beautify">
                <button onClick={() => handleBeautify('left')} className="btn text-xs px-2 py-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>
              </Tooltip>
              <Tooltip content="Paste">
                <button onClick={() => handlePaste('left')} className="btn text-xs px-2 py-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </button>
              </Tooltip>
              <Tooltip content="Clear">
                <button onClick={() => handleClear('left')} className="btn text-xs px-2 py-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </Tooltip>
            </div>
          </div>
          <div
            ref={leftContainerRef}
            className={`h-32 relative rounded border focus-within:ring-1 bg-dark-bg overflow-hidden ${
              error.left ? 'border-accent-error focus-within:ring-accent-error' : 'border-dark-border focus-within:ring-accent-primary'
            }`}
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
                {leftJson || ' '}
              </SyntaxHighlighter>
            </div>
            {/* Transparent textarea for editing */}
            <textarea
              value={leftJson}
              onChange={(e) => setLeftJson(e.target.value)}
              onScroll={(e) => handleScroll(e, leftContainerRef)}
              onKeyDown={(e) => handleKeyDown(e, 'left')}
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
            {!leftJson && (
              <div
                className="absolute top-3 left-3 text-text-tertiary font-mono pointer-events-none"
                style={{ fontSize: '13px', lineHeight: '1.4' }}
              >
                Paste left JSON here...
              </div>
            )}
          </div>
          {error.left && (
            <p className="mt-1 text-xs text-accent-error">{error.left}</p>
          )}
        </div>

        {/* Swap button */}
        <div className="flex items-center justify-center">
          <Tooltip content="Swap left and right">
            <button
              onClick={handleSwap}
              className="btn p-2 rounded-full"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </Tooltip>
        </div>

        {/* Right input */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary">Right JSON</span>
            <div className="flex gap-1">
              <Tooltip content="Beautify">
                <button onClick={() => handleBeautify('right')} className="btn text-xs px-2 py-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>
              </Tooltip>
              <Tooltip content="Paste">
                <button onClick={() => handlePaste('right')} className="btn text-xs px-2 py-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </button>
              </Tooltip>
              <Tooltip content="Clear">
                <button onClick={() => handleClear('right')} className="btn text-xs px-2 py-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </Tooltip>
            </div>
          </div>
          <div
            ref={rightContainerRef}
            className={`h-32 relative rounded border focus-within:ring-1 bg-dark-bg overflow-hidden ${
              error.right ? 'border-accent-error focus-within:ring-accent-error' : 'border-dark-border focus-within:ring-accent-primary'
            }`}
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
                {rightJson || ' '}
              </SyntaxHighlighter>
            </div>
            {/* Transparent textarea for editing */}
            <textarea
              value={rightJson}
              onChange={(e) => setRightJson(e.target.value)}
              onScroll={(e) => handleScroll(e, rightContainerRef)}
              onKeyDown={(e) => handleKeyDown(e, 'right')}
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
            {!rightJson && (
              <div
                className="absolute top-3 left-3 text-text-tertiary font-mono pointer-events-none"
                style={{ fontSize: '13px', lineHeight: '1.4' }}
              >
                Paste right JSON here...
              </div>
            )}
          </div>
          {error.right && (
            <p className="mt-1 text-xs text-accent-error">{error.right}</p>
          )}
        </div>
      </div>

      {/* Diff result */}
      <div className="flex-1 flex flex-col min-h-0">
        {diffResult ? (
          <>
            {/* Status bar */}
            <div className="flex items-center gap-4 mb-2 text-xs">
              {diffResult.hasDifferences ? (
                <span className="text-accent-warning flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Differences found
                </span>
              ) : (
                <span className="text-accent-success flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  No differences
                </span>
              )}
              <button
                onClick={() => handleClear('both')}
                className="btn text-xs px-2 py-1"
              >
                Clear All
              </button>
            </div>

            {/* Diff view */}
            {viewMode === 'side-by-side'
              ? renderSideBySide(diffResult.changes)
              : renderInline(diffResult.changes)}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center border border-dark-border rounded bg-dark-bg">
            <div className="text-center text-text-muted">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">Enter JSON in both fields to compare</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
