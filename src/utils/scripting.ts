import type { ApiRequest, ApiResponse, ScriptTestResult } from '../types';

export interface ScriptOutcome {
  request: ApiRequest;
  variableChanges: Record<string, string>;
  tests: ScriptTestResult[];
  logs: string[];
}

interface PmApi {
  variables: {
    get: (key: string) => string | undefined;
    set: (key: string, value: string) => void;
  };
  test: (name: string, fn: () => void | Promise<void>) => Promise<void>;
  expect: (actual: unknown) => {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toContain: (expected: unknown) => void;
    toBeBelow: (expected: number) => void;
  };
  response?: {
    status: number;
    body: unknown;
    headers: Record<string, string>;
    duration: number;
  };
}

const serialize = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export async function runScript(options: {
  code: string;
  phase: 'pre' | 'post';
  request: ApiRequest;
  variables: Record<string, string>;
  response?: ApiResponse;
}): Promise<ScriptOutcome> {
  const { code, phase, request, variables, response } = options;
  const outcome: ScriptOutcome = { request: { ...request }, variableChanges: {}, tests: [], logs: [] };
  if (!code.trim()) return outcome;

  const pm: PmApi = {
    variables: {
      get: key => variables[key] ?? outcome.variableChanges[key],
      set: (key, value) => {
        outcome.variableChanges[key] = String(value);
      },
    },
    test: async (name, fn) => {
      try {
        await fn();
        outcome.tests.push({ name, pass: true });
      } catch (error) {
        outcome.tests.push({ name, pass: false, error: error instanceof Error ? error.message : String(error) });
      }
    },
    expect: actual => ({
      toBe: expected => {
        if (actual !== expected) throw new Error(`expected ${serialize(actual)} to be ${serialize(expected)}`);
      },
      toEqual: expected => {
        if (serialize(actual) !== serialize(expected)) throw new Error(`expected ${serialize(actual)} to equal ${serialize(expected)}`);
      },
      toContain: expected => {
        const haystack = typeof actual === 'string' ? actual : serialize(actual);
        if (!haystack.includes(typeof expected === 'string' ? expected : serialize(expected))) {
          throw new Error(`expected ${haystack} to contain ${serialize(expected)}`);
        }
      },
      toBeBelow: expected => {
        if (typeof actual !== 'number' || !(actual < expected)) throw new Error(`expected ${serialize(actual)} to be below ${expected}`);
      },
    }),
  };
  if (response) {
    pm.response = {
      status: response.status,
      body: response.data,
      headers: response.headers,
      duration: response.duration,
    };
  }

  const consoleProxy = {
    log: (...args: unknown[]) => outcome.logs.push(args.map(serialize).join(' ')),
    warn: (...args: unknown[]) => outcome.logs.push(args.map(serialize).join(' ')),
    error: (...args: unknown[]) => outcome.logs.push(args.map(serialize).join(' ')),
  };

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
    ...args: string[]
  ) => (...fnArgs: unknown[]) => Promise<unknown>;

  const fn = new AsyncFunction('pm', 'request', 'response', 'console', `"use strict";\n${code}`);
  try {
    await fn(pm, outcome.request, response?.data, consoleProxy);
  } catch (error) {
    throw new Error(`${phase === 'pre' ? 'Pre-request' : 'Response'} script failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return outcome;
}

/** Minimal JSONPath-lite: supports $.a.b[0].c */
export function extractPath(data: unknown, path: string): unknown {
  const trimmed = path.trim().replace(/^\$\.?/, '');
  if (!trimmed) return data;
  const segments = trimmed.match(/[^.[\]]+|\[\d+\]/g) || [];
  let current: unknown = data;
  for (const segment of segments) {
    if (current == null) return undefined;
    const indexMatch = segment.match(/^\[(\d+)\]$/);
    if (indexMatch) {
      current = Array.isArray(current) ? current[Number(indexMatch[1])] : undefined;
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}
