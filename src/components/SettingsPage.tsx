import type { CorsSettings, RequestSettings, ProxySettings, HistorySettings } from '../types';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  corsSettings: CorsSettings;
  requestSettings: RequestSettings;
  proxySettings: ProxySettings;
  historySettings: HistorySettings;
  onCorsSettingsChange: (settings: CorsSettings) => void;
  onRequestSettingsChange: (settings: RequestSettings) => void;
  onProxySettingsChange: (settings: ProxySettings) => void;
  onHistorySettingsChange: (settings: HistorySettings) => void;
  isElectron: boolean;
}

export default function SettingsPage({
  isOpen,
  onClose,
  corsSettings,
  requestSettings,
  proxySettings,
  historySettings,
  onCorsSettingsChange,
  onRequestSettingsChange,
  onProxySettingsChange,
  onHistorySettingsChange,
  isElectron,
}: SettingsPageProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-bg-secondary rounded-lg border border-dark-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-text-tertiary hover:text-text-primary rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
          {/* Request Mode Settings */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Request Mode
            </h3>
            <div className="card p-3 space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="requestMode"
                    checked={requestSettings.mode === 'fetch'}
                    onChange={() => onRequestSettingsChange({ ...requestSettings, mode: 'fetch' })}
                    className="w-3.5 h-3.5 accent-accent-primary"
                  />
                  <span className="text-sm text-text-primary group-hover:text-accent-primary transition-colors">Fetch API</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="requestMode"
                    checked={requestSettings.mode === 'curl'}
                    onChange={() => onRequestSettingsChange({ ...requestSettings, mode: 'curl' })}
                    className="w-3.5 h-3.5 accent-accent-primary"
                  />
                  <span className="text-sm text-text-primary group-hover:text-accent-primary transition-colors">cURL</span>
                </label>
              </div>
              {requestSettings.mode === 'curl' && !isElectron && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1">cURL Server URL</label>
                  <input
                    type="text"
                    value={requestSettings.curlServerUrl}
                    onChange={(e) => onRequestSettingsChange({ ...requestSettings, curlServerUrl: e.target.value })}
                    className="input"
                    placeholder="http://localhost:3001"
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    URL of the cURL proxy server (run: node curl-server.cjs)
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Proxy Settings */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Proxy Configuration
              {requestSettings.mode === 'fetch' && (
                <span className="text-xs text-text-tertiary">(cURL mode only)</span>
              )}
            </h3>
            <div className={`card p-3 space-y-3 ${requestSettings.mode === 'fetch' ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={proxySettings.enabled}
                  onChange={(e) => onProxySettingsChange({ ...proxySettings, enabled: e.target.checked })}
                  className="w-3.5 h-3.5 accent-accent-primary rounded"
                />
                <span className="text-sm text-text-primary">Enable Proxy</span>
              </label>

              {proxySettings.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Protocol</label>
                      <select
                        value={proxySettings.protocol}
                        onChange={(e) => onProxySettingsChange({ ...proxySettings, protocol: e.target.value as ProxySettings['protocol'] })}
                        className="input"
                      >
                        <option value="http">HTTP</option>
                        <option value="https">HTTPS</option>
                        <option value="socks4">SOCKS4</option>
                        <option value="socks5">SOCKS5</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Port</label>
                      <input
                        type="text"
                        value={proxySettings.port}
                        onChange={(e) => onProxySettingsChange({ ...proxySettings, port: e.target.value })}
                        className="input"
                        placeholder="8080"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Host</label>
                    <input
                      type="text"
                      value={proxySettings.host}
                      onChange={(e) => onProxySettingsChange({ ...proxySettings, host: e.target.value })}
                      className="input"
                      placeholder="proxy.example.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Username (optional)</label>
                      <input
                        type="text"
                        value={proxySettings.username}
                        onChange={(e) => onProxySettingsChange({ ...proxySettings, username: e.target.value })}
                        className="input"
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">Password (optional)</label>
                      <input
                        type="password"
                        value={proxySettings.password}
                        onChange={(e) => onProxySettingsChange({ ...proxySettings, password: e.target.value })}
                        className="input"
                        placeholder="password"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-text-tertiary">
                    Proxy will be used for all cURL requests. Format: {proxySettings.protocol}://
                    {proxySettings.username && `${proxySettings.username}:****@`}
                    {proxySettings.host || 'host'}:{proxySettings.port || 'port'}
                  </p>
                </>
              )}
            </div>
          </section>

          {/* CORS Settings (Fetch mode only) */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              CORS Proxy
              {requestSettings.mode === 'curl' && (
                <span className="text-xs text-text-tertiary">(Fetch mode only)</span>
              )}
            </h3>
            <div className={`card p-3 space-y-3 ${requestSettings.mode === 'curl' ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={corsSettings.enabled}
                  onChange={(e) => onCorsSettingsChange({ ...corsSettings, enabled: e.target.checked })}
                  className="w-3.5 h-3.5 accent-accent-primary rounded"
                />
                <span className="text-sm text-text-primary">Enable CORS Proxy</span>
              </label>

              {corsSettings.enabled && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Proxy URL</label>
                  <input
                    type="text"
                    value={corsSettings.proxyUrl}
                    onChange={(e) => onCorsSettingsChange({ ...corsSettings, proxyUrl: e.target.value })}
                    className="input"
                    placeholder="https://corsproxy.io/?"
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    Your request URL will be appended to this proxy URL
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* History Settings */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </h3>
            <div className="card p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={historySettings.enabled}
                  onChange={(e) => onHistorySettingsChange({ ...historySettings, enabled: e.target.checked })}
                  className="w-3.5 h-3.5 accent-accent-primary rounded"
                />
                <span className="text-sm text-text-primary">Enable Request History</span>
              </label>

              {historySettings.enabled && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Max History Entries</label>
                  <input
                    type="number"
                    value={historySettings.maxEntries}
                    onChange={(e) => onHistorySettingsChange({ ...historySettings, maxEntries: parseInt(e.target.value) || 100 })}
                    className="input w-32"
                    min={10}
                    max={1000}
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    Older entries will be automatically removed when limit is reached
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-dark-border">
          <button onClick={onClose} className="btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
