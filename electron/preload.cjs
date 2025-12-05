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
});
