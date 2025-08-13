import React from "react";

export default function TabManager({ tabs, activeId, setActiveId, onClose, onAdd }) {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab ${tab.id === activeId ? 'active' : ''}`}
          onClick={() => setActiveId(tab.id)}
        >
          <span>{tab.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.id);
            }}
            style={{
              marginLeft: 8,
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '2px 4px'
            }}
          >
            ×
          </button>
        </div>
      ))}
      <button className="btn" onClick={onAdd} style={{ marginLeft: 8 }}>
        + Tab
      </button>
    </div>
  );
}