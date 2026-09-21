import React, { useState } from 'react';
import type { ApiRequest, ApiResponse, RequestCollection, SavedRequest } from '../types';

export interface RunResult {
  requestId: string;
  name: string;
  env1: ApiResponse | null;
  env2: ApiResponse | null;
  error?: string;
  testsPass: number;
  testsFail: number;
  identical: boolean | null; // null when not dual
}

interface CollectionRunnerProps {
  collection: RequestCollection;
  env1Name: string | null;
  env2Name: string | null;
  runRequest: (request: ApiRequest) => Promise<{ env1: ApiResponse | null; env2: ApiResponse | null }>;
  onClose: () => void;
}

const countTests = (responses: Array<ApiResponse | null>): { pass: number; fail: number } => {
  let pass = 0;
  let fail = 0;
  for (const response of responses) {
    for (const test of response?.tests || []) {
      if (test.pass) pass++;
      else fail++;
    }
  }
  return { pass, fail };
};

const dataEqual = (a: unknown, b: unknown): boolean => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

const CollectionRunner: React.FC<CollectionRunnerProps> = ({ collection, env1Name, env2Name, runRequest, onClose }) => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RunResult[]>([]);
  const [delayMs, setDelayMs] = useState(0);

  const run = async () => {
    setRunning(true);
    setResults([]);
    setProgress(0);
    const collected: RunResult[] = [];
    for (let i = 0; i < collection.requests.length; i++) {
      const saved: SavedRequest = collection.requests[i];
      try {
        const { env1, env2 } = await runRequest(saved.request);
        const { pass, fail } = countTests([env1, env2]);
        const dual = env1 !== null && env2 !== null;
        collected.push({
          requestId: saved.id,
          name: saved.name,
          env1,
          env2,
          testsPass: pass,
          testsFail: fail,
          identical: dual ? env1!.status === env2!.status && dataEqual(env1!.data, env2!.data) : null,
        });
      } catch (error) {
        collected.push({
          requestId: saved.id,
          name: saved.name,
          env1: null,
          env2: null,
          error: error instanceof Error ? error.message : String(error),
          testsPass: 0,
          testsFail: 0,
          identical: null,
        });
      }
      setResults([...collected]);
      setProgress(i + 1);
      if (delayMs > 0 && i < collection.requests.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    setRunning(false);
  };

  const statusBadge = (response: ApiResponse | null) => {
    if (!response) return <span className="text-text-muted">—</span>;
    const ok = response.status >= 200 && response.status < 300 && !response.error;
    return (
      <span className={ok ? 'text-green-400' : 'text-red-400'}>
        {response.error ? 'ERR' : response.status} · {response.duration}ms
      </span>
    );
  };

  const totals = results.reduce(
    (acc, r) => ({
      failed: acc.failed + (r.error || r.testsFail > 0 || r.identical === false ? 1 : 0),
      passed: acc.passed + (!r.error && r.testsFail === 0 && r.identical !== false ? 1 : 0),
    }),
    { failed: 0, passed: 0 },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-dark-surface border border-dark-border rounded-lg shadow-xl w-[640px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
          <h2 className="text-sm font-semibold text-text-primary">Run Collection: {collection.name}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label="Close">×</button>
        </div>

        <div className="px-4 py-3 border-b border-dark-border flex items-center gap-3">
          <button onClick={run} disabled={running || collection.requests.length === 0} className="btn-primary px-3 py-1 text-xs disabled:opacity-50">
            {running ? `Running ${progress}/${collection.requests.length}…` : `Run ${collection.requests.length} Requests`}
          </button>
          <label className="text-xs text-text-muted flex items-center gap-1">
            Delay (ms)
            <input type="number" min={0} className="input text-xs w-20" value={delayMs} onChange={e => setDelayMs(Number(e.target.value) || 0)} />
          </label>
          {results.length > 0 && !running && (
            <span className="text-xs">
              <span className="text-green-400">{totals.passed} passed</span>
              {' / '}
              <span className={totals.failed ? 'text-red-400' : 'text-text-muted'}>{totals.failed} failed</span>
            </span>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-2">
          {collection.requests.length === 0 && <p className="text-xs text-text-muted italic py-4 text-center">No saved requests in this collection.</p>}
          {results.length === 0 && collection.requests.length > 0 && (
            <ul className="text-xs text-text-secondary space-y-1 py-1">
              {collection.requests.map(r => <li key={r.id}>{r.request.method} {r.name}</li>)}
            </ul>
          )}
          {results.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted text-left">
                  <th className="py-1 pr-2">Request</th>
                  {env1Name && <th className="py-1 pr-2">{env1Name}</th>}
                  {env2Name && <th className="py-1 pr-2">{env2Name}</th>}
                  {env1Name && env2Name && <th className="py-1 pr-2">Match</th>}
                  <th className="py-1">Tests</th>
                </tr>
              </thead>
              <tbody>
                {results.map(result => (
                  <tr key={result.requestId} className="border-t border-dark-border">
                    <td className="py-1.5 pr-2 text-text-primary">{result.name}</td>
                    {env1Name && <td className="py-1.5 pr-2">{statusBadge(result.env1)}</td>}
                    {env2Name && <td className="py-1.5 pr-2">{statusBadge(result.env2)}</td>}
                    {env1Name && env2Name && (
                      <td className="py-1.5 pr-2">
                        {result.identical === null ? '—' : result.identical
                          ? <span className="text-green-400">✓</span>
                          : <span className="text-yellow-400">≠</span>}
                      </td>
                    )}
                    <td className="py-1.5">
                      {result.error
                        ? <span className="text-red-400" title={result.error}>error</span>
                        : result.testsPass + result.testsFail === 0
                          ? <span className="text-text-muted">—</span>
                          : <span className={result.testsFail ? 'text-red-400' : 'text-green-400'}>{result.testsPass}/{result.testsPass + result.testsFail}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionRunner;
