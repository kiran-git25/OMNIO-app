/**
 * Electron Preload Script
 * Exposes APIs from the main process to the renderer process
 * Uses contextBridge for secure communications between processes
 */
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    // Indicate this is running in Electron
    isElectron: true,
    
    // File operations
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    saveFileDialog: (content, defaultFileName) => ipcRenderer.invoke('save-file-dialog', content, defaultFileName),
    showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
    openFileExternal: (filePath) => ipcRenderer.invoke('open-file-external', filePath),
    
    // App information
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    
    // OS clipboard
    writeToClipboard: (text) => navigator.clipboard.writeText(text),
    
    // App version
    appVersion: process.env.npm_package_version || '1.0.0'
  }
);

// Also expose process information in a controlled way
contextBridge.exposeInMainWorld('process', {
  platform: process.platform,
});

// Notify the main process when the page is fully loaded
window.addEventListener('DOMContentLoaded', () => {
  // Send ready signal to main process
  ipcRenderer.send('renderer-ready');
  
  // Make the OS-specific UI adjustments
  document.body.classList.add(`platform-${process.platform}`);
});