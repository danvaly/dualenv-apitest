import React, { useState } from 'react';
import type { HistoryEntry, ApiRequest, HistorySettings } from '../types';

interface HistoryPanelProps {
  history: HistoryEntry[];
  historySettings: HistorySettings;
  onSelectEntry: (request: ApiRequest, entry: HistoryEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onClearHistory: () => void;
  onUpdateSettings: (settings: HistorySettings) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  historySettings,
  onSelectEntry,
  onDeleteEntry,
  onClearHistory,
  onUpdateSettings,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'GET':
        return 'method-get';
      case 'POST':
        return 'method-post';
      case 'PUT':
        return 'method-put';
      case 'PATCH':
        return 'method-patch';
      case 'DELETE':
        return 'method-delete';
      default:
        return 'bg-text-tertiary/15 text-text-tertiary';
    }
  };

  const getStatusColor = (status: number | undefined) => {
    if (!status) return 'text-text-tertiary';
    if (status >= 200 && status < 300) return 'text-accent-success';
    if (status >= 300 && status < 400) return 'text-accent-primary';
    if (status >= 400 && status < 500) return 'text-yellow-500';
    return 'text-accent-error';
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (duration: number | undefined) => {
    if (!duration) return '-';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const getEndpointPath = (endpoint: string) => {
    try {
      const url = new URL(endpoint);
      return url.pathname + url.search;
    } catch {
      return endpoint.split('?')[0].split('/').slice(-2).join('/') || endpoint;
    }
  };

  const filteredHistory = searchQuery
    ? history.filter(entry =>
        entry.request.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.request.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.env1Name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.env2Name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : history;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-2 border-b border-dark-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-text-primary">History</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1 rounded transition-colors ${showSettings ? 'text-accent-primary' : 'text-text-tertiary hover:text-text-primary'}`}
              title="Settings"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="p-1 text-text-tertiary hover:text-accent-error rounded transition-colors"
                title="Clear history"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mb-2 p-2 bg-dark-bg-tertiary rounded text-xs space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={historySettings.enabled}
                onChange={(e) => onUpdateSettings({ ...historySettings, enabled: e.target.checked })}
                className="w-3 h-3 accent-accent-primary"
              />
              <span className="text-text-secondary">Enable history</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">Max entries:</span>
              <input
                type="number"
                min={10}
                max={500}
                value={historySettings.maxEntries}
                onChange={(e) => onUpdateSettings({ ...historySettings, maxEntries: Math.max(10, Math.min(500, parseInt(e.target.value) || 100)) })}
                className="input w-16 py-0.5 text-xs"
              />
            </div>
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search history..."
          className="input w-full text-xs py-1"
        />
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {!historySettings.enabled ? (
          <div className="text-center text-text-tertiary text-xs mt-6 px-2">
            History is disabled. Enable it in settings.
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center text-text-tertiary text-xs mt-6 px-2">
            {searchQuery ? 'No matching entries found.' : 'No history yet. Send a request to start.'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredHistory.map((entry) => (
              <div
                key={entry.id}
                className="p-2 bg-dark-bg-secondary hover:bg-dark-bg-tertiary rounded cursor-pointer group transition-colors"
                onClick={() => onSelectEntry(entry.request, entry)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge text-xs ${getMethodBadgeClass(entry.request.method)}`}>
                    {entry.request.method}
                  </span>
                  <span className="text-xs text-text-primary truncate flex-1 font-mono">
                    {getEndpointPath(entry.request.endpoint)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEntry(entry.id);
                    }}
                    className="p-0.5 text-text-tertiary hover:text-accent-error rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-text-tertiary">{formatTimestamp(entry.timestamp)}</span>

                  {/* Environment 1 response */}
                  {entry.env1Response && (
                    <div className="flex items-center gap-1">
                      {entry.env1Name && (
                        <span className="text-text-tertiary truncate max-w-[60px]" title={entry.env1Name}>
                          {entry.env1Name}:
                        </span>
                      )}
                      <span className={getStatusColor(entry.env1Response.status)}>
                        {entry.env1Response.status || 'ERR'}
                      </span>
                      <span className="text-text-tertiary">
                        {formatDuration(entry.env1Response.duration)}
                      </span>
                    </div>
                  )}

                  {/* Environment 2 response */}
                  {entry.env2Response && (
                    <div className="flex items-center gap-1">
                      {entry.env2Name && (
                        <span className="text-text-tertiary truncate max-w-[60px]" title={entry.env2Name}>
                          {entry.env2Name}:
                        </span>
                      )}
                      <span className={getStatusColor(entry.env2Response.status)}>
                        {entry.env2Response.status || 'ERR'}
                      </span>
                      <span className="text-text-tertiary">
                        {formatDuration(entry.env2Response.duration)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with count */}
      {historySettings.enabled && history.length > 0 && (
        <div className="p-2 border-t border-dark-border text-xs text-text-tertiary text-center">
          {filteredHistory.length} of {history.length} entries
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
