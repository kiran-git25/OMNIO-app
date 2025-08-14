import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactPlayer from "react-player";
import { getChatCollection, isElectronApp } from "../db/signalDB"; // our SignalDB chat storage
import { E2EEEncryption, SecureStorage } from "../utils/e2ee";
import { openFileDialog } from "../utils/electronFileService";

// Secure storage for room keys
const roomKeysStorage = new SecureStorage('omnio-chat-rooms');

export default function ChatBox({
  activeRoomId,
  setActiveRoomId,
  username = "You",
  onOpenFile
}) {
  const [rooms, setRooms] = useState([]);
  const [input, setInput] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState(activeRoomId || null);
  const [roomKeys, setRoomKeys] = useState({});
  const [secureMode, setSecureMode] = useState(true); // E2EE enabled by default
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Load room encryption keys
  useEffect(() => {
    const savedKeys = roomKeysStorage.get('room-keys') || {};
    setRoomKeys(savedKeys);
  }, []);

  // Save room keys when they change
  useEffect(() => {
    if (Object.keys(roomKeys).length > 0) {
      roomKeysStorage.set('room-keys', roomKeys);
    }
  }, [roomKeys]);

  // Sync rooms from DB
  useEffect(() => {
    const chatCollection = getChatCollection();
    const unsub = chatCollection.find().onSnapshot((allMessages) => {
      // Group by roomId
      const grouped = {};
      allMessages.forEach((m) => {
        if (!grouped[m.roomId]) {
          grouped[m.roomId] = {
            id: m.roomId,
            name: m.roomName || m.roomId,
            members: [],
            messages: [],
            streamUrl: "",
            isSecure: m.isSecure === true
          };
          
          // Generate room key if it doesn't exist
          if (m.isSecure && !roomKeys[m.roomId]) {
            setRoomKeys(prev => ({
              ...prev,
              [m.roomId]: E2EEEncryption.generateRoomKey()
            }));
          }
        }
        
        // Handle encrypted messages
        if (m.isEncrypted && roomKeys[m.roomId]) {
          try {
            // Try to decrypt the message
            if (m.type === "text" && m.encryptedText) {
              const decrypted = E2EEEncryption.decrypt(m.encryptedText, roomKeys[m.roomId]);
              if (decrypted) {
                m.text = decrypted;
                m.isDecrypted = true;
              } else {
                m.text = "[Encrypted message - missing key]";
              }
            }
          } catch (err) {
            console.error("Failed to decrypt message:", err);
            m.text = "[Encrypted message - decryption failed]";
          }
        }
        
        if (m.type === "stream") grouped[m.roomId].streamUrl = m.url;
        else grouped[m.roomId].messages.push(m);
      });
      
      setRooms(Object.values(grouped));
      if (!selectedRoomId && Object.values(grouped).length > 0) {
        setSelectedRoomId(Object.values(grouped)[0].id);
      }
    });
    return () => unsub();
  }, [roomKeys]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rooms]);

  useEffect(() => {
    if (typeof setActiveRoomId === "function") setActiveRoomId(selectedRoomId);
  }, [selectedRoomId, setActiveRoomId]);

  const sendMessage = useCallback((message) => {
    // Check if room is in secure mode
    const room = rooms.find(r => r.id === message.roomId);
    const isSecureRoom = room?.isSecure || secureMode;
    
    // If secure mode is on, encrypt the message
    if (isSecureRoom) {
      const roomKey = roomKeys[message.roomId] || E2EEEncryption.generateRoomKey();
      
      // Save the new room key if it was just generated
      if (!roomKeys[message.roomId]) {
        setRoomKeys(prev => ({ ...prev, [message.roomId]: roomKey }));
      }
      
      // Encrypt based on message type
      if (message.type === "text") {
        const encryptedText = E2EEEncryption.encrypt(message.text, roomKey);
        message = {
          ...message,
          isEncrypted: true,
          encryptedText: encryptedText,
          isSecure: true
        };
      } else if (message.type === "stream") {
        // URLs are not encrypted as they need to be accessible
        message = {
          ...message,
          isSecure: true
        };
      }
    }
    
    getChatCollection().insert(message);
  }, [rooms, secureMode, roomKeys]);

  const send = () => {
    if (!input.trim()) return;
    sendMessage({
      id: Date.now().toString() + "-" + Math.random().toString(36).slice(2, 6),
      roomId: selectedRoomId,
      roomName: getRoomName(selectedRoomId),
      from: username,
      type: "text",
      text: input.trim(),
      ts: Date.now()
    });
    setInput("");
  };

  const getRoomName = (id) => {
    const r = rooms.find((r) => r.id === id);
    return r ? r.name : id;
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleFileAttach = async (files) => {
    let filesToProcess = files;
    
    // If running in Electron, use native file picker
    if (!files && isElectronApp) {
      filesToProcess = await openFileDialog();
      if (!filesToProcess?.length) return;
      
      // Process native files
      filesToProcess.forEach(file => {
        sendMessage({
          id: file.id,
          roomId: selectedRoomId,
          roomName: getRoomName(selectedRoomId),
          from: username,
          type: "file",
          name: file.name,
          url: file.url,
          path: file.path,
          isNative: true,
          ts: Date.now()
        });
      });
      return;
    }
    
    // Browser file upload
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      sendMessage({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        roomId: selectedRoomId,
        roomName: getRoomName(selectedRoomId),
        from: username,
        type: "file",
        name: file.name,
        url,
        size: file.size,
        ts: Date.now()
      });
    });
  };

  const shareStream = () => {
    const u = prompt("Paste stream/video URL to share in this room:");
    if (!u) return;
    sendMessage({
      id: Date.now().toString(),
      roomId: selectedRoomId,
      roomName: getRoomName(selectedRoomId),
      from: username,
      type: "stream",
      url: u,
      ts: Date.now()
    });
  };

  const createRoom = () => {
    const name = prompt("New room name", "New room");
    if (!name) return;
    
    const id = "r_" + Date.now().toString(36).slice(2, 6);
    const newRoomKey = E2EEEncryption.generateRoomKey();
    
    // Save encryption key for the new room
    setRoomKeys(prev => ({ ...prev, [id]: newRoomKey }));
    
    setRooms((prev) => [
      ...prev,
      { 
        id, 
        name, 
        members: [username], 
        messages: [], 
        streamUrl: "",
        isSecure: secureMode
      }
    ]);
    
    setSelectedRoomId(id);
    
    // Send an initial encrypted message with room settings
    setTimeout(() => {
      sendMessage({
        id: Date.now().toString(),
        roomId: id,
        roomName: name,
        from: "System",
        type: "text",
        text: `Room created by ${username}. End-to-end encryption: ${secureMode ? 'Enabled' : 'Disabled'}`,
        isSecure: secureMode,
        ts: Date.now()
      });
    }, 100);
  };

  const activeRoom =
    rooms.find((r) => r.id === selectedRoomId) || {
      messages: [],
      streamUrl: "",
      isSecure: secureMode
    };

  // Toggle end-to-end encryption for a room
  const toggleSecureMode = () => {
    const newSecureMode = !secureMode;
    setSecureMode(newSecureMode);
    
    // Notify users about security mode change
    if (selectedRoomId) {
      sendMessage({
        id: Date.now().toString(),
        roomId: selectedRoomId,
        roomName: getRoomName(selectedRoomId),
        from: "System",
        type: "text",
        text: `${username} changed encryption to: ${newSecureMode ? 'Enabled' : 'Disabled'}`,
        ts: Date.now()
      });
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Rooms list */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
        <div style={{ flex: 1, display: "flex", gap: 6, overflow: "auto" }}>
          {rooms.map((r) => (
            <button
              key={r.id}
              className={`btn ${r.id === selectedRoomId ? "active" : ""}`}
              onClick={() => setSelectedRoomId(r.id)}
            >
              <span>{r.name}</span>
              {r.isSecure && (
                <span title="Encrypted Room" style={{ marginLeft: 4, fontSize: '0.8em' }}>
                  🔒
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn" onClick={createRoom}>+ Room</button>
          <button className="btn" onClick={shareStream}>Stream</button>
        </div>
      </div>

      {/* Security indicator */}
      <div 
        style={{ 
          display: "flex", 
          justifyContent: "space-between",
          alignItems: "center",
          padding: "4px 8px",
          fontSize: "0.85em",
          backgroundColor: activeRoom.isSecure ? "var(--color-primary-muted)" : "transparent",
          color: activeRoom.isSecure ? "var(--color-primary)" : "var(--color-muted)",
          borderRadius: 4
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ marginRight: 4 }}>
            {activeRoom.isSecure ? "🔒 End-to-end encrypted" : "🔓 Standard messaging"}
          </span>
        </div>
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input 
            type="checkbox" 
            checked={secureMode} 
            onChange={toggleSecureMode} 
            style={{ marginRight: 4 }}
          />
          E2EE
        </label>
      </div>

      {/* Stream box */}
      {activeRoom.streamUrl ? (
        <div
          style={{
            padding: 8,
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            marginBottom: 8,
            background: "var(--color-surface)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6
            }}
          >
            <strong>Shared Stream</strong>
            <small style={{ color: "var(--color-muted)" }}>
              {activeRoom.streamUrl}
            </small>
          </div>
          <div style={{ height: 180 }}>
            <ReactPlayer
              url={activeRoom.streamUrl}
              controls
              width="100%"
              height="100%"
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: 8,
            marginBottom: 8,
            color: "var(--color-muted)"
          }}
        >
          No shared stream in this room. Click "Stream" to paste a URL for everyone.
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8
        }}
      >
        {(activeRoom.messages || []).map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.from === username ? "flex-end" : "flex-start",
              maxWidth: "85%"
            }}
          >
            <div style={{ 
              fontSize: 12, 
              color: "var(--color-muted)",
              display: "flex",
              alignItems: "center",
              gap: 4 
            }}>
              {m.from}
              {m.isEncrypted && (
                <span title="End-to-End Encrypted" style={{ fontSize: '0.9em' }}>
                  🔒
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: '0.9em' }}>
                {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {m.type === "text" && (
              <div
                style={{
                  padding: 8,
                  background:
                    m.from === username
                      ? "var(--color-primary)"
                      : "var(--color-surface)",
                  color:
                    m.from === username ? "#fff" : "var(--color-fg)",
                  borderRadius: 8,
                  marginTop: 4,
                  wordBreak: "break-word"
                }}
              >
                {m.text}
              </div>
            )}
            {m.type === "file" && (
              <div
                style={{
                  padding: 8,
                  background: "var(--color-surface)",
                  borderRadius: 8,
                  marginTop: 4
                }}
              >
                <div>{m.name}</div>
                <div style={{ marginTop: 6 }}>
                  {/\.(png|jpg|jpeg|gif|svg)$/i.test(m.name) ? (
                    <img
                      src={m.url}
                      alt={m.name}
                      style={{ maxWidth: 220, maxHeight: 160 }}
                    />
                  ) : (
                    <div style={{ display: "flex", gap: 4, flexDirection: "column" }}>
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn tiny"
                      >
                        Open attachment
                      </a>
                      <button
                        className="btn tiny"
                        onClick={() =>
                          onOpenFile && onOpenFile(m.isNative ? m.path : m.url)
                        }
                      >
                        Open in viewer
                      </button>
                      {m.size && (
                        <small style={{ color: "var(--color-muted)" }}>
                          {Math.round(m.size / 1024)} KB
                        </small>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {m.type === "stream" && (
              <div
                style={{
                  padding: 8,
                  background: "var(--color-surface)",
                  borderRadius: 8,
                  marginTop: 4
                }}
              >
                Stream: {m.url}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: 8,
          borderTop: "1px solid var(--color-border)"
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            multiple
            onChange={(e) => handleFileAttach(e.target.files)}
          />
          <button
            className="btn"
            title="Attach files"
            onClick={() => {
              // If in Electron, use native file picker
              if (isElectronApp) {
                handleFileAttach();
              } else if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          >
            📎
          </button>
          <button
            className="btn"
            title={activeRoom.isSecure ? "Encrypted messaging enabled" : "Standard messaging"}
          >
            {activeRoom.isSecure ? "🔒" : "🔓"}
          </button>
        </div>
        <textarea
          placeholder={activeRoom.isSecure ? "Encrypted message (Enter to send)" : "Message (Enter to send)"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 140,
            padding: 8,
            borderRadius: 8,
            resize: "none"
          }}
        />
        <button 
          className="btn" 
          onClick={send}
          disabled={!input.trim()}
          style={{
            opacity: input.trim() ? 1 : 0.6
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
