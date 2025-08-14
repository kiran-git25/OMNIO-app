import { LocalStorageDB } from "./localStorage";

// Detect Electron
export const isElectronEnvironment = () =>
  Boolean(window.electronAPI && window.electronAPI.isElectron);
export const isElectronApp = isElectronEnvironment();

let db;
let initialized = false;

export const initializeDatabase = async () => {
  if (initialized) return db;
  
  try {
    // For now, just use LocalStorageDB to get the build working
    db = new LocalStorageDB({ name: "omnio-db" });
    await db.ready?.();
    initialized = true;
    console.log("Database initialized with LocalStorage fallback");
    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    // Create a minimal fallback
    db = {
      collection: (name) => ({
        find: () => ({
          onSnapshot: (callback) => {
            // Return empty data for now
            callback([]);
            // Return unsubscribe function
            return () => {};
          }
        }),
        insert: (data) => {
          console.log("Insert data:", data);
          // Store in localStorage as backup
          try {
            const key = `omnio_${name}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.push(data);
            localStorage.setItem(key, JSON.stringify(existing));
          } catch (e) {
            console.error("LocalStorage error:", e);
          }
        },
        update: () => console.log("Update called"),
        remove: () => console.log("Remove called")
      })
    };
    initialized = true;
    return db;
  }
};

// Collections
let _chatCollection, _callCollection, _filesCollection;

export const getChatCollection = () => {
  if (!_chatCollection && db) {
    _chatCollection = db.collection("chat");
  }
  return _chatCollection || {
    find: () => ({
      onSnapshot: (callback) => {
        // Try to load from localStorage
        try {
          const stored = JSON.parse(localStorage.getItem('omnio_chat') || '[]');
          callback(stored);
        } catch (e) {
          callback([]);
        }
        return () => {};
      }
    }),
    insert: (data) => {
      try {
        const existing = JSON.parse(localStorage.getItem('omnio_chat') || '[]');
        existing.push(data);
        localStorage.setItem('omnio_chat', JSON.stringify(existing));
      } catch (e) {
        console.error("Chat insert error:", e);
      }
    }
  };
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
