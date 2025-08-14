// SignalDB-compatible database implementation using localStorage
// This provides the same API as SignalDB but stores data locally

// Detect Electron
export const isElectronEnvironment = () =>
  Boolean(window.electronAPI && window.electronAPI.isElectron);
export const isElectronApp = isElectronEnvironment();

// Simple event emitter for database events
class SimpleEventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
}

// SignalDB-compatible Collection class
class CompatibleCollection extends SimpleEventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.options = options;
    this.storageKey = `omnio_${name}`;
    this.subscribers = new Set();
  }
  
  // Get all data from localStorage
  _getData() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return [];
    }
  }
  
  // Save data to localStorage and notify subscribers
  _saveData(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      this._notifySubscribers(data);
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }
  
  // Notify all subscribers of data changes
  _notifySubscribers(data) {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error('Error in subscriber callback:', e);
      }
    });
  }
  
  // SignalDB-compatible find method
  find(query = {}) {
    return {
      onSnapshot: (callback) => {
        // Add subscriber
        this.subscribers.add(callback);
        
        // Call immediately with current data
        const data = this._getData();
        callback(data);
        
        // Return unsubscribe function
        return () => {
          this.subscribers.delete(callback);
        };
      }
    };
  }
  
  // Insert new document
  insert(document) {
    const data = this._getData();
    data.push(document);
    this._saveData(data);
    return document;
  }
  
  // Update documents (simple implementation)
  update(query, updateData) {
    const data = this._getData();
    // Simple update - for now just log
    console.log('Update called:', query, updateData);
    return { modifiedCount: 0 };
  }
  
  // Remove documents (simple implementation)
  remove(query) {
    const data = this._getData();
    // Simple remove - for now just log
    console.log('Remove called:', query);
    return { deletedCount: 0 };
  }
}

// SignalDB-compatible database class
class CompatibleSignalDB extends SimpleEventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.collections = new Map();
    this.name = options.name || 'omnio-db';
  }
  
  // Create or get collection
  collection(name, options = {}) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new CompatibleCollection(name, options));
    }
    return this.collections.get(name);
  }
  
  // Ready method for compatibility
  async ready() {
    return Promise.resolve();
  }
}

let db;
let initialized = false;

export const initializeDatabase = async () => {
  if (initialized) return db;
  
  try {
    // Create our SignalDB-compatible database
    db = new CompatibleSignalDB({
      name: "omnio-db"
    });
    
    // Simulate SignalDB events
    setTimeout(() => db.emit("connect"), 100);
    
    await db.ready();
    initialized = true;
    console.log("SignalDB-compatible database initialized");
    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
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
