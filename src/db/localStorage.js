// Fallback localStorage-based database for web deployment
class LocalStorageDB {
  constructor(name) {
    this.name = name;
    this.collections = {};
  }

  collection(collectionName) {
    if (!this.collections[collectionName]) {
      this.collections[collectionName] = new LocalCollection(this.name + '_' + collectionName);
    }
    return this.collections[collectionName];
  }

  ready() {
    return Promise.resolve();
  }

  on(event, callback) {
    // No-op for compatibility
  }
}

class LocalCollection {
  constructor(name) {
    this.name = name;
    this.data = this.loadData();
    this.subscribers = [];
  }

  loadData() {
    try {
      const stored = localStorage.getItem(this.name);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  saveData() {
    try {
      localStorage.setItem(this.name, JSON.stringify(this.data));
      this.notifySubscribers();
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  insert(doc) {
    this.data.push({
      ...doc,
      _id: doc.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
    });
    this.saveData();
  }

  find(query = {}) {
    return {
      onSnapshot: (callback) => {
        // Call immediately with current data
        callback(this.filterData(query));
        
        // Store callback for future updates
        this.subscribers.push(callback);
        
        // Return unsubscribe function
        return () => {
          this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
      }
    };
  }

  filterData(query) {
    if (Object.keys(query).length === 0) {
      return [...this.data];
    }
    
    return this.data.filter(item => {
      return Object.keys(query).every(key => item[key] === query[key]);
    });
  }

  notifySubscribers() {
    this.subscribers.forEach(callback => {
      callback([...this.data]);
    });
  }

  update(query, update) {
    this.data = this.data.map(item => {
      const matches = Object.keys(query).every(key => item[key] === query[key]);
      return matches ? { ...item, ...update } : item;
    });
    this.saveData();
  }

  remove(query) {
    this.data = this.data.filter(item => {
      return !Object.keys(query).every(key => item[key] === query[key]);
    });
    this.saveData();
  }
}

export { LocalStorageDB };