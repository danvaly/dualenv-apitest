import React, { useState, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface JsonDisplayProps {
  data: any;
  defaultBeautified?: boolean;
  showBeautifyToggle?: boolean;
}

const JsonDisplay: React.FC<JsonDisplayProps> = ({
  data,
  defaultBeautified = true,
  showBeautifyToggle = true,
}) => {
  const [beautified, setBeautified] = useState(defaultBeautified);

  const jsonString = useMemo(() => {
    try {
      if (typeof data === 'string') {
        // Try to parse if it's already a string (might be raw JSON)
        try {
          const parsed = JSON.parse(data);
          return beautified ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
        } catch {
          return data;
        }
      }
      return beautified ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    } catch {
      return String(data);
    }
  }, [data, beautified]);

  // Custom dark theme
  const darkCodeTheme = {
    ...oneDark,
    'pre[class*="language-"]': {
      ...oneDark['pre[class*="language-"]'],
      background: '#0d1117',
      margin: 0,
      padding: '8px',
      fontSize: '11px',
      fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
      borderRadius: '4px',
    },
    'code[class*="language-"]': {
      ...oneDark['code[class*="language-"]'],
      background: 'transparent',
      fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
    },
  };

  return (
    <div className="relative">
      {showBeautifyToggle && (
        <div className="absolute top-1.5 right-1.5 z-10">
          <label className="flex items-center gap-1.5 cursor-pointer bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded text-xs">
            <div className="relative">
              <input
                type="checkbox"
                checked={beautified}
                onChange={(e) => setBeautified(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-6 h-3 bg-dark-border rounded-full peer peer-checked:bg-accent-primary transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-2 h-2 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-3"></div>
            </div>
            <span className="text-text-secondary">Beautify</span>
          </label>
        </div>
      )}
      <div className="rounded overflow-hidden border border-[#30363d]/40">
        <SyntaxHighlighter
          language="json"
          style={darkCodeTheme}
          customStyle={{
            margin: 0,
            padding: '8px',
            fontSize: '11px',
            borderRadius: '4px',
            background: '#0d1117',
          }}
          wrapLongLines={!beautified}
        >
          {jsonString}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default JsonDisplay;
