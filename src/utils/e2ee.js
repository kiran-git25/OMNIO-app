/**
 * End-to-End Encryption Utilities
 * 
 * This module provides utilities for end-to-end encryption in OmniO.
 * It uses AES encryption from the crypto-js library for secure communication.
 */
import CryptoJS from 'crypto-js';

/**
 * Class providing end-to-end encryption functionality
 */
export class E2EEEncryption {
  /**
   * Generate a secure random key for room encryption
   * @returns {string} A secure random key
   */
  static generateRoomKey() {
    // Generate a 256-bit (32 bytes) random key encoded as base64
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Encrypt a message using AES encryption
   * @param {string} message - The plaintext message to encrypt
   * @param {string} key - The encryption key
   * @returns {string} - The encrypted message
   */
  static encrypt(message, key) {
    if (!message || !key) return null;
    try {
      // Use AES encryption with the provided key
      const encrypted = CryptoJS.AES.encrypt(message, key).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }

  /**
   * Decrypt an encrypted message
   * @param {string} encryptedMessage - The encrypted message
   * @param {string} key - The decryption key
   * @returns {string|null} - The decrypted message or null if decryption fails
   */
  static decrypt(encryptedMessage, key) {
    if (!encryptedMessage || !key) return null;
    try {
      // Use AES decryption with the provided key
      const decrypted = CryptoJS.AES.decrypt(encryptedMessage, key);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  /**
   * Encrypt a file (or its metadata) using AES encryption
   * @param {Object} fileData - The file data to encrypt
   * @param {string} key - The encryption key
   * @returns {Object} - The encrypted file data
   */
  static encryptFileData(fileData, key) {
    if (!fileData || !key) return fileData;
    
    try {
      // For metadata, we encrypt certain fields
      const encryptedData = { ...fileData };
      
      // Encrypt metadata fields if present
      if (fileData.name) {
        encryptedData.encryptedName = this.encrypt(fileData.name, key);
      }
      
      if (fileData.description) {
        encryptedData.encryptedDescription = this.encrypt(fileData.description, key);
      }
      
      // Mark as encrypted
      encryptedData.isEncrypted = true;
      encryptedData.encryptionVersion = 1;
      
      return encryptedData;
    } catch (error) {
      console.error('File encryption error:', error);
      return fileData;
    }
  }
  
  /**
   * Decrypt file data
   * @param {Object} encryptedData - The encrypted file data
   * @param {string} key - The decryption key
   * @returns {Object} - The decrypted file data
   */
  static decryptFileData(encryptedData, key) {
    if (!encryptedData || !encryptedData.isEncrypted || !key) return encryptedData;
    
    try {
      const decryptedData = { ...encryptedData };
      
      // Decrypt metadata fields if present
      if (encryptedData.encryptedName) {
        decryptedData.name = this.decrypt(encryptedData.encryptedName, key);
      }
      
      if (encryptedData.encryptedDescription) {
        decryptedData.description = this.decrypt(encryptedData.encryptedDescription, key);
      }
      
      // Mark as decrypted
      decryptedData.isDecrypted = true;
      
      return decryptedData;
    } catch (error) {
      console.error('File decryption error:', error);
      return encryptedData;
    }
  }

  /**
   * Encrypt file content (small files only due to memory constraints)
   * @param {ArrayBuffer} fileContent - The file content to encrypt
   * @param {string} key - The encryption key
   * @returns {string} - The encrypted file content as a base64 string
   */
  static encryptFileContent(fileContent, key) {
    // This is limited to small files due to memory constraints
    if (!fileContent || !key) return null;
    
    try {
      // Convert ArrayBuffer to WordArray for CryptoJS
      const wordArray = CryptoJS.lib.WordArray.create(fileContent);
      // Encrypt the content
      const encrypted = CryptoJS.AES.encrypt(wordArray, key).toString();
      return encrypted;
    } catch (error) {
      console.error('File content encryption error:', error);
      return null;
    }
  }
}

/**
 * Class for secure storage of encryption keys and other sensitive data
 */
export class SecureStorage {
  /**
   * Create a new secure storage instance
   * @param {string} namespace - The namespace for this storage
   */
  constructor(namespace) {
    this.namespace = namespace;
    this.storage = window.localStorage;
    this.memoryCache = {};
  }

  /**
   * Get a value from secure storage
   * @param {string} key - The key to retrieve
   * @returns {any} - The stored value, or null if not found
   */
  get(key) {
    // Check memory cache first
    if (this.memoryCache[key] !== undefined) {
      return this.memoryCache[key];
    }
    
    // Otherwise check local storage
    const fullKey = `${this.namespace}:${key}`;
    const storedValue = this.storage.getItem(fullKey);
    
    if (!storedValue) return null;
    
    try {
      const value = JSON.parse(storedValue);
      // Store in memory cache for faster access
      this.memoryCache[key] = value;
      return value;
    } catch (error) {
      console.error(`Error retrieving ${key} from secure storage:`, error);
      return null;
    }
  }

  /**
   * Store a value in secure storage
   * @param {string} key - The key to store under
   * @param {any} value - The value to store
   */
  set(key, value) {
    // Update memory cache
    this.memoryCache[key] = value;
    
    // Store in local storage
    const fullKey = `${this.namespace}:${key}`;
    try {
      const serialized = JSON.stringify(value);
      this.storage.setItem(fullKey, serialized);
    } catch (error) {
      console.error(`Error storing ${key} in secure storage:`, error);
    }
  }

  /**
   * Remove a value from secure storage
   * @param {string} key - The key to remove
   */
  remove(key) {
    // Remove from memory cache
    delete this.memoryCache[key];
    
    // Remove from local storage
    const fullKey = `${this.namespace}:${key}`;
    this.storage.removeItem(fullKey);
  }

  /**
   * Clear all values in this namespace
   */
  clear() {
    // Clear memory cache
    this.memoryCache = {};
    
    // Clear all items with this namespace from local storage
    Object.keys(this.storage).forEach(key => {
      if (key.startsWith(`${this.namespace}:`)) {
        this.storage.removeItem(key);
      }
    });
  }
}