import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { saveFileDialog, isElectronEnvironment } from "../utils/electronFileService";

/*
Props:
 - file: { id, name, url, content, type, path, isNative }
 - onEdit(content)
 - onFileDrop(fileList)
 - onOpenUrl(url)
*/
export default function ViewerPanel({ file, onEdit, onFileDrop, onOpenUrl }) {
  const [content, setContent] = useState("");
  const [isModified, setIsModified] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dropAreaRef = useRef(null);
  const isElectron = isElectronEnvironment();
  
  // Handle file content changes
  useEffect(() => {
    if (file && file.content !== undefined) {
      setContent(file.content || "");
      setIsModified(false);
    }
  }, [file?.id, file?.content]);

  // Set up drag and drop handlers
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (onFileDrop && e.dataTransfer?.files) {
        onFileDrop(e.dataTransfer.files);
      }
    };
    
    const dropArea = dropAreaRef.current;
    if (dropArea) {
      dropArea.addEventListener('dragover', handleDragOver);
      dropArea.addEventListener('drop', handleDrop);
      
      return () => {
        dropArea.removeEventListener('dragover', handleDragOver);
        dropArea.removeEventListener('drop', handleDrop);
      };
    }
  }, [onFileDrop]);

  // Empty state - show file drop zone
  if (!file) {
    return (
      <div 
        ref={dropAreaRef}
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          color: 'var(--color-muted)',
          background: 'var(--color-surface)',
          border: '2px dashed var(--color-border)',
          borderRadius: 8,
          margin: 8
        }}
      >
        <div style={{fontSize: 20, fontWeight: 600}}>No file selected</div>
        <div>Drag & drop files here or click 'Open' from the Files list.</div>
        <div style={{marginTop: 12}}>
          <input 
            type="text" 
            placeholder="Open remote URL (image / pdf / mp4)..." 
            style={{
              padding: '8px 12px',
              width: 360,
              borderRadius: 4,
              border: '1px solid var(--color-border)'
            }} 
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && e.target.value) {
                onOpenUrl && onOpenUrl(e.target.value);
              }
            }} 
          />
        </div>
        {isElectron && (
          <div style={{marginTop: 8, fontSize: 14}}>
            <span>💡 Tip: Using the desktop app, you can open files from anywhere on your computer.</span>
          </div>
        )}
      </div>
    );
  }

  // Get file extension for determining view type
  const fileExt = (file.name || "").split(".").pop().toLowerCase();
  
  // Handle content change in editable files
  const handleContentChange = (newContent) => {
    setContent(newContent);
    setIsModified(true);
    onEdit && onEdit(newContent);
  };
  
  // Save current file content
  const saveFile = async () => {
    if (isElectron) {
      // In Electron, use native save dialog
      const result = await saveFileDialog(content, file.name);
      if (result) {
        setIsModified(false);
      }
    } else {
      // Browser fallback
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsModified(false);
    }
  };

  // Render text editor with appropriate syntax highlighting
  const renderTextEditor = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '4px 8px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)'
      }}>
        {isModified && (
          <span style={{
            marginRight: 'auto',
            fontSize: 13,
            color: 'var(--color-primary)'
          }}>
            ● Modified
          </span>
        )}
        <button 
          className="btn small"
          onClick={saveFile}
          disabled={!isModified}
        >
          Save
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        style={{
          flex: 1,
          resize: 'none',
          border: 'none',
          background: 'transparent',
          color: 'var(--color-fg)',
          fontFamily: 'monospace',
          padding: 12,
          outline: 'none'
        }}
        spellCheck={false}
      />
    </div>
  );

  // File source URL - handle both browser and Electron paths
  const fileSource = file.isNative && file.path 
    ? `file://${file.path}` 
    : file.url;

  // Toggle fullscreen for media files
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Create a toolbar for media viewers
  const MediaToolbar = () => (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      padding: '4px 8px',
      background: 'rgba(0,0,0,0.5)',
      borderBottomLeftRadius: 4,
      zIndex: 10
    }}>
      <button 
        className="btn small" 
        onClick={toggleFullscreen}
        style={{ background: 'transparent', color: 'white' }}
      >
        {isFullscreen ? '❐ Exit Fullscreen' : '⤢ Fullscreen'}
      </button>
    </div>
  );

  // Render file based on its type
  switch (fileExt) {
    // Text-based files
    case "txt": case "js": case "jsx": case "ts": case "tsx":
    case "json": case "css": case "scss": case "html": case "xml": 
    case "py": case "rb": case "java": case "c": case "cpp": case "h":
    case "sh": case "bat": case "ps1":
      return renderTextEditor();

    // Markdown files
    case "md": case "markdown":
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '4px 8px',
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            gap: 8
          }}>
            <button 
              className="btn small" 
              onClick={saveFile}
              disabled={!isModified}
            >
              Save
            </button>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            height: 'calc(100% - 34px)',
            overflow: 'hidden'
          }}>
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              style={{
                height: '100%',
                resize: 'none',
                border: 'none',
                borderRight: '1px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-fg)',
                fontFamily: 'monospace',
                padding: 12,
                outline: 'none',
                overflow: 'auto'
              }}
              spellCheck={false}
            />
            <div style={{
              padding: 12,
              overflow: 'auto',
              height: '100%'
            }}>
              <ReactMarkdown>{content || ""}</ReactMarkdown>
            </div>
          </div>
        </div>
      );

    // Image files
    case "png": case "jpg": case "jpeg": case "gif": case "svg": case "webp":
      return (
        <div 
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            background: isFullscreen ? 'rgba(0,0,0,0.9)' : 'transparent',
            ...(isFullscreen ? {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000
            } : {})
          }}
        >
          <MediaToolbar />
          <img 
            src={fileSource} 
            alt={file.name} 
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }} 
          />
        </div>
      );

    // Audio files
    case "mp3": case "wav": case "ogg": case "flac":
      return (
        <div style={{
          padding: 16,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16
        }}>
          <div style={{
            fontSize: 20,
            fontWeight: 500
          }}>
            {file.name}
          </div>
          <audio controls style={{width: '100%', maxWidth: 500}}>
            <source src={fileSource} type={file.type} />
            Your browser does not support audio playback.
          </audio>
        </div>
      );

    // Video files
    case "mp4": case "webm": case "mov": case "avi":
      return (
        <div 
          style={{
            height: '100%',
            position: 'relative',
            ...(isFullscreen ? {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
              background: '#000'
            } : {})
          }}
        >
          <MediaToolbar />
          <video 
            controls 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          >
            <source src={fileSource} type={file.type} />
            Your browser does not support video playback.
          </video>
        </div>
      );

    // PDF files
    case "pdf":
      return (
        <div style={{height: '100%', position: 'relative'}}>
          <MediaToolbar />
          <iframe 
            src={fileSource} 
            title={file.name} 
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }} 
          />
        </div>
      );
      
    // Office document formats (preview not available)
    case "doc": case "docx": case "xls": case "xlsx": case "ppt": case "pptx":
      return (
        <div style={{
          padding: 20,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: 24,
            fontWeight: 500
          }}>
            {file.name}
          </div>
          <div style={{
            fontSize: 16,
            color: 'var(--color-muted)'
          }}>
            {fileExt.toUpperCase()} file preview not available in-browser
          </div>
          {isElectron ? (
            <button 
              className="btn"
              onClick={() => {
                if (window.electronAPI?.showItemInFolder && file.path) {
                  window.electronAPI.showItemInFolder(file.path);
                }
              }}
            >
              Show in folder
            </button>
          ) : (
            <a 
              href={fileSource} 
              download={file.name}
              className="btn"
            >
              Download file
            </a>
          )}
        </div>
      );

    // Default file handler
    default:
      // If we have content, treat as text
      if (file.content !== undefined) {
        return renderTextEditor();
      }
      
      // Otherwise show a generic file info page
      return (
        <div style={{
          padding: 20,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: 24,
            fontWeight: 500
          }}>
            {file.name}
          </div>
          <div style={{
            fontSize: 16,
            color: 'var(--color-muted)'
          }}>
            Preview not available for this file type
          </div>
          <div style={{
            display: 'flex',
            gap: 12
          }}>
            <a 
              href={fileSource} 
              download={file.name}
              className="btn"
              target="_blank"
              rel="noreferrer"
            >
              {isElectron ? 'Open file' : 'Download file'}
            </a>
            {isElectron && file.path && (
              <button 
                className="btn"
                onClick={() => {
                  if (window.electronAPI?.showItemInFolder) {
                    window.electronAPI.showItemInFolder(file.path);
                  }
                }}
              >
                Show in folder
              </button>
            )}
          </div>
        </div>
      );
  }
}
