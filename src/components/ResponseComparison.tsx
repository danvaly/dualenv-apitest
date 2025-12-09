import React, { useMemo, useState } from 'react';
import type { ApiResponse } from '../types';
import * as Diff from 'diff';
import JsonDisplay from './JsonDisplay';

interface ResponseComparisonProps {
  env1Name: string;
  env2Name: string;
  response1: ApiResponse | null;
  response2: ApiResponse | null;
  onRerun?: (envIndex: 1 | 2) => void;
  loading1?: boolean;
  loading2?: boolean;
  ignoredPaths?: string[];
  onIgnoredPathsChange?: (paths: string[]) => void;
  ignoreKeyOrder?: boolean;
  onIgnoreKeyOrderChange?: (value: boolean) => void;
  showResponses?: boolean;
  showDiff?: boolean;
  singleMode?: boolean;
  singleEnvIndex?: 1 | 2 | null;
}

// Recursively sort object keys and array elements for semantic comparison
const sortObjectKeys = (obj: unknown): unknown => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    const sortedArray = obj.map(sortObjectKeys);
    return sortedArray.sort((a, b) => {
      const aStr = JSON.stringify(a);
      const bStr = JSON.stringify(b);
      return aStr.localeCompare(bStr);
    });
  }

  const sortedObj: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  for (const key of keys) {
    sortedObj[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sortedObj;
};

const ResponseComparison: React.FC<ResponseComparisonProps> = ({
  env1Name,
  env2Name,
  response1,
  response2,
  onRerun,
  loading1 = false,
  loading2 = false,
  ignoredPaths = [],
  onIgnoredPathsChange,
  ignoreKeyOrder = true,
  onIgnoreKeyOrderChange,
  showResponses = true,
  showDiff = true,
  singleMode = false,
  singleEnvIndex = null,
}) => {
  const [newIgnoredPath, setNewIgnoredPath] = useState('');
  const [showIgnoredPaths, setShowIgnoredPaths] = useState(false);

  const formatJson = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  // Remove ignored paths from an object
  const removeIgnoredPaths = (obj: any, paths: string[]): any => {
    if (!obj || typeof obj !== 'object' || paths.length === 0) {
      return obj;
    }

    const result = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const path of paths) {
      const parts = path.split('.');
      deleteNestedPath(result, parts);
    }

    return result;
  };

  // Helper to delete a nested path from an object
  const deleteNestedPath = (obj: any, parts: string[]): void => {
    if (!obj || typeof obj !== 'object' || parts.length === 0) {
      return;
    }

    const [current, ...rest] = parts;

    // Handle array notation like "items[*]" or "items[0]"
    const arrayMatch = current.match(/^(.+)\[(\*|\d+)\]$/);

    if (arrayMatch) {
      const [, arrayName, indexStr] = arrayMatch;
      if (Array.isArray(obj[arrayName])) {
        if (indexStr === '*') {
          for (let i = 0; i < obj[arrayName].length; i++) {
            if (rest.length === 0) {
              // This shouldn't happen for array[*] notation
            } else {
              deleteNestedPath(obj[arrayName][i], rest);
            }
          }
        } else {
          const index = parseInt(indexStr, 10);
          if (rest.length === 0) {
            obj[arrayName].splice(index, 1);
          } else if (obj[arrayName][index]) {
            deleteNestedPath(obj[arrayName][index], rest);
          }
        }
      }
    } else if (rest.length === 0) {
      delete obj[current];
    } else if (obj[current]) {
      if (Array.isArray(obj[current])) {
        for (const item of obj[current]) {
          deleteNestedPath(item, rest);
        }
      } else {
        deleteNestedPath(obj[current], rest);
      }
    }
  };

  const handleAddIgnoredPath = () => {
    const trimmed = newIgnoredPath.trim();
    if (trimmed && !ignoredPaths.includes(trimmed) && onIgnoredPathsChange) {
      onIgnoredPathsChange([...ignoredPaths, trimmed]);
      setNewIgnoredPath('');
    }
  };

  const handleRemoveIgnoredPath = (path: string) => {
    if (onIgnoredPathsChange) {
      onIgnoredPathsChange(ignoredPaths.filter((p) => p !== path));
    }
  };

  // Syntax highlight a JSON line (GitHub style)
  const highlightJsonLine = (line: string): React.ReactNode => {
    const tokens: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    const patterns = [
      { regex: /^(\s+)/, type: 'whitespace' },
      { regex: /^("(?:[^"\\]|\\.)*")(\s*:)/, type: 'key' },
      { regex: /^("(?:[^"\\]|\\.)*")/, type: 'string' },
      { regex: /^(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/, type: 'number' },
      { regex: /^(true|false)/, type: 'boolean' },
      { regex: /^(null)/, type: 'null' },
      { regex: /^([{}\[\],:])/, type: 'punctuation' },
    ];

    while (remaining.length > 0) {
      let matched = false;

      for (const { regex, type } of patterns) {
        const match = remaining.match(regex);
        if (match) {
          if (type === 'key') {
            tokens.push(<span key={key++} className="text-[#79c0ff]">{match[1]}</span>);
            tokens.push(<span key={key++} className="text-[#c9d1d9]">{match[2]}</span>);
            remaining = remaining.slice(match[0].length);
          } else {
            const value = match[1] || match[0];
            let className = 'text-[#c9d1d9]';

            switch (type) {
              case 'string':
                className = 'text-[#a5d6ff]';
                break;
              case 'number':
                className = 'text-[#79c0ff]';
                break;
              case 'boolean':
              case 'null':
                className = 'text-[#ff7b72]';
                break;
              case 'punctuation':
                className = 'text-[#8b949e]';
                break;
            }

            tokens.push(<span key={key++} className={className}>{value}</span>);
            remaining = remaining.slice(value.length);
          }
          matched = true;
          break;
        }
      }

      if (!matched) {
        tokens.push(<span key={key++} className="text-[#c9d1d9]">{remaining[0]}</span>);
        remaining = remaining.slice(1);
      }
    }

    return <>{tokens}</>;
  };

  interface DiffLine {
    content: string;
    type: 'added' | 'removed' | 'unchanged' | 'moved-from' | 'moved-to';
    oldLineNum?: number;
    newLineNum?: number;
    moveId?: number;
  }

  const diffWithMoves = useMemo(() => {
    if (!response1 || !response2) return null;

    let filteredData1 = removeIgnoredPaths(
      JSON.parse(JSON.stringify(response1.data)),
      ignoredPaths
    );
    let filteredData2 = removeIgnoredPaths(
      JSON.parse(JSON.stringify(response2.data)),
      ignoredPaths
    );

    // Normalize key order if enabled
    if (ignoreKeyOrder) {
      filteredData1 = sortObjectKeys(filteredData1);
      filteredData2 = sortObjectKeys(filteredData2);
    }

    const json1 = formatJson(filteredData1);
    const json2 = formatJson(filteredData2);

    const rawDiff = Diff.diffLines(json1, json2);

    const removedLines: { content: string; partIndex: number; lineIndex: number }[] = [];
    const addedLines: { content: string; partIndex: number; lineIndex: number }[] = [];

    rawDiff.forEach((part, partIndex) => {
      const lines = part.value.split('\n').filter((line, i, arr) => !(i === arr.length - 1 && line === ''));
      lines.forEach((line, lineIndex) => {
        const trimmed = line.trim();
        if (trimmed) {
          if (part.removed) {
            removedLines.push({ content: trimmed, partIndex, lineIndex });
          } else if (part.added) {
            addedLines.push({ content: trimmed, partIndex, lineIndex });
          }
        }
      });
    });

    const moves = new Map<string, number>();
    let moveId = 0;
    const usedAdded = new Set<number>();

    removedLines.forEach((removed) => {
      const matchIndex = addedLines.findIndex(
        (added, idx) => !usedAdded.has(idx) && added.content === removed.content
      );
      if (matchIndex !== -1) {
        const key = removed.content;
        if (!moves.has(key)) {
          moves.set(key, moveId++);
        }
        usedAdded.add(matchIndex);
      }
    });

    const result: DiffLine[] = [];
    let oldLineNum = 0;
    let newLineNum = 0;

    rawDiff.forEach((part) => {
      const lines = part.value.split('\n');
      lines.forEach((line, i, arr) => {
        if (i === arr.length - 1 && line === '') return;

        const trimmed = line.trim();
        const mid = moves.get(trimmed);

        if (part.removed) {
          oldLineNum++;
          if (mid !== undefined) {
            result.push({ content: line, type: 'moved-from', oldLineNum, moveId: mid });
          } else {
            result.push({ content: line, type: 'removed', oldLineNum });
          }
        } else if (part.added) {
          newLineNum++;
          if (mid !== undefined) {
            result.push({ content: line, type: 'moved-to', newLineNum, moveId: mid });
          } else {
            result.push({ content: line, type: 'added', newLineNum });
          }
        } else {
          oldLineNum++;
          newLineNum++;
          result.push({ content: line, type: 'unchanged', oldLineNum, newLineNum });
        }
      });
    });

    return result;
  }, [response1, response2, ignoredPaths, ignoreKeyOrder]);

  // Calculate diff stats
  const diffStats = useMemo(() => {
    if (!diffWithMoves) return { added: 0, removed: 0 };
    return {
      added: diffWithMoves.filter(l => l.type === 'added' || l.type === 'moved-to').length,
      removed: diffWithMoves.filter(l => l.type === 'removed' || l.type === 'moved-from').length,
    };
  }, [diffWithMoves]);

  const getStatusBadgeClass = (status: number) => {
    if (status >= 200 && status < 300) {
      return 'bg-accent-success/15 text-accent-success';
    } else if (status >= 400) {
      return 'bg-accent-error/15 text-accent-error';
    }
    return 'bg-accent-warning/15 text-accent-warning';
  };

  const renderResponse = (response: ApiResponse | null) => {
    if (!response) {
      return (
        <div className="text-text-secondary text-center py-6 text-xs">
          No response yet
        </div>
      );
    }

    if (response.error) {
      return (
        <div className="bg-accent-error/10 border border-accent-error/30 rounded p-2">
          <p className="text-accent-error text-xs">{response.error}</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between bg-dark-bg-tertiary px-2 py-1.5 rounded text-xs">
          <div className="flex items-center gap-2">
            <span className={`badge ${getStatusBadgeClass(response.status)}`}>
              {response.status}
            </span>
            <span className="text-text-secondary">
              {response.duration}ms
            </span>
          </div>
        </div>

        <JsonDisplay data={response.data} defaultBeautified={true} showBeautifyToggle={true} />

        {Object.keys(response.headers).length > 0 && (
          <div className="bg-dark-bg-tertiary p-2 rounded space-y-0.5">
            <div className="text-xs font-medium text-text-secondary mb-1">
              Response Headers
            </div>
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="text-xs font-mono">
                <span className="font-medium text-text-primary">{key}:</span>{' '}
                <span className="text-text-secondary">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDiff = () => {
    if (!diffWithMoves || !response1 || !response2) return null;

    return (
      <div className="card overflow-hidden">
        {/* GitHub-style diff header */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#c9d1d9]">Diff View</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#3fb950]">+{diffStats.added}</span>
              <span className="text-[#f85149]">-{diffStats.removed}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-[#8b949e] cursor-pointer" title="When enabled, keys and array elements are sorted before comparison, ignoring positional differences">
              <input
                type="checkbox"
                checked={ignoreKeyOrder}
                onChange={(e) => onIgnoreKeyOrderChange?.(e.target.checked)}
                className="rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-[#58a6ff] focus:ring-offset-0 w-3 h-3"
              />
              Ignore key order
            </label>
            <button
              onClick={() => setShowIgnoredPaths(!showIgnoredPaths)}
              className="text-xs text-[#58a6ff] hover:underline"
            >
              {showIgnoredPaths ? 'Hide' : 'Show'} Ignored Paths ({ignoredPaths.length})
            </button>
          </div>
        </div>

        {showIgnoredPaths && (
          <div className="px-2 py-2 bg-[#161b22] border-b border-[#30363d]">
            <div className="flex gap-1.5 mb-1.5">
              <input
                type="text"
                value={newIgnoredPath}
                onChange={(e) => setNewIgnoredPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddIgnoredPath()}
                placeholder="e.g. transaction_id or data.items[*].id"
                className="input flex-1 text-xs"
              />
              <button
                onClick={handleAddIgnoredPath}
                className="btn-accent text-xs px-2"
              >
                Add
              </button>
            </div>
            {ignoredPaths.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {ignoredPaths.map((path) => (
                  <span
                    key={path}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-[#21262d] rounded border border-[#30363d]"
                  >
                    <code className="text-[#c9d1d9] font-mono">{path}</code>
                    <button
                      onClick={() => handleRemoveIgnoredPath(path)}
                      className="text-[#8b949e] hover:text-[#f85149] transition-colors"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8b949e]">
                No paths ignored. Add paths like "transaction_id" or "data.timestamp" to exclude from diff.
              </p>
            )}
          </div>
        )}

        {/* GitHub-style diff content */}
        <div className="overflow-x-auto bg-[#0d1117]">
          <table className="w-full text-xs font-mono border-collapse">
            <tbody>
              {diffWithMoves.map((line, index) => {
                let bgClass = '';
                let lineNumBg = '';
                let signClass = '';
                let sign = ' ';

                switch (line.type) {
                  case 'added':
                    bgClass = 'bg-[#1a4721]';
                    lineNumBg = 'bg-[#1a4721] text-[#7ee787]';
                    signClass = 'text-[#7ee787]';
                    sign = '+';
                    break;
                  case 'removed':
                    bgClass = 'bg-[#4a2024]';
                    lineNumBg = 'bg-[#4a2024] text-[#f85149]';
                    signClass = 'text-[#f85149]';
                    sign = '-';
                    break;
                  case 'moved-from':
                    bgClass = 'bg-[#341a37]';
                    lineNumBg = 'bg-[#341a37] text-[#a371f7]';
                    signClass = 'text-[#a371f7]';
                    sign = '~';
                    break;
                  case 'moved-to':
                    bgClass = 'bg-[#1a2d3d]';
                    lineNumBg = 'bg-[#1a2d3d] text-[#58a6ff]';
                    signClass = 'text-[#58a6ff]';
                    sign = '~';
                    break;
                  default:
                    bgClass = '';
                    lineNumBg = 'text-[#484f58]';
                    signClass = 'text-[#484f58]';
                }

                return (
                  <tr key={index} className={`${bgClass} border-0`}>
                    {/* Old line number */}
                    <td className={`w-10 px-2 py-0 text-right select-none border-r border-[#30363d] ${lineNumBg}`}>
                      {line.oldLineNum || ''}
                    </td>
                    {/* New line number */}
                    <td className={`w-10 px-2 py-0 text-right select-none border-r border-[#30363d] ${lineNumBg}`}>
                      {line.newLineNum || ''}
                    </td>
                    {/* Sign column */}
                    <td className={`w-6 px-1 py-0 text-center select-none ${signClass}`}>
                      {sign}
                    </td>
                    {/* Content */}
                    <td className="px-2 py-0 whitespace-pre">
                      {highlightJsonLine(line.content)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 px-2 py-1.5 bg-[#161b22] border-t border-[#30363d] text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#1a4721]"></span>
            <span className="text-[#8b949e]">Added</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#4a2024]"></span>
            <span className="text-[#8b949e]">Removed</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#341a37]"></span>
            <span className="text-[#8b949e]">Moved from</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#1a2d3d]"></span>
            <span className="text-[#8b949e]">Moved to</span>
          </span>
        </div>
      </div>
    );
  };

  // Only show diff mode
  if (!showResponses && showDiff) {
    return renderDiff();
  }

  if (!response1 && !response2) {
    return (
      <div className="card p-6 text-center">
        <div className="text-text-secondary text-xs">
          Send a request to see the {singleMode ? 'response' : 'comparison'}
        </div>
      </div>
    );
  }

  // Render single environment response panel
  const renderSingleResponsePanel = (response: ApiResponse | null, envName: string, loading: boolean, envIndex: 1 | 2) => (
    <div className="card p-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-text-primary">{envName}</h3>
        {onRerun && (
          <button
            onClick={() => onRerun(envIndex)}
            disabled={loading}
            className="btn-accent text-xs px-2 py-0.5 flex items-center gap-1"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-2.5 h-2.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Rerun
              </>
            )}
          </button>
        )}
      </div>
      {loading ? (
        <div className="text-text-secondary text-center py-6 text-xs flex items-center justify-center gap-1.5">
          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </div>
      ) : (
        renderResponse(response)
      )}
    </div>
  );

  // Single mode - show only one response panel
  if (singleMode && singleEnvIndex) {
    const response = singleEnvIndex === 1 ? response1 : response2;
    const envName = singleEnvIndex === 1 ? env1Name : env2Name;
    const loading = singleEnvIndex === 1 ? loading1 : loading2;

    return (
      <div className="space-y-2 responses-container">
        {showResponses && renderSingleResponsePanel(response, envName, loading, singleEnvIndex)}
      </div>
    );
  }

  return (
    <div className="space-y-2 responses-container">
      {showResponses && <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 responses-grid">
        {renderSingleResponsePanel(response1, env1Name, loading1, 1)}
        {renderSingleResponsePanel(response2, env2Name, loading2, 2)}
      </div>}

      {showDiff && response1 && response2 && !response1.error && !response2.error && renderDiff()}
    </div>
  );
};

export default ResponseComparison;
