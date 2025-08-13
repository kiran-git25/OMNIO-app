import { Collection } from "@signaldb/core";
import { E2EEEncryption, SecureStorage } from "../utils/e2ee";
import { LocalStorageDB } from "./localStorage";

// Detect Electron
export const isElectronEnvironment = () =>
  Boolean(window.electronAPI && window.electronAPI.isElectron);
export const isElectronApp = isElectronEnvironment();

let db = {};
let initialized = false;

export const initializeDatabase = async () => {
  if (initialized) return db;
  
  try {
    const secureStore = new SecureStorage("omnio-db");
    let encryptionKey = secureStore.get("db-encryption-key");
    
    if (!encryptionKey) {
      encryptionKey = await E2EEEncryption.generateRoomKey();
      secureStore.set("db-encryption-key", encryptionKey);
    }

    // Initialize a simple db object to hold collections
    db = {
      collection: (name, options = {}) => {
        if (!db[name]) {
          db[name] = new Collection(options);
        }
        return db[name];
      },
      ready: async () => Promise.resolve(),
      on: (event, callback) => {
        // Simple event handling - you can enhance this if needed
        console.log(`Event registered: ${event}`);
      }
    };

    console.log("SignalDB (Collection-based) initialized");
    initialized = true;
    return db;
  } catch (error) {
    console.error("Failed to initialize SignalDB, using fallback:", error);
    // Fallback to LocalStorage if SignalDB fails
    db = new LocalStorageDB({ name: "omnio-fallback" });
    await db.ready?.();
    initialized = true;
    return db;
  }
};

// Collections
let _chatCollection, _callCollection, _filesCollection;

export const getChatCollection = () => {
  if (!_chatCollection && db) {
    _chatCollection = db.collection("chat", {
      schema: {
        id: { type: "string", required: true },
        roomId: { type: "string", required: true },
        roomName: { type: "string" },
        from: { type: "string" },
        type: { type: "string", required: true },
        text: { type: "string" },
        encryptedText: { type: "string" },
        isEncrypted: { type: "boolean" },
        isSecure: { type: "boolean" },
        ts: { type: "number" }
      }
    });
  }
  return _chatCollection;
};

export const getCallCollection = () => {
  if (!_callCollection && db) {
    _callCollection = db.collection("calls");
  }
  return _callCollection;
};

export const getFilesCollection = () => {
  if (!_filesCollection && db) {
    _filesCollection = db.collection("files");
  }
  return _filesCollection;
};

// Legacy compatibility
export const chatCollection = {
  find: (...args) => getChatCollection().find(...args),
  insert: (...args) => getChatCollection().insert(...args),
  update: (...args) => getChatCollection().update(...args),
  remove: (...args) => getChatCollection().remove(...args)
};

export default db;
