import React, { useState, useEffect } from 'react';

interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  message?: string;
}

interface UpdateNotificationProps {
  onDismiss?: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onDismiss }) => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [appVersion, setAppVersion] = useState<string>('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.isElectron) return;

    // Get current app version
    window.electronAPI.getAppVersion().then(setAppVersion);

    // Listen for update status
    const unsubscribe = window.electronAPI.onUpdateStatus((status) => {
      setUpdateStatus(status as UpdateStatus);
      // Auto-dismiss "not-available" after a short time
      if (status.status === 'not-available') {
        setTimeout(() => setUpdateStatus(null), 3000);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI) return;
    setUpdateStatus({ status: 'checking' });
    await window.electronAPI.checkForUpdates();
  };

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.downloadUpdate();
  };

  const handleInstallUpdate = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.installUpdate();
  };

  const handleDismiss = () => {
    setDismissed(true);
    setUpdateStatus(null);
    onDismiss?.();
  };

  // Don't render if not in Electron or dismissed
  if (!window.electronAPI?.isElectron) return null;

  // Render check button when no update status
  if (!updateStatus) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-tertiary">
        {appVersion && <span>v{appVersion}</span>}
        <button
          onClick={handleCheckForUpdates}
          className="hover:text-text-primary transition-colors"
          title="Check for updates"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    );
  }

  // Checking for updates
  if (updateStatus.status === 'checking') {
    return (
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Checking for updates...</span>
      </div>
    );
  }

  // No update available
  if (updateStatus.status === 'not-available') {
    return (
      <div className="flex items-center gap-2 text-xs text-accent-success">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>You're up to date! (v{appVersion})</span>
      </div>
    );
  }

  // Update available
  if (updateStatus.status === 'available' && !dismissed) {
    return (
      <div className="fixed bottom-4 right-4 z-50 card p-3 shadow-lg border border-accent-primary/30 bg-dark-bg-secondary max-w-sm animate-slide-in-right">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-accent-primary/20 text-accent-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-text-primary">Update Available</h4>
            <p className="text-xs text-text-secondary mt-0.5">
              Version {updateStatus.version} is ready to download.
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleDownloadUpdate}
                className="btn-primary text-xs"
              >
                Download
              </button>
              <button
                onClick={handleDismiss}
                className="btn text-xs"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Downloading
  if (updateStatus.status === 'downloading') {
    const percent = Math.round(updateStatus.percent || 0);
    return (
      <div className="fixed bottom-4 right-4 z-50 card p-3 shadow-lg border border-accent-primary/30 bg-dark-bg-secondary max-w-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-accent-primary/20 text-accent-primary">
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-text-primary">Downloading Update</h4>
            <div className="mt-1.5">
              <div className="h-1.5 bg-dark-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-primary rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-xs text-text-tertiary mt-1">{percent}% complete</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Downloaded - ready to install
  if (updateStatus.status === 'downloaded') {
    return (
      <div className="fixed bottom-4 right-4 z-50 card p-3 shadow-lg border border-accent-success/30 bg-dark-bg-secondary max-w-sm animate-slide-in-right">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-accent-success/20 text-accent-success">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-text-primary">Update Ready</h4>
            <p className="text-xs text-text-secondary mt-0.5">
              Restart the app to apply the update.
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleInstallUpdate}
                className="btn-primary text-xs"
              >
                Restart Now
              </button>
              <button
                onClick={handleDismiss}
                className="btn text-xs"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (updateStatus.status === 'error') {
    return (
      <div className="flex items-center gap-2 text-xs text-accent-error">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Update check failed</span>
        <button
          onClick={handleCheckForUpdates}
          className="hover:text-accent-error/80 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
};

export default UpdateNotification;
