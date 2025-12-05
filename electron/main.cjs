const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Default config file path in user data directory
const getConfigPath = () => {
  return path.join(app.getPath('userData'), 'config.json');
};

// Default configuration
const getDefaultConfig = () => {
  const defaultCollectionId = `collection-${Date.now()}`;
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
    collections: [{
      id: defaultCollectionId,
      name: 'Default Collection',
      folders: [],
      requests: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }],
    activeCollectionId: defaultCollectionId,
    openTabs: [],
    activeTabId: null,
    panelSizes: {
      sidebarWidth: 240,
      requestPanelWidth: 50,
      diffPanelHeight: 40,
    },
  };
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  if (require.resolve('electron-squirrel-startup') && require('electron-squirrel-startup')) {
    app.quit();
  }
} catch (e) {
  // electron-squirrel-startup not installed, skip
}

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In development, load from Vite dev server
  // In production, load from built files
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// IPC handler for toggling DevTools
ipcMain.handle('toggle-devtools', async () => {
  if (mainWindow) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
      return false;
    } else {
      mainWindow.webContents.openDevTools();
      return true;
    }
  }
  return false;
});

// IPC handler for reading config
ipcMain.handle('read-config', async () => {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return { success: true, data: JSON.parse(data) };
    }
    return { success: true, data: getDefaultConfig() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for writing config
ipcMain.handle('write-config', async (event, config) => {
  try {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for getting config path
ipcMain.handle('get-config-path', async () => {
  return getConfigPath();
});

// IPC handler for exporting config to a custom location
ipcMain.handle('export-config', async (event, config) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Configuration',
      defaultPath: `api-tester-config-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, JSON.stringify(config, null, 2), 'utf-8');
      return { success: true, filePath: result.filePath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for importing config from a file
ipcMain.handle('import-config', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Configuration',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const data = fs.readFileSync(result.filePaths[0], 'utf-8');
      return { success: true, data: JSON.parse(data) };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for executing cURL requests
ipcMain.handle('execute-curl', async (event, { method, url, headers, body }) => {
  return new Promise((resolve) => {
    const startTime = Date.now();

    // Build cURL command
    const curlParts = ['curl', '-s', '-w', '"\\n%{http_code}"', '-X', method];

    // Add headers
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        curlParts.push('-H', `'${key}: ${value}'`);
      });
    }

    // Add body for POST/PUT/PATCH
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      curlParts.push('-d', `'${body.replace(/'/g, "'\\''")}'`);
    }

    // Add URL
    curlParts.push(`'${url}'`);

    const curlCommand = curlParts.join(' ');

    exec(curlCommand, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const duration = Date.now() - startTime;

      if (error && !stdout) {
        resolve({
          error: error.message,
          stderr,
          duration
        });
        return;
      }

      // Parse response - last line is status code
      const lines = stdout.trim().split('\n');
      const statusCode = parseInt(lines.pop(), 10) || 0;
      const responseBody = lines.join('\n');

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseBody);
      } catch {
        data = responseBody;
      }

      resolve({
        status: statusCode,
        statusText: statusCode >= 200 && statusCode < 300 ? 'OK' : 'Error',
        data,
        duration,
        headers: {}
      });
    });
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
