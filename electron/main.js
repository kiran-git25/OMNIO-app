/**
 * Electron Main Process
 * Handles window creation, IPC events, and native file operations
 */
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;

/**
 * Create the main application window
 */
function createWindow() {
  // Create the browser window with appropriate settings for a modern app
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#282c34', // Matches dark theme background
    show: false, // Don't show until ready-to-show
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Security: Enable context isolation
      nodeIntegration: false, // Security: Disable direct Node integration
      webSecurity: true, // Security: Enable web security
      sandbox: true, // Security: Enable sandbox
    },
    // Modern window appearance
    titleBarStyle: 'hiddenInset', // Use a cleaner title bar on macOS
    autoHideMenuBar: false, // Show menu bar for standard operations
  });

  // Load the app - in development use the Vite dev server, in production use the built files
  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '../dist/index.html'),
    protocol: 'file:',
    slashes: true
  });

  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize app when Electron is ready
app.whenReady().then(() => {
  createWindow();

  // Handle macOS app activation
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle file opening requests
ipcMain.handle('open-file-dialog', async () => {
  if (!mainWindow) return [];

  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (canceled || filePaths.length === 0) {
      return [];
    }

    return Promise.all(filePaths.map(async (filePath) => {
      const stats = fs.statSync(filePath);
      const name = path.basename(filePath);
      const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2,6);
      const ext = path.extname(filePath).toLowerCase();
      
      // Determine file type
      let type = '';
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
        type = 'image/' + ext.substring(1);
      } else if (['.mp4', '.webm', '.ogg'].includes(ext)) {
        type = 'video/' + ext.substring(1);
      } else if (['.mp3', '.wav'].includes(ext)) {
        type = 'audio/' + ext.substring(1);
      } else if (ext === '.pdf') {
        type = 'application/pdf';
      } else if (['.txt', '.md', '.js', '.jsx', '.ts', '.tsx', '.css', '.html'].includes(ext)) {
        type = 'text/plain';
        // Read text content for text files
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          return { 
            id, 
            name, 
            path: filePath, 
            isNative: true, 
            url: `file://${filePath}`, 
            content, 
            type,
            size: stats.size 
          };
        } catch (error) {
          console.error('Error reading text file:', error);
        }
      }
      
      // Return file object
      return { 
        id, 
        name, 
        path: filePath, 
        isNative: true, 
        url: `file://${filePath}`, 
        type,
        size: stats.size 
      };
    }));
  } catch (error) {
    console.error('Error opening file dialog:', error);
    return [];
  }
});

// Handle file saving requests
ipcMain.handle('save-file-dialog', async (_, content, defaultFileName) => {
  if (!mainWindow) return null;

  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultFileName || 'untitled.txt',
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) {
      return null;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
});

// Handle showing a file in the file explorer/finder
ipcMain.handle('show-item-in-folder', async (_, filePath) => {
  if (!filePath) return false;
  
  try {
    shell.showItemInFolder(filePath);
    return true;
  } catch (error) {
    console.error('Error showing item in folder:', error);
    return false;
  }
});

// Handle opening a file with the default application
ipcMain.handle('open-file-external', async (_, filePath) => {
  if (!filePath) return false;
  
  try {
    shell.openPath(filePath);
    return true;
  } catch (error) {
    console.error('Error opening file externally:', error);
    return false;
  }
});

// Get application info
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    appPath: app.getAppPath(),
    locale: app.getLocale()
  };
});
