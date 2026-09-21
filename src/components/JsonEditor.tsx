import { memo, useLayoutEffect, useMemo, useRef } from 'react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}

const fontStyle = {
  fontFamily: "'JetBrains Mono', 'Fira Code', Monaco, Consolas, monospace",
  fontSize: '12px',
  lineHeight: '19.2px',
  letterSpacing: 'normal',
  tabSize: 2,
  whiteSpace: 'pre' as const,
  wordBreak: 'normal' as const,
  overflowWrap: 'normal' as const,
  textShadow: 'none',
};

// Escape every source fragment before adding our own token markup. This keeps
// pasted HTML inert and avoids creating thousands of React components per edit.
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!);

const HighlightedJson = memo(function HighlightedJson({ value }: { value: string }) {
  const html = useMemo(() => {
    const tokens = /"(?:\\.|[^"\\])*"|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\b(?:true|false|null)\b|[{}[\],:]/g;
    let result = '';
    let cursor = 0;
    for (const match of value.matchAll(tokens)) {
      const token = match[0];
      const end = match.index + token.length;
      const type = token.startsWith('"')
        ? /^\s*:/.test(value.slice(end)) ? 'key' : 'string'
        : /^(true|false|null)$/.test(token) ? 'literal'
        : /^-?\d/.test(token) ? 'number' : 'punctuation';
      result += escapeHtml(value.slice(cursor, match.index));
      result += `<span class="json-token-${type}">${escapeHtml(token)}</span>`;
      cursor = end;
    }
    return result + escapeHtml(value.slice(cursor)) + ' ';
  }, [value]);
  return (
    <pre style={{ ...fontStyle, margin: 0, padding: '12px', color: '#abb2bf', background: 'transparent', overflow: 'hidden', boxSizing: 'border-box', border: 0, borderRadius: 0 }}>
      <code style={fontStyle} dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
});

export default function JsonEditor({ value, onChange, label, placeholder, className = '' }: JsonEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const syncScroll = () => {
    const textarea = ref.current;
    const pre = highlightRef.current?.querySelector('pre');
    if (!textarea || !pre) return;
    // Use the actual text viewport, excluding native scrollbars. Both surfaces
    // have identical padding, font metrics and no wrapping.
    pre.style.width = `${textarea.clientWidth}px`;
    pre.style.height = `${textarea.clientHeight}px`;
    pre.scrollTop = textarea.scrollTop;
    pre.scrollLeft = textarea.scrollLeft;
  };

  useLayoutEffect(() => {
    syncScroll();
  }, [value]);

  useLayoutEffect(() => {
    const observer = new ResizeObserver(syncScroll);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`json-editor ${className}`}>
      <div ref={highlightRef} aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        <HighlightedJson value={value} />
      </div>
      <textarea
        ref={ref}
        aria-label={label}
        title="Ctrl/Cmd+] inserts two spaces. Tab moves to the next control."
        value={value}
        onChange={event => onChange(event.target.value)}
        onScroll={syncScroll}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap="off"
        className="json-editor-input"
        style={fontStyle}
        onKeyDown={event => {
          if (event.key !== ']' || !(event.ctrlKey || event.metaKey)) return;
          event.preventDefault();
          const textarea = event.currentTarget;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const scrollTop = textarea.scrollTop;
          const scrollLeft = textarea.scrollLeft;
          onChange(value.slice(0, start) + '  ' + value.slice(end));
          requestAnimationFrame(() => {
            if (ref.current !== textarea) return;
            textarea.setSelectionRange(start + 2, start + 2);
            textarea.scrollTop = scrollTop;
            textarea.scrollLeft = scrollLeft;
            syncScroll();
          });
        }}
      />
    </div>
  );
}
