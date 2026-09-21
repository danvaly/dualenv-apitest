/** Persistent visual identity for Environment 1 vs Environment 2. */
export const ENV_STYLES = {
  1: {
    text: 'text-sky-400',
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/10',
    dot: 'bg-sky-400',
    ring: 'accent-sky-500',
  },
  2: {
    text: 'text-violet-400',
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/10',
    dot: 'bg-violet-400',
    ring: 'accent-violet-500',
  },
} as const;

export type EnvIndex = keyof typeof ENV_STYLES;

/** HTTP method colors — single source of truth (classes defined in index.css). */
export const METHOD_COLORS: Record<string, string> = {
  GET: 'text-method-get',
  POST: 'text-method-post',
  PUT: 'text-method-put',
  PATCH: 'text-method-patch',
  DELETE: 'text-method-delete',
};

export const methodColor = (method: string): string => METHOD_COLORS[method] || 'text-text-primary';
