import { useState, useEffect, useCallback, useRef } from 'react';
import RequestBuilder from './components/RequestBuilder';
import ResponseComparison from './components/ResponseComparison';
import Sidebar from './components/Sidebar';
import CorsSettingsComponent from './components/CorsSettings';
import EnvironmentManager from './components/EnvironmentManager';
import TabBar from './components/TabBar';
import ResizeHandle from './components/ResizeHandle';
import CurlModal from './components/CurlModal';
import type { Environment, EnvironmentVariable, ApiRequest, ApiResponse, ComparisonResult, Folder, SavedRequest, RequestCollection, OpenTab, PanelSizes, AppConfig } from './types';

const STORAGE_KEY = 'dual-env-tester-config';

const DEFAULT_PANEL_SIZES: PanelSizes = {
  sidebarWidth: 240,
  requestPanelWidth: 50,
  diffPanelHeight: 40,
};

const createDefaultTab = (): OpenTab => ({
  id: `tab-${Date.now()}`,
  title: 'New Request',
  request: {
    method: 'GET',
    endpoint: '',
    body: '',
    headers: {},
  },
  savedRequestId: null,
  isDirty: false,
  comparison: {
    env1: null,
    env2: null,
    loading: false,
    loading1: false,
    loading2: false,
  },
});

const createDefaultCollection = (): RequestCollection => ({
  id: `collection-${Date.now()}`,
  name: 'Default Collection',
  folders: [],
  requests: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const getDefaultConfig = (): AppConfig => {
  const defaultTab = createDefaultTab();
  const defaultCollection = createDefaultCollection();
  return {
    version: 1,
    environments: [],
    selectedEnv1Id: null,
    selectedEnv2Id: null,
    corsSettings: {
      enabled: false,
      proxyUrl: 'https://corsproxy.io/?',
    },
    requestSettings: {
      mode: 'fetch',
      curlServerUrl: 'http://localhost:3001',
    },
    diffSettings: {
      ignoredPaths: [],
    },
    collections: [defaultCollection],
    activeCollectionId: defaultCollection.id,
    openTabs: [defaultTab],
    activeTabId: defaultTab.id,
    panelSizes: DEFAULT_PANEL_SIZES,
  };
};

// Helper to substitute variables in a string
const substituteVariables = (text: string, variables: EnvironmentVariable[]): string => {
  let result = text;
  for (const variable of variables) {
    if (variable.enabled) {
      const pattern = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g');
      result = result.replace(pattern, variable.value);
    }
  }
  return result;
};

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const [showEnvConfig, setShowEnvConfig] = useState(true);
  const [showCorsConfig, setShowCorsConfig] = useState(true);
  const [curlModal, setCurlModal] = useState<{ isOpen: boolean; curlCommand: string; envName: string }>({
    isOpen: false,
    curlCommand: '',
    envName: '',
  });

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        let loadedConfig: AppConfig | null = null;

        if (window.electronAPI?.isElectron) {
          const result = await window.electronAPI.readConfig();
          if (result.success && result.data) {
            loadedConfig = result.data;
          }
        } else {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            loadedConfig = JSON.parse(saved);
          }
        }

        // Migrate old config
        if (loadedConfig) {
          // Migrate old config without tabs
          if (!loadedConfig.openTabs || loadedConfig.openTabs.length === 0) {
            const defaultTab = createDefaultTab();
            // @ts-expect-error - migrating old config
            if (loadedConfig.currentRequest) {
              // @ts-expect-error - migrating old config
              defaultTab.request = loadedConfig.currentRequest;
            }
            loadedConfig.openTabs = [defaultTab];
            loadedConfig.activeTabId = defaultTab.id;
          }
          // Migrate old config without panel sizes
          if (!loadedConfig.panelSizes) {
            loadedConfig.panelSizes = DEFAULT_PANEL_SIZES;
          }
          // Migrate old config from single collection to collections array
          if (!loadedConfig.collections) {
            // @ts-expect-error - migrating old config with single collection
            const oldCollection = loadedConfig.collection;
            const migratedCollection: RequestCollection = {
              id: `collection-${Date.now()}`,
              name: 'Default Collection',
              folders: oldCollection?.folders || [],
              requests: oldCollection?.requests || [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            loadedConfig.collections = [migratedCollection];
            loadedConfig.activeCollectionId = migratedCollection.id;
            // @ts-expect-error - removing old property
            delete loadedConfig.collection;
          }
          // Ensure there's at least one collection
          if (loadedConfig.collections.length === 0) {
            const defaultCollection = createDefaultCollection();
            loadedConfig.collections = [defaultCollection];
            loadedConfig.activeCollectionId = defaultCollection.id;
          }
          // Ensure activeCollectionId is valid
          if (!loadedConfig.activeCollectionId || !loadedConfig.collections.find(c => c.id === loadedConfig.activeCollectionId)) {
            loadedConfig.activeCollectionId = loadedConfig.collections[0].id;
          }
          setConfig(loadedConfig);
        } else {
          setConfig(getDefaultConfig());
        }
      } catch (error) {
        console.error('Failed to load config:', error);
        setConfig(getDefaultConfig());
      }
      setConfigLoaded(true);
    };

    loadConfig();
  }, []);

  // Hide loading screen when config is loaded
  useEffect(() => {
    if (configLoaded) {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => loadingScreen.remove(), 300);
      }
    }
  }, [configLoaded]);

  // Save config with debounce
  const saveConfig = useCallback((newConfig: AppConfig) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Don't persist comparison results (they contain response data)
        const configToSave = {
          ...newConfig,
          openTabs: newConfig.openTabs.map(tab => ({
            ...tab,
            comparison: {
              env1: null,
              env2: null,
              loading: false,
              loading1: false,
              loading2: false,
            },
          })),
        };

        if (window.electronAPI?.isElectron) {
          await window.electronAPI.writeConfig(configToSave);
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
        }
      } catch (error) {
        console.error('Failed to save config:', error);
      }
    }, 500);
  }, []);

  // Update config and trigger save
  const updateConfig = useCallback((updates: Partial<AppConfig>) => {
    setConfig(prev => {
      if (!prev) return prev;
      const newConfig = { ...prev, ...updates };
      saveConfig(newConfig);
      return newConfig;
    });
  }, [saveConfig]);

  // Derived state
  const environments = config?.environments || [];
  const selectedEnv1 = environments.find(e => e.id === config?.selectedEnv1Id) || null;
  const selectedEnv2 = environments.find(e => e.id === config?.selectedEnv2Id) || null;
  const env1Name = selectedEnv1?.name || 'Environment 1';
  const env2Name = selectedEnv2?.name || 'Environment 2';
  const corsSettings = config?.corsSettings || getDefaultConfig().corsSettings;
  const requestSettings = config?.requestSettings || getDefaultConfig().requestSettings;
  const diffSettings = config?.diffSettings || getDefaultConfig().diffSettings;
  const collections = config?.collections || getDefaultConfig().collections;
  const activeCollectionId = config?.activeCollectionId || null;
  const activeCollection = collections.find(c => c.id === activeCollectionId) || collections[0] || null;
  const openTabs = config?.openTabs || [];
  const activeTabId = config?.activeTabId || null;
  const activeTab = openTabs.find(t => t.id === activeTabId) || openTabs[0] || null;
  const panelSizes = config?.panelSizes || DEFAULT_PANEL_SIZES;

  // Determine if we're in single or dual environment mode
  const isDualMode = selectedEnv1 !== null && selectedEnv2 !== null;
  const isSingleMode = (selectedEnv1 !== null || selectedEnv2 !== null) && !isDualMode;
  const singleEnv = isSingleMode ? (selectedEnv1 || selectedEnv2) : null;
  const singleEnvIndex = isSingleMode ? (selectedEnv1 ? 1 : 2) : null;

  // Panel resize handlers
  const handleSidebarResize = useCallback((delta: number) => {
    const newWidth = Math.max(180, Math.min(500, panelSizes.sidebarWidth + delta));
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        panelSizes: { ...prev.panelSizes, sidebarWidth: newWidth },
      };
    });
  }, [panelSizes.sidebarWidth]);

  const handleRequestPanelResize = useCallback((delta: number) => {
    if (!mainContentRef.current) return;
    const containerWidth = mainContentRef.current.offsetWidth;
    const deltaPercent = (delta / containerWidth) * 100;
    const newWidth = Math.max(25, Math.min(75, panelSizes.requestPanelWidth + deltaPercent));
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        panelSizes: { ...prev.panelSizes, requestPanelWidth: newWidth },
      };
    });
  }, [panelSizes.requestPanelWidth]);

  const handleDiffPanelResize = useCallback((delta: number) => {
    if (!mainContentRef.current) return;
    const containerHeight = mainContentRef.current.offsetHeight;
    // Negative delta because dragging up should increase diff panel
    const deltaPercent = (-delta / containerHeight) * 100;
    const newHeight = Math.max(20, Math.min(70, panelSizes.diffPanelHeight + deltaPercent));
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        panelSizes: { ...prev.panelSizes, diffPanelHeight: newHeight },
      };
    });
  }, [panelSizes.diffPanelHeight]);

  const handleResizeEnd = useCallback(() => {
    if (config) {
      saveConfig(config);
    }
  }, [config, saveConfig]);

  // Tab management
  const handleNewTab = () => {
    const newTab = createDefaultTab();
    updateConfig({
      openTabs: [...openTabs, newTab],
      activeTabId: newTab.id,
    });
  };

  const handleSelectTab = (tabId: string) => {
    updateConfig({ activeTabId: tabId });
  };

  const handleCloseTab = (tabId: string) => {
    const newTabs = openTabs.filter(t => t.id !== tabId);

    if (newTabs.length === 0) {
      const newTab = createDefaultTab();
      updateConfig({
        openTabs: [newTab],
        activeTabId: newTab.id,
      });
    } else if (activeTabId === tabId) {
      const closedIndex = openTabs.findIndex(t => t.id === tabId);
      const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
      updateConfig({
        openTabs: newTabs,
        activeTabId: newTabs[newActiveIndex].id,
      });
    } else {
      updateConfig({ openTabs: newTabs });
    }
  };

  const updateActiveTab = (updates: Partial<OpenTab>) => {
    if (!activeTab) return;
    updateConfig({
      openTabs: openTabs.map(t =>
        t.id === activeTab.id ? { ...t, ...updates } : t
      ),
    });
  };

  const updateActiveTabRequest = (request: ApiRequest) => {
    if (!activeTab || !activeCollection) return;

    let isDirty = activeTab.isDirty;
    if (activeTab.savedRequestId) {
      const savedRequest = activeCollection.requests.find(r => r.id === activeTab.savedRequestId);
      if (savedRequest) {
        isDirty = JSON.stringify(request) !== JSON.stringify(savedRequest.request);
      }
    } else {
      isDirty = request.endpoint !== '' || request.body !== '';
    }

    const title = request.endpoint
      ? request.endpoint.split('?')[0].split('/').filter(Boolean).pop() || 'New Request'
      : 'New Request';

    updateActiveTab({
      request,
      isDirty,
      title: activeTab.savedRequestId
        ? activeCollection.requests.find(r => r.id === activeTab.savedRequestId)?.name || title
        : title,
    });
  };

  const updateActiveTabComparison = (comparison: ComparisonResult) => {
    if (!activeTab) return;
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        openTabs: prev.openTabs.map(t =>
          t.id === activeTab.id ? { ...t, comparison } : t
        ),
      };
    });
  };

  // Export configuration
  const handleExportConfig = async () => {
    if (!config) return;

    if (window.electronAPI?.isElectron) {
      await window.electronAPI.exportConfig(config);
    } else {
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-tester-config-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Import configuration
  const handleImportConfig = async (event?: React.ChangeEvent<HTMLInputElement>) => {
    if (window.electronAPI?.isElectron) {
      const result = await window.electronAPI.importConfig();
      if (result.success && result.data) {
        setConfig(result.data);
        saveConfig(result.data);
      }
    } else if (event) {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string) as AppConfig;
          setConfig(imported);
          saveConfig(imported);
        } catch (err) {
          console.error('Failed to import config:', err);
          alert('Failed to import configuration. Invalid file format.');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }
  };

  // Apply variable substitution to request
  const getSubstitutedRequest = (request: ApiRequest, env: Environment | null): { endpoint: string; body: string; headers: Record<string, string> } => {
    const variables = env?.variables.filter(v => v.enabled) || [];
    return {
      endpoint: substituteVariables(request.endpoint, variables),
      body: request.body ? substituteVariables(request.body, variables) : '',
      headers: Object.fromEntries(
        Object.entries(request.headers || {}).map(([k, v]) => [
          substituteVariables(k, variables),
          substituteVariables(v, variables),
        ])
      ),
    };
  };

  // Generate cURL command
  const generateCurl = (request: ApiRequest, env: Environment | null): string => {
    const substituted = getSubstitutedRequest(request, env);
    let url = substituted.endpoint;
    if (corsSettings.enabled && corsSettings.proxyUrl) {
      url = `${corsSettings.proxyUrl}${url}`;
    }

    const parts = [`curl -X ${request.method}`];

    const allHeaders = { ...substituted.headers };
    if (substituted.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      allHeaders['Content-Type'] = allHeaders['Content-Type'] || 'application/json';
    }

    Object.entries(allHeaders).forEach(([key, value]) => {
      parts.push(`-H '${key}: ${value}'`);
    });

    if (substituted.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      parts.push(`-d '${substituted.body.replace(/'/g, "'\\''")}'`);
    }

    parts.push(`'${url}'`);
    return parts.join(' \\\n  ');
  };


  // Helper to update the active collection
  const updateActiveCollection = (updates: Partial<RequestCollection>) => {
    if (!activeCollection) return;
    updateConfig({
      collections: collections.map(c =>
        c.id === activeCollection.id
          ? { ...c, ...updates, updatedAt: Date.now() }
          : c
      ),
    });
  };

  // Folder management handlers
  const handleCreateFolder = (name: string, parentId: string | null) => {
    if (!activeCollection) return;
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      parentId,
      isExpanded: true,
      createdAt: Date.now(),
    };
    updateActiveCollection({
      folders: [...activeCollection.folders, newFolder],
    });
  };

  const handleRenameFolder = (folderId: string, name: string) => {
    if (!activeCollection) return;
    updateActiveCollection({
      folders: activeCollection.folders.map(f =>
        f.id === folderId ? { ...f, name } : f
      ),
    });
  };

  const handleDeleteFolder = (folderId: string) => {
    if (!activeCollection) return;
    const getFolderIdsToDelete = (id: string): string[] => {
      const childFolders = activeCollection.folders.filter(f => f.parentId === id);
      return [id, ...childFolders.flatMap(f => getFolderIdsToDelete(f.id))];
    };

    const folderIdsToDelete = getFolderIdsToDelete(folderId);

    updateActiveCollection({
      folders: activeCollection.folders.filter(f => !folderIdsToDelete.includes(f.id)),
      requests: activeCollection.requests.filter(r => r.folderId === null || !folderIdsToDelete.includes(r.folderId)),
    });
  };

  const handleToggleFolder = (folderId: string) => {
    if (!activeCollection) return;
    updateActiveCollection({
      folders: activeCollection.folders.map(f =>
        f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f
      ),
    });
  };

  // Collection management handlers
  const handleSelectCollection = (id: string) => {
    updateConfig({ activeCollectionId: id });
  };

  const handleCreateCollection = (name: string) => {
    const newCollection: RequestCollection = {
      id: `collection-${Date.now()}`,
      name,
      folders: [],
      requests: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    updateConfig({
      collections: [...collections, newCollection],
      activeCollectionId: newCollection.id,
    });
  };

  const handleRenameCollection = (id: string, name: string) => {
    updateConfig({
      collections: collections.map(c =>
        c.id === id ? { ...c, name, updatedAt: Date.now() } : c
      ),
    });
  };

  const handleDeleteCollection = (id: string) => {
    if (collections.length <= 1) return; // Don't delete the last collection
    const newCollections = collections.filter(c => c.id !== id);
    const newActiveId = activeCollectionId === id ? newCollections[0].id : activeCollectionId;
    updateConfig({
      collections: newCollections,
      activeCollectionId: newActiveId,
    });
  };

  const handleDuplicateCollection = (id: string) => {
    const collectionToDuplicate = collections.find(c => c.id === id);
    if (!collectionToDuplicate) return;

    const newCollection: RequestCollection = {
      ...collectionToDuplicate,
      id: `collection-${Date.now()}`,
      name: `${collectionToDuplicate.name} (Copy)`,
      folders: collectionToDuplicate.folders.map(f => ({
        ...f,
        id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })),
      requests: collectionToDuplicate.requests.map(r => ({
        ...r,
        id: `request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Update folder references in requests
    const folderIdMap = new Map<string, string>();
    collectionToDuplicate.folders.forEach((oldFolder, index) => {
      folderIdMap.set(oldFolder.id, newCollection.folders[index].id);
    });
    newCollection.requests = newCollection.requests.map(r => ({
      ...r,
      folderId: r.folderId ? folderIdMap.get(r.folderId) || null : null,
    }));
    // Update parent folder references
    newCollection.folders = newCollection.folders.map(f => ({
      ...f,
      parentId: f.parentId ? folderIdMap.get(f.parentId) || null : null,
    }));

    updateConfig({
      collections: [...collections, newCollection],
      activeCollectionId: newCollection.id,
    });
  };

  // Request management handlers
  const handleSaveRequest = (name: string, folderId: string | null) => {
    if (!activeTab || !activeCollection) return;

    const savedRequest: SavedRequest = {
      id: `request-${Date.now()}`,
      name,
      request: { ...activeTab.request },
      folderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    updateConfig({
      collections: collections.map(c =>
        c.id === activeCollection.id
          ? { ...c, requests: [...c.requests, savedRequest], updatedAt: Date.now() }
          : c
      ),
      openTabs: openTabs.map(t =>
        t.id === activeTab.id
          ? { ...t, savedRequestId: savedRequest.id, title: name, isDirty: false }
          : t
      ),
    });
  };

  const handleUpdateRequest = (requestId: string, name: string) => {
    if (!activeCollection) return;
    updateConfig({
      collections: collections.map(c =>
        c.id === activeCollection.id
          ? {
              ...c,
              requests: c.requests.map(r =>
                r.id === requestId ? { ...r, name, updatedAt: Date.now() } : r
              ),
              updatedAt: Date.now(),
            }
          : c
      ),
      openTabs: openTabs.map(t =>
        t.savedRequestId === requestId ? { ...t, title: name } : t
      ),
    });
  };

  const handleSaveCurrentRequest = () => {
    if (!activeTab || !activeTab.savedRequestId || !activeCollection) return;

    updateConfig({
      collections: collections.map(c =>
        c.id === activeCollection.id
          ? {
              ...c,
              requests: c.requests.map(r =>
                r.id === activeTab.savedRequestId
                  ? { ...r, request: { ...activeTab.request }, updatedAt: Date.now() }
                  : r
              ),
              updatedAt: Date.now(),
            }
          : c
      ),
      openTabs: openTabs.map(t =>
        t.id === activeTab.id ? { ...t, isDirty: false } : t
      ),
    });
  };

  const handleDeleteRequest = (requestId: string) => {
    if (!activeCollection) return;
    updateConfig({
      collections: collections.map(c =>
        c.id === activeCollection.id
          ? {
              ...c,
              requests: c.requests.filter(r => r.id !== requestId),
              updatedAt: Date.now(),
            }
          : c
      ),
      openTabs: openTabs.map(t =>
        t.savedRequestId === requestId ? { ...t, savedRequestId: null, isDirty: true } : t
      ),
    });
  };

  const handleSelectRequest = (apiRequest: ApiRequest, requestId: string) => {
    if (!activeCollection) return;
    const existingTab = openTabs.find(t => t.savedRequestId === requestId);
    if (existingTab) {
      updateConfig({ activeTabId: existingTab.id });
      return;
    }

    const savedRequest = activeCollection.requests.find(r => r.id === requestId);
    const title = savedRequest?.name || 'Request';

    const newTab: OpenTab = {
      id: `tab-${Date.now()}`,
      title,
      request: apiRequest,
      savedRequestId: requestId,
      isDirty: false,
      comparison: {
        env1: null,
        env2: null,
        loading: false,
        loading1: false,
        loading2: false,
      },
    };

    updateConfig({
      openTabs: [...openTabs, newTab],
      activeTabId: newTab.id,
    });
  };

  const sendRequestViaFetch = async (request: ApiRequest, env: Environment | null): Promise<ApiResponse> => {
    const startTime = Date.now();
    const substituted = getSubstitutedRequest(request, env);
    let url = substituted.endpoint;

    if (corsSettings.enabled && corsSettings.proxyUrl) {
      url = `${corsSettings.proxyUrl}${url}`;
    }

    try {
      const headers = {
        ...substituted.headers,
      };

      if (substituted.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      }

      const response = await fetch(url, {
        method: request.method,
        headers,
        body: substituted.body && ['POST', 'PUT', 'PATCH'].includes(request.method)
          ? substituted.body
          : undefined,
      });

      const duration = Date.now() - startTime;
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        data,
        headers: responseHeaders,
        timestamp: Date.now(),
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        status: 0,
        statusText: 'Error',
        data: null,
        headers: {},
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now(),
        duration,
      };
    }
  };

  const sendRequestViaCurl = async (request: ApiRequest, env: Environment | null): Promise<ApiResponse> => {
    const startTime = Date.now();
    const substituted = getSubstitutedRequest(request, env);
    const url = substituted.endpoint;

    const headers: Record<string, string> = {
      ...substituted.headers,
    };

    if (substituted.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (window.electronAPI?.isElectron) {
      try {
        const result = await window.electronAPI.executeCurl({
          method: request.method,
          url,
          headers,
          body: substituted.body,
        });

        if (result.error) {
          return {
            status: 0,
            statusText: 'Error',
            data: null,
            headers: {},
            error: result.error,
            timestamp: Date.now(),
            duration: result.duration || (Date.now() - startTime),
          };
        }

        return {
          status: result.status || 0,
          statusText: result.statusText || 'OK',
          data: result.data,
          headers: result.headers || {},
          timestamp: Date.now(),
          duration: result.duration,
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        return {
          status: 0,
          statusText: 'Error',
          data: null,
          headers: {},
          error: error instanceof Error ? error.message : 'Electron cURL failed',
          timestamp: Date.now(),
          duration,
        };
      }
    }

    try {
      const response = await fetch(`${requestSettings.curlServerUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: request.method,
          url,
          headers,
          body: substituted.body,
        }),
      });

      const result = await response.json();

      if (result.error) {
        return {
          status: 0,
          statusText: 'Error',
          data: null,
          headers: {},
          error: result.error,
          timestamp: Date.now(),
          duration: result.duration || (Date.now() - startTime),
        };
      }

      return {
        status: result.status,
        statusText: result.statusText,
        data: result.data,
        headers: result.headers || {},
        timestamp: Date.now(),
        duration: result.duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        status: 0,
        statusText: 'Error',
        data: null,
        headers: {},
        error: error instanceof Error ? error.message : 'cURL server not available. Run: node curl-server.cjs',
        timestamp: Date.now(),
        duration,
      };
    }
  };

  const sendRequest = async (request: ApiRequest, env: Environment | null): Promise<ApiResponse> => {
    if (requestSettings.mode === 'curl') {
      return sendRequestViaCurl(request, env);
    }
    return sendRequestViaFetch(request, env);
  };

  const handleSendRequests = async () => {
    if (!activeTab) return;

    // Single environment mode - only send one request
    if (isSingleMode && singleEnv) {
      const isEnv1 = singleEnvIndex === 1;

      updateActiveTabComparison({
        env1: null,
        env2: null,
        loading: true,
        loading1: isEnv1,
        loading2: !isEnv1,
      });

      try {
        const response = await sendRequest(activeTab.request, singleEnv);
        updateActiveTabComparison({
          env1: isEnv1 ? response : null,
          env2: isEnv1 ? null : response,
          loading: false,
          loading1: false,
          loading2: false,
        });
      } catch (error) {
        console.error('Error sending request:', error);
        updateActiveTabComparison({
          ...activeTab.comparison,
          loading: false,
          loading1: false,
          loading2: false,
        });
      }
      return;
    }

    // Dual environment mode - send both requests
    updateActiveTabComparison({
      env1: null,
      env2: null,
      loading: true,
      loading1: true,
      loading2: true,
    });

    try {
      const [response1, response2] = await Promise.all([
        sendRequest(activeTab.request, selectedEnv1),
        sendRequest(activeTab.request, selectedEnv2),
      ]);

      updateActiveTabComparison({
        env1: response1,
        env2: response2,
        loading: false,
        loading1: false,
        loading2: false,
      });
    } catch (error) {
      console.error('Error sending requests:', error);
      updateActiveTabComparison({
        ...activeTab.comparison,
        loading: false,
        loading1: false,
        loading2: false,
      });
    }
  };

  const handleRerunRequest = async (envIndex: 1 | 2) => {
    if (!activeTab) return;

    const env = envIndex === 1 ? selectedEnv1 : selectedEnv2;
    const loadingKey = envIndex === 1 ? 'loading1' : 'loading2';
    const resultKey = envIndex === 1 ? 'env1' : 'env2';

    updateActiveTabComparison({
      ...activeTab.comparison,
      [loadingKey]: true,
    });

    try {
      const response = await sendRequest(activeTab.request, env);
      updateActiveTabComparison({
        ...activeTab.comparison,
        [resultKey]: response,
        [loadingKey]: false,
      });
    } catch (error) {
      console.error('Error sending request:', error);
      updateActiveTabComparison({
        ...activeTab.comparison,
        [loadingKey]: false,
      });
    }
  };

  // Show nothing until config is loaded
  if (!configLoaded || !config) {
    return null;
  }

  const currentComparison = activeTab?.comparison || {
    env1: null,
    env2: null,
    loading: false,
    loading1: false,
    loading2: false,
  };

  // Only show diff panel in dual mode when both responses are available without errors
  const showDiffPanel = isDualMode && currentComparison.env1 && currentComparison.env2 && !currentComparison.env1.error && !currentComparison.env2.error;

  // Handler to open cURL modal
  const handleShowCurl = (envIndex: 1 | 2) => {
    if (!activeTab) return;
    const env = envIndex === 1 ? selectedEnv1 : selectedEnv2;
    const envName = envIndex === 1 ? env1Name : env2Name;
    const curl = generateCurl(activeTab.request, env);
    setCurlModal({ isOpen: true, curlCommand: curl, envName });
  };

  const handleCloseCurlModal = () => {
    setCurlModal({ isOpen: false, curlCommand: '', envName: '' });
  };

  return (
    <div className="flex h-screen bg-dark-bg overflow-hidden">
      {/* Sidebar */}
      <div style={{ width: panelSizes.sidebarWidth }} className="flex-shrink-0">
        <Sidebar
          folders={activeCollection?.folders || []}
          requests={activeCollection?.requests || []}
          currentRequestId={activeTab?.savedRequestId || null}
          onSelectRequest={handleSelectRequest}
          onSaveRequest={handleSaveRequest}
          onUpdateRequest={handleUpdateRequest}
          onDeleteRequest={handleDeleteRequest}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onToggleFolder={handleToggleFolder}
          onSaveCurrentRequest={handleSaveCurrentRequest}
          collections={collections}
          activeCollectionId={activeCollectionId}
          onSelectCollection={handleSelectCollection}
          onCreateCollection={handleCreateCollection}
          onRenameCollection={handleRenameCollection}
          onDeleteCollection={handleDeleteCollection}
          onDuplicateCollection={handleDuplicateCollection}
        />
      </div>

      {/* Sidebar resize handle */}
      <ResizeHandle
        direction="horizontal"
        onResize={handleSidebarResize}
        onResizeEnd={handleResizeEnd}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Tab Bar */}
        <TabBar
          tabs={openTabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onNewTab={handleNewTab}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="py-3 px-4">
            {/* Header */}
            <header className="mb-3 flex items-center justify-between">
              <h1 className="text-lg font-semibold text-text-primary tracking-tight">
                API Tester
              </h1>
              <div className="flex gap-2">
                {window.electronAPI?.isElectron && (
                  <button
                    onClick={() => window.electronAPI?.toggleDevTools()}
                    className="btn text-xs"
                    title="Toggle Developer Tools"
                  >
                    DevTools
                  </button>
                )}
                <button
                  onClick={handleExportConfig}
                  className="btn text-xs"
                >
                  Export
                </button>
                {window.electronAPI?.isElectron ? (
                  <button
                    onClick={() => handleImportConfig()}
                    className="btn text-xs"
                  >
                    Import
                  </button>
                ) : (
                  <label className="btn text-xs cursor-pointer">
                    Import
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportConfig}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </header>

            <div className="space-y-2">
              {/* Request Mode Card */}
              <div className="card p-2">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-medium text-text-secondary">Mode:</span>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="requestMode"
                      checked={requestSettings.mode === 'fetch'}
                      onChange={() => updateConfig({ requestSettings: { ...requestSettings, mode: 'fetch' } })}
                      className="w-3 h-3 accent-accent-primary"
                    />
                    <span className="text-text-primary group-hover:text-accent-primary transition-colors">Fetch</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="requestMode"
                      checked={requestSettings.mode === 'curl'}
                      onChange={() => updateConfig({ requestSettings: { ...requestSettings, mode: 'curl' } })}
                      className="w-3 h-3 accent-accent-primary"
                    />
                    <span className="text-text-primary group-hover:text-accent-primary transition-colors">cURL</span>
                  </label>
                  {requestSettings.mode === 'curl' && !window.electronAPI?.isElectron && (
                    <input
                      type="text"
                      value={requestSettings.curlServerUrl}
                      onChange={(e) => updateConfig({ requestSettings: { ...requestSettings, curlServerUrl: e.target.value } })}
                      className="input w-48 py-1 text-xs"
                      placeholder="http://localhost:3001"
                    />
                  )}
                  {window.electronAPI?.isElectron && (
                    <span className="badge bg-accent-success/15 text-accent-success">Desktop App</span>
                  )}
                </div>
              </div>

              {/* CORS Configuration Disclosure */}
              {requestSettings.mode === 'fetch' && (
                <div>
                  <button
                    onClick={() => setShowCorsConfig(!showCorsConfig)}
                    className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent-primary mb-1.5 transition-colors"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform duration-200 ${showCorsConfig ? 'rotate-90' : ''}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">CORS Configuration</span>
                  </button>
                  {showCorsConfig && (
                    <CorsSettingsComponent settings={corsSettings} onChange={(settings) => updateConfig({ corsSettings: settings })} />
                  )}
                </div>
              )}

              {/* Environment Configuration Disclosure */}
              <div>
                <button
                  onClick={() => setShowEnvConfig(!showEnvConfig)}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent-primary mb-1.5 transition-colors"
                >
                  <svg
                    className={`w-3 h-3 transition-transform duration-200 ${showEnvConfig ? 'rotate-90' : ''}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Environments</span>
                </button>
                {showEnvConfig && (
                  <div className="card p-3">
                    <EnvironmentManager
                      environments={environments}
                      selectedEnv1Id={config.selectedEnv1Id}
                      selectedEnv2Id={config.selectedEnv2Id}
                      onEnvironmentsChange={(envs) => updateConfig({ environments: envs })}
                      onSelectEnv1={(id) => updateConfig({ selectedEnv1Id: id })}
                      onSelectEnv2={(id) => updateConfig({ selectedEnv2Id: id })}
                    />
                  </div>
                )}
              </div>

              {activeTab && (
                <>
                  {/* Large screen layout with resizable panels */}
                  <div ref={mainContentRef} className="hidden xl:flex xl:flex-col">
                    <div className="flex" style={{ height: showDiffPanel ? `${100 - panelSizes.diffPanelHeight}%` : 'auto', minHeight: '300px' }}>
                      {/* Left column: Request Builder */}
                      <div style={{ width: `${panelSizes.requestPanelWidth}%` }} className="flex-shrink-0 overflow-auto">
                        <RequestBuilder
                          request={activeTab.request}
                          onChange={updateActiveTabRequest}
                          onSend={handleSendRequests}
                          loading={currentComparison.loading}
                          onShowCurl={handleShowCurl}
                          isSingleMode={isSingleMode}
                          singleEnvIndex={singleEnvIndex}
                        />
                      </div>

                      {/* Request/Response resize handle */}
                      <ResizeHandle
                        direction="horizontal"
                        onResize={handleRequestPanelResize}
                        onResizeEnd={handleResizeEnd}
                      />

                      {/* Right column: Responses */}
                      <div className="flex-1 overflow-auto min-w-0">
                        <ResponseComparison
                          env1Name={env1Name}
                          env2Name={env2Name}
                          response1={currentComparison.env1}
                          response2={currentComparison.env2}
                          onRerun={handleRerunRequest}
                          loading1={currentComparison.loading1}
                          loading2={currentComparison.loading2}
                          ignoredPaths={diffSettings.ignoredPaths}
                          onIgnoredPathsChange={(paths) => updateConfig({ diffSettings: { ...diffSettings, ignoredPaths: paths } })}
                          showDiff={false}
                          singleMode={isSingleMode}
                          singleEnvIndex={singleEnvIndex}
                        />
                      </div>
                    </div>

                    {/* Diff panel with resize handle */}
                    {showDiffPanel && (
                      <>
                        <ResizeHandle
                          direction="vertical"
                          onResize={handleDiffPanelResize}
                          onResizeEnd={handleResizeEnd}
                        />
                        <div style={{ height: `${panelSizes.diffPanelHeight}%` }} className="overflow-auto min-h-[100px]">
                          <ResponseComparison
                            env1Name={env1Name}
                            env2Name={env2Name}
                            response1={currentComparison.env1}
                            response2={currentComparison.env2}
                            onRerun={handleRerunRequest}
                            loading1={currentComparison.loading1}
                            loading2={currentComparison.loading2}
                            ignoredPaths={diffSettings.ignoredPaths}
                            onIgnoredPathsChange={(paths) => updateConfig({ diffSettings: { ...diffSettings, ignoredPaths: paths } })}
                            showResponses={false}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Small/medium screen layout: stacked (no resize) */}
                  <div className="xl:hidden">
                    <RequestBuilder
                      request={activeTab.request}
                      onChange={updateActiveTabRequest}
                      onSend={handleSendRequests}
                      loading={currentComparison.loading}
                      onShowCurl={handleShowCurl}
                      isSingleMode={isSingleMode}
                      singleEnvIndex={singleEnvIndex}
                    />

                    <div className="mt-2">
                      <ResponseComparison
                        env1Name={env1Name}
                        env2Name={env2Name}
                        response1={currentComparison.env1}
                        response2={currentComparison.env2}
                        onRerun={handleRerunRequest}
                        loading1={currentComparison.loading1}
                        loading2={currentComparison.loading2}
                        ignoredPaths={diffSettings.ignoredPaths}
                        onIgnoredPathsChange={(paths) => updateConfig({ diffSettings: { ...diffSettings, ignoredPaths: paths } })}
                        singleMode={isSingleMode}
                        singleEnvIndex={singleEnvIndex}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* cURL Modal */}
      <CurlModal
        isOpen={curlModal.isOpen}
        onClose={handleCloseCurlModal}
        curlCommand={curlModal.curlCommand}
        envName={curlModal.envName}
      />
    </div>
  );
}

export default App;
