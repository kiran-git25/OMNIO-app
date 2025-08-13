import { E2EEEncryption, SecureStorage } from "../utils/e2ee";
import { LocalStorageDB } from "./localStorage";

// Try to import SignalDB, fallback to localStorage
let SignalDB;
try {
  const signalModule = await import("signaldb");
  SignalDB = signalModule.SignalDB;
} catch (e) {
  console.log("SignalDB not available, using localStorage fallback");
  SignalDB = LocalStorageDB;
}

// Check if running in Electron environment
export const isElectronEnvironment = () => {
  return Boolean(window.electronAPI && window.electronAPI.isElectron);
};

// Export isElectronApp for legacy compatibility
export const isElectronApp = isElectronEnvironment();

// Initialize database with proper configuration
let db;
let initialized = false;

/**
 * Initialize the database with appropriate settings
 * @returns {Promise} Promise that resolves when database is ready
 */
export const initializeDatabase = async () => {
  if (initialized) return Promise.resolve(db);
  
  try {
    // Get encryption key from secure storage
    const secureStore = new SecureStorage('omnio-db');
    let encryptionKey = secureStore.get('db-encryption-key');
    
    if (!encryptionKey) {
      // Generate a new encryption key if none exists
      encryptionKey = await E2EEEncryption.generateRoomKey();
      secureStore.set('db-encryption-key', encryptionKey);
    }
    
    // Set up appropriate adapters based on environment
    const adapters = ["local"];
    
    // Only add WebSocket adapter if we have connectivity
    if (navigator.onLine) {
      adapters.push("websocket");
    }
    
    // Create database instance
    db = new SignalDB({
      name: "omnio-db",
      adapters,
      local: {
        encrypt: false, // Disable built-in encryption to avoid conflicts
      },
      websocket: {
        // Use appropriate WebSocket URL based on environment
        url: isElectronApp ? 
          "ws://localhost:3001" : // Local WebSocket server in Electron
          "wss://openrelay.metered.ca:443", // Public relay for web version
        encryptMessages: true,
        encryptionKey,
        // Add retry logic for better resilience
        reconnectDelay: 1500,
        maxReconnectAttempts: 10
      }
    });
    
    // Add event listeners for connection status
    db.on('connect', () => {
      console.log('SignalDB connected to sync server');
    });
    
    db.on('disconnect', () => {
      console.log('SignalDB disconnected from sync server, data will sync when reconnected');
    });
    
    // Handle initialization errors
    db.on('error', (error) => {
      console.error('SignalDB error:', error);
    });
    
    // Wait for database to be ready
    await db.ready();
    
    initialized = true;
    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    // Create a fallback in-memory database
    db = new SignalDB({
      name: "omnio-fallback",
      adapters: ["local"]
    });
    await db.ready();
    initialized = true;
    return db;
  }
};

// Define collections
let _chatCollection, _callCollection, _filesCollection;

// Export collections with lazy initialization
export const getChatCollection = () => {
  if (!initialized) {
    console.warn("Database accessed before initialization");
    initializeDatabase(); // Start initialization asynchronously
  }
  if (!_chatCollection && db) {
    _chatCollection = db.collection("chat", {
      // Include schema for better data validation
      schema: {
        id: { type: 'string', required: true },
        roomId: { type: 'string', required: true },
        roomName: { type: 'string' },
        from: { type: 'string' },
        type: { type: 'string', required: true },
        text: { type: 'string' },
        encryptedText: { type: 'string' },
        isEncrypted: { type: 'boolean' },
        isSecure: { type: 'boolean' },
        ts: { type: 'number' }
      }
    });
  }
  return _chatCollection;
};

export const getCallCollection = () => {
  if (!initialized) {
    console.warn("Database accessed before initialization");
    initializeDatabase();
  }
  if (!_callCollection && db) {
    _callCollection = db.collection("calls");
  }
  return _callCollection;
};

export const getFilesCollection = () => {
  if (!initialized) {
    console.warn("Database accessed before initialization");
    initializeDatabase();
  }
  if (!_filesCollection && db) {
    _filesCollection = db.collection("files");
  }
  return _filesCollection;
};

// Legacy exports for compatibility
export const chatCollection = {
  find: (...args) => getChatCollection().find(...args),
  insert: (...args) => getChatCollection().insert(...args),
  update: (...args) => getChatCollection().update(...args),
  remove: (...args) => getChatCollection().remove(...args)
};

export default db;