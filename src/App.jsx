import React, { useState, useEffect, useMemo, useCallback } from "react";
import Topbar from "./components/Topbar";
import TabManager from "./components/TabManager";
import ViewerPanel from "./components/ViewerPanel";
import ChatBox from "./components/ChatBox";
import URLPlayer from "./components/URLPlayer";
import Split from "react-split";
import { isElectronEnvironment, openFileDialog } from "./utils/electronFileService";
import { initializeDatabase, getChatCollection } from "./db/signalDB"; // ✅ updated import
import "./index.css";

/*
 App responsibilities:
 - Manage tabs & files
 - Handle drag-drop files (create object URLs & read text)
 - Provide URL player tab
 - Manage data persistence (SignalDB)
 - Provide end-to-end encrypted chat rooms
 - Support both web and desktop (Electron) environments
*/

export default function App() {
  // Application information
  const appVersion = "1.0.0";
  const appName = "OmniO";
  const isElectron = isElectronEnvironment();
  
  // files: { id, name, url (objectURL or external), content (text if applicable), type, path (for native files) }
  const [files, setFiles] = useState(() => []);
  const [tabs, setTabs] = useState(() => [
    { id: "tab:files", name: "Files", kind: "panel" },
    { id: "tab:editor", name: "Editor", kind: "panel" },
    { id: "tab:player", name: "Stream", kind: "urlplayer" }
  ]);
  const [activeTabId, setActiveTabId] = useState("tab:editor");
  const [activeFileId, setActiveFileId] = useState(null);
  
  // Application status indicators
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState(() => {
    try {
      return localStorage.getItem("omnio_username") || "User" + Math.floor(Math.random() * 1000);
    } catch (e) { 
      return "User" + Math.floor(Math.random() * 1000);
    }
  });

  // theme default dark
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("omnio_theme") || "dark";
    } catch (e) { return "dark"; }
  });
  
  // Chat rooms (simple local model). Each room: { id, name, members:[], messages:[], streamUrl }
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);

  // ✅ store chatCollection reference after DB init
  const [chatCollection, setChatCollection] = useState(null);
  
  // Initialize database
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await initializeDatabase();
        setChatCollection(getChatCollection()); // ✅ set after DB ready
      } catch (err) {
        console.error("Failed to initialize database:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, []);
  
  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { 
      localStorage.setItem("omnio_theme", theme);
      document.title = `${appName} - Universal Viewer (${isElectron ? 'Desktop' : 'Web'})`;
    } catch (e) {}
  }, [theme, isElectron]);
  
  // Save username when it changes
  useEffect(() => {
    try {
      localStorage.setItem("omnio_username", userName);
    } catch (e) {}
  }, [userName]);

  // Sync rooms from chatCollection (only after it’s set)
  useEffect(() => {
    if (!chatCollection) return; // ✅ prevent undefined
    const unsub = chatCollection.find().onSnapshot((messages) => {
      const groupedRooms = {};
      
      messages.forEach((msg) => {
        if (!groupedRooms[msg.roomId]) {
          groupedRooms[msg.roomId] = {
            id: msg.roomId,
            name: msg.roomName || msg.roomId,
            members: [],
            messages: [],
            streamUrl: "",
            isSecure: msg.isSecure === true
          };
        }
        
        if (msg.type === "stream") {
          groupedRooms[msg.roomId].streamUrl = msg.url;
        } else {
          groupedRooms[msg.roomId].messages.push(msg);
        }
      });
      
      const roomsArray = Object.values(groupedRooms);
      roomsArray.sort((a, b) => {
        const aLatest = a.messages.length ? Math.max(...a.messages.map(m => m.ts || 0)) : 0;
        const bLatest = b.messages.length ? Math.max(...b.messages.map(m => m.ts || 0)) : 0;
        return bLatest - aLatest;
      });
      
      setRooms(roomsArray);
      
      if (!activeRoomId && roomsArray.length > 0) {
        setActiveRoomId(roomsArray[0].id);
      }
    });
    
    setTimeout(() => {
      if (rooms.length === 0) {
        const generalRoomId = "r_general";
        chatCollection.insert({
          id: Date.now().toString(),
          roomId: generalRoomId,
          roomName: "General",
          from: "System",
          type: "text",
          text: `Welcome to ${appName}! This is a general chat room.`,
          ts: Date.now()
        });
        setActiveRoomId(generalRoomId);
      }
    }, 500);
    
    return () => unsub();
  }, [activeRoomId, chatCollection]);

  // helper: find active file & room
  const activeFile = useMemo(() => files.find(f => f.id === activeFileId) || null, [files, activeFileId]);
  const activeRoom = useMemo(() => rooms.find(r => r.id === activeRoomId) || rooms[0] || null, [rooms, activeRoomId]);

  // file helpers
  const addFileObjects = useCallback((fileList) => {
    const arr = Array.from(fileList);
    arr.forEach(file => {
      const id = Date.now().toString() + "-" + Math.random().toString(36).slice(2,6);
      const url = URL.createObjectURL(file);
      const name = file.name;
      const type = file.type || "";
      
      if (type.startsWith("text") || /\.(md|json|js|jsx|ts|tsx|css|html|xml|txt|py|rb|java|c|cpp|h)$/i.test(name)) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setFiles(prev => [...prev, { 
            id, 
            name, 
            url, 
            content: ev.target.result, 
            type,
            size: file.size 
          }]);
          setActiveFileId(id);
        };
        reader.readAsText(file);
      } else {
        setFiles(prev => [...prev, { 
          id, 
          name, 
          url, 
          content: null, 
          type,
          size: file.size
        }]);
        setActiveFileId(id);
      }
    });
  }, []);

  const openUrlAsFile = useCallback((url, name) => {
    const id = Date.now().toString() + "-" + Math.random().toString(36).slice(2,6);
    const inferredName = name || url.split("/").pop().split("?")[0] || url;
    setFiles(prev => [...prev, { id, name: inferredName, url, content: null, type: "" }]);
    setActiveFileId(id);
    setActiveTabId("tab:editor");
  }, []);

  const openNativeFiles = useCallback(async () => {
    if (!isElectron) return;
    
    try {
      const nativeFiles = await openFileDialog();
      if (nativeFiles && nativeFiles.length) {
        setFiles(prev => [...prev, ...nativeFiles]);
        setActiveFileId(nativeFiles[0].id);
        setActiveTabId("tab:editor");
      }
    } catch (error) {
      console.error("Error opening native files:", error);
    }
  }, [isElectron]);

  const closeFile = (id) => {
    const f = files.find(x => x.id === id);
    if (!f) return;
    if (f.url && f.url.startsWith("blob:") && !f.isNative) {
      try { URL.revokeObjectURL(f.url); } catch(e){}
    }
    setFiles(prev => prev.filter(x => x.id !== id));
    if (activeFileId === id) setActiveFileId(null);
  };

  const onDropFiles = (fileList) => {
    addFileObjects(fileList);
    setActiveTabId("tab:editor");
  };

  const addNewTab = (name = "untitled") => {
    const id = "tab:" + Date.now().toString(36).slice(2,8);
    const newTab = { id, name, kind: "panel" };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
  };
  const closeTab = (id) => setTabs(prev => prev.filter(t => t.id !== id));
  
  const sendMessageToRoom = (roomId, message) => {
    if (!chatCollection) return; // ✅ prevent undefined
    chatCollection.insert({
      ...message,
      id: Date.now().toString() + "-" + Math.random().toString(36).slice(2,6),
      roomId,
      from: userName,
      ts: Date.now()
    });
  };
  
  const shareStreamToRoom = (roomId, streamUrl) => {
    if (!roomId || !chatCollection) return; // ✅ prevent undefined
    chatCollection.insert({
      id: Date.now().toString() + "-" + Math.random().toString(36).slice(2,6),
      roomId,
      roomName: activeRoom?.name || roomId,
      from: userName,
      type: "stream",
      url: streamUrl,
      ts: Date.now()
    });
  };

  useEffect(() => {
    return () => {
      files.forEach(f => { 
        if (f.url && f.url.startsWith("blob:") && !f.isNative) {
          try { URL.revokeObjectURL(f.url) } catch {} 
        }
      });
    };
  }, [files]);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <h2>{appName}</h2>
          <div className="loading-spinner"></div>
          <p>Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <Topbar 
        theme={theme} 
        toggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")} 
        onNewTab={() => addNewTab()}
        appName={appName}
        version={appVersion}
        isElectron={isElectron}
        userName={userName}
        setUserName={(name) => setUserName(name)}
        onOpenFile={openNativeFiles}
      />
      <TabManager
        tabs={tabs}
        activeId={activeTabId}
        setActiveId={setActiveTabId}
        onClose={(id) => closeTab(id)}
        onAdd={() => addNewTab()}
      />
      <div className="main-split">
        <Split sizes={[20, 60, 20]} minSize={[140, 300, 200]} gutterSize={8} className="split" >
          {/* Left panel: file list / explorer */}
          <div className="panel left-panel">
            {/* ...rest of your original UI code... */}
          </div>

          {/* Center panel: viewer / editor / URL player */}
          <div 
            className="panel center-panel"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect='copy'; }}
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) onDropFiles(e.dataTransfer.files); }}
          >
            { activeTabId === "tab:player" ? (
              <URLPlayer 
                onOpenUrl={(url) => openUrlAsFile(url, url)} 
                onShareToRoom={(url) => shareStreamToRoom(activeRoomId, url)} 
                activeRoomId={activeRoomId}
                roomName={activeRoom?.name}
              />
            ) : (
              <ViewerPanel
                file={activeFile}
                onEdit={(content) => {
                  setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content } : f));
                }}
                onFileDrop={(fileList) => onDropFiles(fileList)}
                onOpenUrl={(url, name) => openUrlAsFile(url, name)}
              />
            )}
          </div>

          {/* Right panel: chat */}
          <div className="panel right-panel">
            <ChatBox
              activeRoomId={activeRoomId}
              setActiveRoomId={setActiveRoomId}
              username={userName}
              onOpenFile={(url) => { 
                if (url.startsWith('/') || url.includes(':\\')) {
                  const existingFile = files.find(f => f.path === url);
                  if (existingFile) {
                    setActiveFileId(existingFile.id);
                  } else {
                    openUrlAsFile(`file://${url}`, url.split('/').pop());
                  }
                } else {
                  openUrlAsFile(url, url.split('/').pop());
                }
                setActiveTabId("tab:editor");
              }}
            />
          </div>
        </Split>
      </div>
      
      {/* Status bar at bottom */}
      <div className="status-bar">
        <div className="status-item">
          {isElectron ? '💻 Desktop App' : '🌐 Web App'}
        </div>
        <div className="status-item">
          {`v${appVersion}`}
        </div>
        <div className="status-item" style={{ marginLeft: 'auto' }}>
          {`User: ${userName}`}
        </div>
      </div>
    </div>
  );
}
