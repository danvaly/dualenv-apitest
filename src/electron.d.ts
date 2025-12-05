import type { AppConfig, ProxySettings } from './types';

interface ConfigResult {
  success: boolean;
  data?: AppConfig;
  error?: string;
  canceled?: boolean;
  filePath?: string;
}

interface VerboseLogEntry {
  type: 'info' | 'request' | 'response' | 'error' | 'verbose';
  message: string;
}

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

interface ElectronAPI {
  executeCurl: (params: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
    proxySettings?: ProxySettings;
  }) => Promise<{
    status?: number;
    statusText?: string;
    data?: any;
    headers?: Record<string, string>;
    duration: number;
    error?: string;
    verboseLogs?: VerboseLogEntry[];
  }>;
  toggleDevTools: () => Promise<boolean>;
  readConfig: () => Promise<ConfigResult>;
  writeConfig: (config: AppConfig) => Promise<{ success: boolean; error?: string }>;
  getConfigPath: () => Promise<string>;
  exportConfig: (config: AppConfig) => Promise<ConfigResult>;
  importConfig: () => Promise<ConfigResult>;
  isElectron: boolean;
  // Auto-update APIs
  checkForUpdates: () => Promise<{ success: boolean; updateInfo?: UpdateInfo; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<{ success: boolean }>;
  getAppVersion: () => Promise<string>;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
