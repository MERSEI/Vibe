/**
 * FileTree Component
 *
 * Hierarchical file browser with expand/collapse
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

const FILE_ICONS = {
  js: '🟨',
  jsx: '🟨',
  ts: '🔷',
  tsx: '🔷',
  py: '🐍',
  yaml: '⚙️',
  yml: '⚙️',
  md: '📝',
  json: '📋',
  default: '📄',
};

export function FileTree({
  files,
  selectedFile,
  onSelect,
  onNewFile,
  onDelete,
  onRename,
  theme,
  t,
}) {
  const [expanded, setExpanded] = useState({ src: true, docs: true });
  const [contextMenu, setContextMenu] = useState(null);
  // { folder: string } — shows inline input inside that folder (null = hidden)
  const [newFileState, setNewFileState] = useState({ folder: null, name: '' });
  // path being renamed inline
  const [renamingPath, setRenamingPath] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const newFileInputRef = useRef(null);
  const renameInputRef = useRef(null);

  const toggleFolder = useCallback((path) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const handleContextMenu = useCallback((e, path, type) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path, type });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop();
    return FILE_ICONS[ext] || FILE_ICONS.default;
  };

  // Focus new-file input when it appears
  useEffect(() => {
    if (newFileState.folder !== null && newFileInputRef.current) {
      newFileInputRef.current.focus();
    }
  }, [newFileState.folder]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingPath !== null && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingPath]);

  const startNewFile = useCallback((folder) => {
    // expand the folder
    setExpanded(prev => ({ ...prev, [folder]: true }));
    setNewFileState({ folder, name: '' });
  }, []);

  const commitNewFile = useCallback(() => {
    const name = newFileState.name.trim();
    if (name && onNewFile) {
      onNewFile(newFileState.folder, name);
    }
    setNewFileState({ folder: null, name: '' });
  }, [newFileState, onNewFile]);

  const cancelNewFile = useCallback(() => {
    setNewFileState({ folder: null, name: '' });
  }, []);

  const startRename = useCallback((path) => {
    const parts = path.split('/');
    setRenameValue(parts[parts.length - 1]);
    setRenamingPath(path);
  }, []);

  const commitRename = useCallback(() => {
    const newName = renameValue.trim();
    if (newName && renamingPath && onRename) {
      onRename(renamingPath, newName);
    }
    setRenamingPath(null);
    setRenameValue('');
  }, [renameValue, renamingPath, onRename]);

  const inputClass = `flex-1 px-1 py-0 text-sm rounded border outline-none ${
    theme === 'dark'
      ? 'bg-slate-700 border-purple-500 text-slate-200'
      : 'bg-white border-purple-400 text-gray-800'
  }`;

  const renderTree = (items, path = '') => {
    const entries = Object.entries(items);
    const result = [];

    entries.forEach(([name, item]) => {
      const fullPath = path ? `${path}/${name}` : name;
      const isFolder = item.type === 'folder';
      const isSelected = selectedFile === fullPath;
      const isExpanded = expanded[fullPath];
      const depth = fullPath.split('/').length - 1;
      const isRenaming = renamingPath === fullPath;

      result.push(
        <div key={fullPath}>
          <div
            className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer text-sm transition-all group ${
              isSelected
                ? theme === 'dark'
                  ? 'bg-purple-600/30 text-purple-200'
                  : 'bg-purple-100 text-purple-800'
                : theme === 'dark'
                  ? 'hover:bg-slate-800/50 text-slate-300'
                  : 'hover:bg-gray-100 text-gray-700'
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => isFolder ? toggleFolder(fullPath) : onSelect(fullPath)}
            onContextMenu={(e) => handleContextMenu(e, fullPath, item.type)}
          >
            {/* Expand/collapse icon for folders */}
            {isFolder && (
              <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
            )}

            {/* File/folder icon */}
            <span className="text-sm">
              {isFolder ? (isExpanded ? '📂' : '📁') : getFileIcon(name)}
            </span>

            {/* Name or inline rename input */}
            {isRenaming ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') { setRenamingPath(null); setRenameValue(''); }
                }}
                onBlur={commitRename}
                onClick={(e) => e.stopPropagation()}
                className={inputClass}
              />
            ) : (
              <span
                className="truncate flex-1"
                onDoubleClick={(e) => { e.stopPropagation(); startRename(fullPath); }}
              >
                {name}
              </span>
            )}

            {/* Actions (visible on hover) */}
            {!isRenaming && (
              <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                {isFolder && (
                  <button
                    className={`p-0.5 rounded text-xs ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                    onClick={(e) => { e.stopPropagation(); startNewFile(fullPath); }}
                    title={t.newFile}
                  >
                    📄+
                  </button>
                )}
                {!isFolder && (
                  <button
                    className={`p-0.5 rounded ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(fullPath);
                    }}
                    title={t.delete}
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Render children if folder is expanded */}
          {isFolder && isExpanded && item.children && (
            <div>
              {renderTree(item.children, fullPath)}
              {/* Inline new-file input inside this folder */}
              {newFileState.folder === fullPath && (
                <div
                  className="flex items-center gap-2 px-2 py-1"
                  style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
                >
                  <span className="text-sm">📄</span>
                  <input
                    ref={newFileInputRef}
                    value={newFileState.name}
                    onChange={(e) => setNewFileState(prev => ({ ...prev, name: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitNewFile();
                      if (e.key === 'Escape') cancelNewFile();
                    }}
                    onBlur={commitNewFile}
                    placeholder="filename.js"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      );
    });

    return result;
  };

  return (
    <div
      className={`h-full flex flex-col ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50'}`}
      onClick={closeContextMenu}
    >
      {/* Header */}
      <div className={`p-3 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'} flex items-center justify-between`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
          {t.files}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => startNewFile('src')}
            className={`p-1 rounded text-xs ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
            title={t.newFile}
          >
            📄+
          </button>
          <button
            onClick={() => {
              const name = window.prompt('Folder name:');
              if (name?.trim()) onNewFile?.('', name.trim() + '/.gitkeep');
            }}
            className={`p-1 rounded text-xs ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
            title={t.newFolder}
          >
            📁+
          </button>
        </div>
      </div>

      {/* Inline new-file input at root level (when folder = '') */}
      {newFileState.folder === '' && (
        <div className="flex items-center gap-2 px-2 py-1 border-b border-dashed border-slate-600">
          <span className="text-sm">📄</span>
          <input
            ref={newFileInputRef}
            value={newFileState.name}
            onChange={(e) => setNewFileState(prev => ({ ...prev, name: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitNewFile();
              if (e.key === 'Escape') cancelNewFile();
            }}
            onBlur={commitNewFile}
            placeholder="filename.js"
            className={inputClass}
          />
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-auto p-2">
        {renderTree(files)}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          onClose={closeContextMenu}
          onRename={() => {
            startRename(contextMenu.path);
            closeContextMenu();
          }}
          onDelete={() => {
            onDelete?.(contextMenu.path);
            closeContextMenu();
          }}
          onDuplicate={() => {
            // Handle duplicate
            closeContextMenu();
          }}
          theme={theme}
          t={t}
        />
      )}
    </div>
  );
}

function ContextMenu({ x, y, type, onClose, onRename, onDelete, onDuplicate, theme, t }) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div
        className={`fixed z-50 py-1 rounded-lg shadow-xl min-w-32 ${
          theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
        }`}
        style={{ left: x, top: y }}
      >
        <button
          className={`w-full px-3 py-1.5 text-left text-sm ${
            theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'
          }`}
          onClick={onRename}
        >
          ✏️ {t.rename}
        </button>
        <button
          className={`w-full px-3 py-1.5 text-left text-sm ${
            theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'
          }`}
          onClick={onDuplicate}
        >
          📋 {t.duplicate}
        </button>
        <div className={`my-1 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`} />
        <button
          className={`w-full px-3 py-1.5 text-left text-sm text-red-500 ${
            theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
          }`}
          onClick={onDelete}
        >
          🗑️ {t.delete}
        </button>
      </div>
    </>
  );
}
