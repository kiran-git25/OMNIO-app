import { E2EEEncryption, SecureStorage } from "../utils/e2ee";
import { LocalStorageDB } from "./localStorage";

// Check if running in Electron environment
export const isElectronEnvironment = () => {
  return Boolean(window.electronAPI && window.electronAPI.isElectron);
};

// Export isElectronApp for legacy compatibility
export const isElectronApp = isElectronEnvironment();

// Initialize database with proper configuration
let db;
let initialized = false;
let SignalDB = LocalStorageDB; // Default to localStorage

// Dynamic import function for SignalDB
const loadSignalDB = async () => {
  try {
    // Try to load SignalDB dynamically
    const { SignalDB: ImportedSignalDB } = await import("signaldb");
    return ImportedSignalDB;
  } catch (error) {
    console.log("SignalDB not available, using localStorage fallback");
    return LocalStorageDB;
  }
};

/**
 * Initialize the database with appropriate settings
 * @returns {Promise} Promise that resolves when database is ready
 */
export const initializeDatabase = async () => {
  if (initialized && db) {
    return db;
  }

  try {
    // Load the appropriate database class
    SignalDB = await loadSignalDB();
    
    // Initialize with proper configuration
    if (SignalDB === LocalStorageDB) {
      // Use localStorage fallback
      db = new SignalDB("omnio");
      await db.ready();
    } else {
      // Use full SignalDB with adapters
      const adapters = isElectronApp ? ["local", "memory"] : ["local"];
      db = new SignalDB({
        name: "omnio",
        adapters: adapters
      });
      await db.ready();
    }
    
    initialized = true;
    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    // Create a fallback in-memory database
    db = new LocalStorageDB("omnio-fallback");
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
        message: { type: 'string' },
        sender: { type: 'string' },
        timestamp: { type: 'number' },
        encrypted: { type: 'boolean', default: false },
        attachments: { type: 'array', default: [] }
      }
    });
  }
  return _chatCollection;
};

export const getCallCollection = () => {
  if (!initialized) {
    console.warn("Database accessed before initialization");
    initializeDatabase(); // Start initialization asynchronously
  }
  if (!_callCollection && db) {
    _callCollection = db.collection("calls", {
      schema: {
        id: { type: 'string', required: true },
        roomId: { type: 'string', required: true },
        type: { type: 'string', required: true }, // 'video' or 'audio'
        participants: { type: 'array', default: [] },
        status: { type: 'string', default: 'pending' }, // 'pending', 'active', 'ended'
        timestamp: { type: 'number' }
      }
    });
  }
  return _callCollection;
};

export const getFilesCollection = () => {
  if (!initialized) {
    console.warn("Database accessed before initialization");
    initializeDatabase(); // Start initialization asynchronously
  }
  if (!_filesCollection && db) {
    _filesCollection = db.collection("files", {
      schema: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        size: { type: 'number' },
        type: { type: 'string' },
        data: { type: 'string' }, // Base64 encoded or path
        uploadDate: { type: 'number' },
        encrypted: { type: 'boolean', default: false }
      }
    });
  }
  return _filesCollection;
};

// Database utility functions
export const encryptMessage = (message, roomId) => {
  try {
    const encryption = new E2EEEncryption();
    const key = SecureStorage.getRoomKey(roomId);
    return encryption.encrypt(message, key);
  } catch (error) {
    console.error("Encryption failed:", error);
    return message; // Fallback to plain text
  }
};

export const decryptMessage = (encryptedMessage, roomId) => {
  try {
    const encryption = new E2EEEncryption();
    const key = SecureStorage.getRoomKey(roomId);
    return encryption.decrypt(encryptedMessage, key);
  } catch (error) {
    console.error("Decryption failed:", error);
    return encryptedMessage; // Return as is if decryption fails
  }
};

// Real-time subscription helpers
export const subscribeToMessages = (roomId, callback) => {
  const collection = getChatCollection();
  return collection.find({ roomId }).onSnapshot(callback);
};

export const subscribeToFiles = (callback) => {
  const collection = getFilesCollection();
  return collection.find({}).onSnapshot(callback);
};

export const subscribeToActiveCalls = (callback) => {
  const collection = getCallCollection();
  return collection.find({ status: 'active' }).onSnapshot(callback);
};

// Export database instance for direct access
export { db };
export default { 
  initializeDatabase, 
  getChatCollection, 
  getCallCollection, 
  getFilesCollection,
  encryptMessage,
  decryptMessage,
  subscribeToMessages,
  subscribeToFiles,
  subscribeToActiveCalls
};