import React from "react";

export default function Topbar({ 
  theme, 
  toggleTheme, 
  onNewTab, 
  appName = "OmniO", 
  version = "1.0.0", 
  isElectron = false, 
  userName, 
  setUserName,
  onOpenFile 
}) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 16px",
      borderBottom: "1px solid var(--color-accent)",
      backgroundColor: "var(--color-bg)",
      color: "var(--color-fg)",
      minHeight: "40px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <strong>{appName} v{version}</strong>
        {isElectron && <span style={{ fontSize: "0.85em", color: "var(--color-accent)" }}>Desktop</span>}
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input
          type="text"
          placeholder="Username"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          style={{
            padding: "4px 8px",
            borderRadius: 4,
            border: "1px solid var(--color-accent)",
            background: "transparent",
            color: "var(--color-fg)",
            fontSize: "0.9em",
            width: "100px"
          }}
        />
        
        {isElectron && (
          <button className="btn" onClick={onOpenFile}>
            📁 Open Files
          </button>
        )}
        
        <button className="btn" onClick={onNewTab}>
          + Tab
        </button>
        
        <button className="btn" onClick={toggleTheme}>
          {theme === "dark" ? "🌞" : "🌙"}
        </button>
      </div>
    </div>
  );
}