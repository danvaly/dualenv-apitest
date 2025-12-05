const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { autoUpdater } = require('electron-updater');

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

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
    proxySettings: {
      enabled: false,
      host: '',
      port: '',
      username: '',
      password: '',
      protocol: 'http',
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
    history: [],
    historySettings: {
      maxEntries: 100,
      enabled: true,
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

// IPC handler for executing cURL requests with verbose output
ipcMain.handle('execute-curl', async (event, { method, url, headers, body, proxySettings }) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const verboseLogs = [];

    // Build cURL command with verbose flag
    // Use -v for verbose output, -s for silent (no progress), and custom format for status code
    const curlParts = ['curl', '-v', '-s', '-w', '"\\n__HTTP_CODE__%{http_code}__END_CODE__"', '-X', method];

    // Add proxy if enabled
    if (proxySettings && proxySettings.enabled && proxySettings.host && proxySettings.port) {
      let proxyUrl = `${proxySettings.protocol}://`;
      if (proxySettings.username && proxySettings.password) {
        proxyUrl += `${proxySettings.username}:${proxySettings.password}@`;
      }
      proxyUrl += `${proxySettings.host}:${proxySettings.port}`;

      if (proxySettings.protocol === 'socks4' || proxySettings.protocol === 'socks5') {
        curlParts.push('--proxy', `'${proxyUrl}'`);
      } else {
        curlParts.push('-x', `'${proxyUrl}'`);
      }
    }

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

    // Log the command being executed
    verboseLogs.push({ type: 'request', message: `Executing: ${method} ${url}` });
    verboseLogs.push({ type: 'verbose', message: `cURL command: ${curlCommand}` });

    exec(curlCommand, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const duration = Date.now() - startTime;

      // Parse verbose output from stderr (cURL writes verbose to stderr)
      if (stderr) {
        const stderrLines = stderr.split('\n');
        stderrLines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('*')) {
            // Connection info
            verboseLogs.push({ type: 'verbose', message: trimmedLine });
          } else if (trimmedLine.startsWith('>')) {
            // Request headers
            verboseLogs.push({ type: 'request', message: trimmedLine.substring(2) });
          } else if (trimmedLine.startsWith('<')) {
            // Response headers
            verboseLogs.push({ type: 'response', message: trimmedLine.substring(2) });
          } else if (trimmedLine.startsWith('{') || trimmedLine.startsWith('}')) {
            // SSL/TLS info
            verboseLogs.push({ type: 'verbose', message: trimmedLine });
          }
        });
      }

      if (error && !stdout) {
        verboseLogs.push({ type: 'error', message: error.message });
        resolve({
          error: error.message,
          stderr,
          duration,
          verboseLogs
        });
        return;
      }

      // Parse response - extract HTTP code using our marker
      const httpCodeMatch = stdout.match(/__HTTP_CODE__(\d+)__END_CODE__/);
      const statusCode = httpCodeMatch ? parseInt(httpCodeMatch[1], 10) : 0;

      // Remove the HTTP code marker from the response body
      const responseBody = stdout.replace(/__HTTP_CODE__\d+__END_CODE__/, '').trim();

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseBody);
      } catch {
        data = responseBody;
      }

      // Parse response headers from verbose output
      const responseHeaders = {};
      if (stderr) {
        const headerLines = stderr.split('\n').filter(line => line.trim().startsWith('<'));
        headerLines.forEach(line => {
          const headerLine = line.substring(2).trim();
          const colonIndex = headerLine.indexOf(':');
          if (colonIndex > 0) {
            const key = headerLine.substring(0, colonIndex).trim().toLowerCase();
            const value = headerLine.substring(colonIndex + 1).trim();
            if (key && value && !key.startsWith('http/')) {
              responseHeaders[key] = value;
            }
          }
        });
      }

      verboseLogs.push({
        type: 'info',
        message: `Response received: ${statusCode} (${duration}ms)`
      });

      resolve({
        status: statusCode,
        statusText: statusCode >= 200 && statusCode < 300 ? 'OK' : 'Error',
        data,
        duration,
        headers: responseHeaders,
        verboseLogs
      });
    });
  });
});

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  sendUpdateStatus('checking');
});

autoUpdater.on('update-available', (info) => {
  sendUpdateStatus('available', info);
});

autoUpdater.on('update-not-available', (info) => {
  sendUpdateStatus('not-available', info);
});

autoUpdater.on('error', (err) => {
  sendUpdateStatus('error', { message: err.message });
});

autoUpdater.on('download-progress', (progressObj) => {
  sendUpdateStatus('downloading', {
    percent: progressObj.percent,
    bytesPerSecond: progressObj.bytesPerSecond,
    transferred: progressObj.transferred,
    total: progressObj.total,
  });
});

autoUpdater.on('update-downloaded', (info) => {
  sendUpdateStatus('downloaded', info);
});

// Helper to send update status to renderer
function sendUpdateStatus(status, data = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, ...data });
  }
}

// IPC handler for checking updates
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for downloading update
ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for installing update
ipcMain.handle('install-update', async () => {
  autoUpdater.quitAndInstall(false, true);
  return { success: true };
});

// IPC handler for getting current app version
ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

app.whenReady().then(() => {
  createWindow();

  // Check for updates after window is ready (only in production)
  if (!process.env.VITE_DEV_SERVER_URL) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.log('Auto-update check failed:', err.message);
      });
    }, 3000); // Wait 3 seconds before checking
  }

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
