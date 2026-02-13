/**
 * FileTree Component
 * 
 * Hierarchical file browser with expand/collapse
 */

import React, { useState, useCallback } from 'react';

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

  const renderTree = (items, path = '') => {
    return Object.entries(items).map(([name, item]) => {
      const fullPath = path ? `${path}/${name}` : name;
      const isFolder = item.type === 'folder';
      const isSelected = selectedFile === fullPath;
      const isExpanded = expanded[fullPath];
      const depth = fullPath.split('/').length - 1;

      return (
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

            {/* Name */}
            <span className="truncate flex-1">{name}</span>

            {/* Actions (visible on hover) */}
            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
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
          </div>

          {/* Render children if folder is expanded */}
          {isFolder && isExpanded && item.children && (
            <div>{renderTree(item.children, fullPath)}</div>
          )}
        </div>
      );
    });
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
            onClick={() => onNewFile?.('src', 'new-file.js')}
            className={`p-1 rounded text-xs ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
            title={t.newFile}
          >
            📄+
          </button>
          <button
            className={`p-1 rounded text-xs ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
            title={t.newFolder}
          >
            📁+
          </button>
        </div>
      </div>

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
            onRename?.(contextMenu.path);
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
