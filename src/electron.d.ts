import type { AppConfig } from './types';

interface ConfigResult {
  success: boolean;
  data?: AppConfig;
  error?: string;
  canceled?: boolean;
  filePath?: string;
}

interface ElectronAPI {
  executeCurl: (params: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  }) => Promise<{
    status?: number;
    statusText?: string;
    data?: any;
    headers?: Record<string, string>;
    duration: number;
    error?: string;
  }>;
  toggleDevTools: () => Promise<boolean>;
  readConfig: () => Promise<ConfigResult>;
  writeConfig: (config: AppConfig) => Promise<{ success: boolean; error?: string }>;
  getConfigPath: () => Promise<string>;
  exportConfig: (config: AppConfig) => Promise<ConfigResult>;
  importConfig: () => Promise<ConfigResult>;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
