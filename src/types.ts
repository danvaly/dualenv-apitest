export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  createdAt: number;
  updatedAt: number;
}

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  body?: string;
  headers?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
  error?: string;
  timestamp: number;
  duration: number;
}

export interface ComparisonResult {
  env1: ApiResponse | null;
  env2: ApiResponse | null;
  loading: boolean;
  loading1: boolean;
  loading2: boolean;
}

export interface SavedRequest {
  id: string;
  name: string;
  request: ApiRequest;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  isExpanded: boolean;
  createdAt: number;
}

export interface RequestCollection {
  id: string;
  name: string;
  folders: Folder[];
  requests: SavedRequest[];
  createdAt: number;
  updatedAt: number;
}

export interface CorsSettings {
  enabled: boolean;
  proxyUrl: string;
}

export type RequestMode = 'fetch' | 'curl';

export interface RequestSettings {
  mode: RequestMode;
  curlServerUrl: string;
}

export interface DiffSettings {
  ignoredPaths: string[];
  ignoreKeyOrder: boolean;
}

export interface OpenTab {
  id: string;
  title: string;
  request: ApiRequest;
  savedRequestId: string | null; // null for unsaved/new tabs
  isDirty: boolean; // true if modified since last save
  comparison: ComparisonResult;
}

export interface PanelSizes {
  sidebarWidth: number;
  requestPanelWidth: number; // percentage of main area (0-100)
  diffPanelHeight: number; // percentage of response area (0-100)
}

export interface HistoryEntry {
  id: string;
  request: ApiRequest;
  env1Response: ApiResponse | null;
  env2Response: ApiResponse | null;
  env1Name: string | null;
  env2Name: string | null;
  timestamp: number;
}

export interface HistorySettings {
  maxEntries: number; // Maximum number of history entries to keep
  enabled: boolean;
}

export interface ProxySettings {
  enabled: boolean;
  host: string;
  port: string;
  username: string;
  password: string;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
}

export interface ConsoleLogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'request' | 'response' | 'error' | 'verbose';
  message: string;
  details?: string;
}

export interface AppConfig {
  version: number;
  environments: Environment[];
  selectedEnv1Id: string | null;
  selectedEnv2Id: string | null;
  corsSettings: CorsSettings;
  requestSettings: RequestSettings;
  diffSettings: DiffSettings;
  proxySettings: ProxySettings;
  collections: RequestCollection[];
  activeCollectionId: string | null;
  openTabs: OpenTab[];
  activeTabId: string | null;
  panelSizes: PanelSizes;
  history: HistoryEntry[];
  historySettings: HistorySettings;
}
