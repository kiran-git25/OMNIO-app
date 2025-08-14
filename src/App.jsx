import React, { useState, useEffect, useMemo, useCallback } from "react";
import Topbar from "./components/Topbar";
import TabManager from "./components/TabManager";
import ViewerPanel from "./components/ViewerPanel";
import ChatBox from "./components/ChatBox";
import URLPlayer from "./components/URLPlayer";
import Split from "react-split";
import { isElectronEnvironment, openFileDialog } from "./utils/electronFileService";
import { getChatCollection, initializeDatabase } from "./db/signalDB";
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
    // initial example tabs (could be files or special tabs)
    // special "url-player" tab id is 'tab:url'
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
  
  // Initialize database
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await initializeDatabase();
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

  // Chat rooms (simple local model). Each room: { id, name, members:[], messages:[], streamUrl }
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  
  // Sync rooms from chatCollection
  useEffect(() => {
    const chatCollection = getChatCollection();
    const unsub = chatCollection.find().onSnapshot((messages) => {
      // Group by roomId
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
      
      // Convert to array and sort by most recent message
      const roomsArray = Object.values(groupedRooms);
      roomsArray.sort((a, b) => {
        const aLatest = a.messages.length ? Math.max(...a.messages.map(m => m.ts || 0)) : 0;
        const bLatest = b.messages.length ? Math.max(...b.messages.map(m => m.ts || 0)) : 0;
        return bLatest - aLatest;
      });
      
      setRooms(roomsArray);
      
      // Select first room if no room is selected yet
      if (!activeRoomId && roomsArray.length > 0) {
        setActiveRoomId(roomsArray[0].id);
      }
    });
    
    // Create default room if no rooms exist
    setTimeout(() => {
      if (rooms.length === 0) {
        const generalRoomId = "r_general";
        getChatCollection().insert({
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
  }, [activeRoomId]);

  // helper: find active file & room
  const activeFile = useMemo(() => files.find(f => f.id === activeFileId) || null, [files, activeFileId]);
  const activeRoom = useMemo(() => rooms.find(r => r.id === activeRoomId) || rooms[0] || null, [rooms, activeRoomId]);

  // file helpers
  const addFileObjects = useCallback((fileList) => {
    // fileList is FileList or array of File
    const arr = Array.from(fileList);
    arr.forEach(file => {
      const id = Date.now().toString() + "-" + Math.random().toString(36).slice(2,6);
      const url = URL.createObjectURL(file);
      const name = file.name;
      const type = file.type || "";
      
      // read text content for text-based files
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

  // open external URL as "file" (for remote images / pdf / direct media)
  const openUrlAsFile = useCallback((url, name) => {
    const id = Date.now().toString() + "-" + Math.random().toString(36).slice(2,6);
    const inferredName = name || url.split("/").pop().split("?")[0] || url;
    setFiles(prev => [...prev, { id, name: inferredName, url, content: null, type: "" }]);
    setActiveFileId(id);
    setActiveTabId("tab:editor");
  }, []);
  
  // Handle native file opening (Electron only)
  const openNativeFiles = useCallback(async () => {
    if (!isElectron) return;
    
    try {
      const nativeFiles = await openFileDialog();
      if (nativeFiles && nativeFiles.length) {
        // Add native files to the file list
        setFiles(prev => [...prev, ...nativeFiles]);
        setActiveFileId(nativeFiles[0].id);
        setActiveTabId("tab:editor");
      }
    } catch (error) {
      console.error("Error opening native files:", error);
    }
  }, [isElectron]);

  // close file: revoke objectURL if created locally
  const closeFile = (id) => {
    const f = files.find(x => x.id === id);
    if (!f) return;
    // revoke only if object URL (starts with blob:) and not a native file
    if (f.url && f.url.startsWith("blob:") && !f.isNative) {
      try { URL.revokeObjectURL(f.url); } catch(e){}
    }
    setFiles(prev => prev.filter(x => x.id !== id));
    if (activeFileId === id) setActiveFileId(null);
  };

  // drop handlers bound to center panel (Viewer)
  const onDropFiles = (fileList) => {
    addFileObjects(fileList);
    setActiveTabId("tab:editor");
  };

  // simple tab actions
  const addNewTab = (name = "untitled") => {
    const id = "tab:" + Date.now().toString(36).slice(2,8);
    const newTab = { id, name, kind: "panel" };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
  };
  const closeTab = (id) => setTabs(prev => prev.filter(t => t.id !== id));
  
  // chat helpers
  const sendMessageToRoom = (roomId, message) => {
    getChatCollection().insert({
      ...message,
      id: Date.now().toString() + "-" + Math.random().toString(36).slice(2,6),
      roomId,
      from: userName,
      ts: Date.now()
    });
  };
  
  const shareStreamToRoom = (roomId, streamUrl) => {
    if (!roomId) return;
    
    getChatCollection().insert({
      id: Date.now().toString() + "-" + Math.random().toString(36).slice(2,6),
      roomId,
      roomName: activeRoom?.name || roomId,
      from: userName,
      type: "stream",
      url: streamUrl,
      ts: Date.now()
    });
  };

  // cleanup objectURLs on unmount
  useEffect(() => {
    return () => {
      files.forEach(f => { 
        if (f.url && f.url.startsWith("blob:") && !f.isNative) {
          try { URL.revokeObjectURL(f.url) } catch {} 
        }
      });
    };
  }, [files]);

  // Loading state
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
            <div style={{padding:8}}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8
              }}>
                <h4 style={{margin:0}}>Files</h4>
                <div>
                  <button 
                    className="btn small" 
                    onClick={() => isElectron ? openNativeFiles() : document.getElementById('file-input').click()}
                    title={isElectron ? "Open files from your device" : "Upload files"}
                  >
                    Open
                  </button>
                </div>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                <input 
                  id="file-input"
                  type="file" 
                  multiple 
                  style={{display:'none'}} 
                  onChange={(e) => onDropFiles(e.target.files)} 
                />
                
                {files.length===0 && (
                  <div style={{
                    color:'var(--color-muted)', 
                    padding: '10px',
                    textAlign: 'center',
                    border: '1px dashed var(--color-border)',
                    borderRadius: '4px',
                  }}>
                    <p>Drop files into viewer or click 'Open'</p>
                    {isElectron && <p style={{fontSize: '0.9em'}}>✨ Desktop app can open any file on your system</p>}
                  </div>
                )}
                
                {files.map(f => (
                  <div 
                    key={f.id} 
                    className={`file-item ${activeFileId===f.id ? 'file-active':''}`} 
                    onClick={() => { 
                      setActiveFileId(f.id); 
                      setActiveTabId("tab:editor"); 
                    }}
                    title={f.path || f.name}
                  >
                    <div style={{
                      display:'flex',
                      justifyContent:'space-between',
                      alignItems:'center'
                    }}>
                      <div style={{
                        overflow:'hidden', 
                        textOverflow:'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {f.isNative && <span style={{color: 'var(--color-primary)', fontSize: '0.8em'}}>📌</span>}
                        <span>{f.name}</span>
                        {f.size && (
                          <small style={{color: 'var(--color-muted)', marginLeft: 'auto', fontSize: '0.8em'}}>
                            {Math.round(f.size / 1024)} KB
                          </small>
                        )}
                      </div>
                      <div style={{display:'flex',gap:4, marginLeft: 6}}>
                        <button 
                          className="btn tiny"
                          title="Close file" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            closeFile(f.id); 
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center panel: viewer / editor / URL player */}
          <div 
            className="panel center-panel" 
            onDragOver={(e) => { 
              e.preventDefault(); 
              e.dataTransfer.dropEffect='copy'; 
            }} 
            onDrop={(e) => { 
              e.preventDefault(); 
              if (e.dataTransfer.files && e.dataTransfer.files.length) {
                onDropFiles(e.dataTransfer.files);
              }
            }}
          >
            {/* if active tab is urlplayer, show URLPlayer, else show Viewer */}
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
                  // update file content if text
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
                // If it's a native file path, find the file by path
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
