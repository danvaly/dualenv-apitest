const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  executeCurl: (params) => ipcRenderer.invoke('execute-curl', params),
  toggleDevTools: () => ipcRenderer.invoke('toggle-devtools'),
  readConfig: () => ipcRenderer.invoke('read-config'),
  writeConfig: (config) => ipcRenderer.invoke('write-config', config),
  getConfigPath: () => ipcRenderer.invoke('get-config-path'),
  exportConfig: (config) => ipcRenderer.invoke('export-config', config),
  importConfig: () => ipcRenderer.invoke('import-config'),
  isElectron: true,
  // Auto-update APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateStatus: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
});
