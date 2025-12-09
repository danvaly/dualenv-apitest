import React, { useState } from 'react';
import type { CorsSettings } from '../types';
import Tooltip from './Tooltip';

interface CorsSettingsProps {
  settings: CorsSettings;
  onChange: (settings: CorsSettings) => void;
}

const CorsSettingsComponent: React.FC<CorsSettingsProps> = ({ settings, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card p-3 border-accent-warning/30 bg-accent-warning/5">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => onChange({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-dark-border rounded-full peer peer-checked:bg-accent-primary transition-colors"></div>
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></div>
          </div>
          <span className="text-sm font-medium text-accent-warning">
            CORS Proxy
          </span>
        </label>

        {settings.enabled && (
          <input
            type="text"
            value={settings.proxyUrl}
            onChange={(e) => onChange({ ...settings, proxyUrl: e.target.value })}
            placeholder="https://corsproxy.io/?"
            className="input flex-1 text-xs"
          />
        )}

        <Tooltip content={isExpanded ? 'Hide help' : 'Show help'}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-accent-warning hover:underline flex items-center gap-1"
          >
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isExpanded ? 'Less' : 'Help'}
          </button>
        </Tooltip>
      </div>

      {isExpanded && (
        <div className="text-xs text-text-secondary mt-3 pt-3 border-t border-accent-warning/20 space-y-3">
          <p>CORS proxies prepend to your URL to bypass cross-origin restrictions.</p>

          <div className="flex gap-2 flex-wrap">
            <span className="text-text-tertiary">Quick options:</span>
            <Tooltip content="Use corsproxy.io proxy">
              <button
                onClick={() => onChange({ ...settings, proxyUrl: 'https://corsproxy.io/?' })}
                className="text-accent-primary hover:underline"
              >
                corsproxy.io
              </button>
            </Tooltip>
            <Tooltip content="Use allorigins.win proxy">
              <button
                onClick={() => onChange({ ...settings, proxyUrl: 'https://api.allorigins.win/raw?url=' })}
                className="text-accent-primary hover:underline"
              >
                allorigins.win
              </button>
            </Tooltip>
            <Tooltip content="Use localhost proxy">
              <button
                onClick={() => onChange({ ...settings, proxyUrl: 'http://localhost:8080/' })}
                className="text-accent-primary hover:underline"
              >
                localhost:8080
              </button>
            </Tooltip>
          </div>

          <div className="flex items-start gap-2 p-2 bg-accent-warning/10 rounded-md">
            <svg className="w-4 h-4 text-accent-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-accent-warning">
              Don't send sensitive data through public proxies.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorsSettingsComponent;
