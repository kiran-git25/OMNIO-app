/**
 * Electron File Service
 * 
 * This module provides file system operations for the Electron version of OmniO.
 * It handles native file dialog operations and utility functions.
 */

/**
 * Check if we're running in an Electron environment
 * @returns {boolean} True if running in Electron
 */
export function isElectronEnvironment() {
  return window?.electronAPI?.isElectron === true;
}

/**
 * Check if we're running in an Electron app (cached result)
 */
export const isElectronApp = isElectronEnvironment();

/**
 * Open a native file dialog to select files
 * @returns {Promise<Array>} Array of file objects
 */
export async function openFileDialog() {
  if (!isElectronApp || !window.electronAPI?.openFileDialog) {
    console.error('Native file dialog not available');
    return [];
  }

  try {
    // Call the exposed method from the main process
    const files = await window.electronAPI.openFileDialog();
    return files;
  } catch (error) {
    console.error('Error opening file dialog:', error);
    return [];
  }
}

/**
 * Save content to a file using native save dialog
 * @param {string} content - Content to save
 * @param {string} defaultFileName - Default file name
 * @returns {Promise<string|null>} Path to saved file or null
 */
export async function saveFileDialog(content, defaultFileName) {
  if (!isElectronApp || !window.electronAPI?.saveFileDialog) {
    console.error('Native save dialog not available');
    return null;
  }

  try {
    // Call the exposed method from the main process
    return await window.electronAPI.saveFileDialog(content, defaultFileName);
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
}

/**
 * Show a file in the system file explorer/finder
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} True if successful
 */
export async function showItemInFolder(filePath) {
  if (!isElectronApp || !window.electronAPI?.showItemInFolder) {
    console.error('Show item in folder not available');
    return false;
  }

  try {
    return await window.electronAPI.showItemInFolder(filePath);
  } catch (error) {
    console.error('Error showing item in folder:', error);
    return false;
  }
}

/**
 * Open a file with the default system application
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} True if successful
 */
export async function openFileExternal(filePath) {
  if (!isElectronApp || !window.electronAPI?.openFileExternal) {
    console.error('Open file external not available');
    return false;
  }

  try {
    return await window.electronAPI.openFileExternal(filePath);
  } catch (error) {
    console.error('Error opening file externally:', error);
    return false;
  }
}

/**
 * Get application information
 * @returns {Promise<Object>} Application info
 */
export async function getAppInfo() {
  if (!isElectronApp || !window.electronAPI?.getAppInfo) {
    return { isElectron: false, version: '1.0.0' };
  }

  try {
    const info = await window.electronAPI.getAppInfo();
    return { ...info, isElectron: true };
  } catch (error) {
    console.error('Error getting app info:', error);
    return { isElectron: true, version: '1.0.0' };
  }
}

/**
 * Write text to the system clipboard
 * @param {string} text - Text to write
 */
export async function writeToClipboard(text) {
  if (isElectronApp && window.electronAPI?.writeToClipboard) {
    await window.electronAPI.writeToClipboard(text);
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    console.error('Clipboard functionality not available');
  }
}