import { E2EEEncryption, SecureStorage } from "../utils/e2ee";
import { LocalStorageDB } from "./localStorage";

let SignalDB;

// Helper to validate the constructor
function isValidConstructor(fn) {
  return typeof fn === "function" && /^class\s/.test(Function.prototype.toString.call(fn));
}

// Try @signaldb/core first
try {
  const signalModule = await import("@signaldb/core");
  const candidate = signalModule.SignalDB || signalModule.default;
  if (isValidConstructor(candidate)) {
    SignalDB = candidate;
  } else {
    throw new Error("Invalid @signaldb/core export");
  }
} catch (e1) {
  console.warn("@signaldb/core not found or invalid, trying signaldb...");
  try {
    const signalModule = await import("signaldb");
    const candidate = signalModule.SignalDB || signalModule.default;
    if (isValidConstructor(candidate)) {
      SignalDB = candidate;
    } else {
      throw new Error("Invalid signaldb export");
    }
  } catch (e2) {
    console.warn("No valid SignalDB found, using LocalStorage fallback");
    SignalDB = LocalStorageDB;
  }
}

// Detect Electron
export const isElectronEnvironment = () =>
  Boolean(window.electronAPI && window.electronAPI.isElectron);

export const isElectronApp = isElectronEnvironment();

let db;
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

    const adapters = ["local"];
    if (navigator.onLine) adapters.push("websocket");

    db = new SignalDB({
      name: "omnio-db",
      adapters,
      local: { encrypt: false },
      websocket: {
        url: isElectronApp
          ? "ws://localhost:3001"
          : "wss://openrelay.metered.ca:443",
        encryptMessages: true,
        encryptionKey,
        reconnectDelay: 1500,
        maxReconnectAttempts: 10
      }
    });

    db.on("connect", () => console.log("SignalDB connected"));
    db.on("disconnect", () => console.log("SignalDB disconnected"));
    db.on("error", (error) => console.error("SignalDB error:", error));

    await db.ready();
    initialized = true;
    return db;
  } catch (error) {
    console.error("Failed to initialize SignalDB, using fallback:", error);
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
