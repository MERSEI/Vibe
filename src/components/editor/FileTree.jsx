/**
 * FileTree Component
 *
 * Hierarchical file browser with expand/collapse and dependency graph:
 * - →N badge: file imports N project files
 * - ←M badge: file is imported by M project files
 * - Click badge to expand inline dep viewer (navigate by clicking dep names)
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

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

// ── Dependency helpers ──────────────────────────────────────────────────────

function flattenFiles(tree, prefix = '') {
  const result = {};
  for (const [name, item] of Object.entries(tree)) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (item.type === 'file') {
      result[path] = item.content || '';
    } else if (item.type === 'folder' && item.children) {
      Object.assign(result, flattenFiles(item.children, path));
    }
  }
  return result;
}

function parseImports(content) {
  const imports = [];
  // ES import: import ... from './foo'  /  import './foo'
  // dynamic: import('./foo')
  // require: require('./foo')
  const re = /(?:import\s+(?:[\s\S]*?\s+from\s+)?|require\s*\(\s*)['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    imports.push(m[1]);
  }
  return imports;
}

function resolveImport(fromFile, importPath, allFiles) {
  const dir = fromFile.split('/').slice(0, -1).join('/');
  const joined = dir ? `${dir}/${importPath}` : importPath;
  const parts = joined.split('/');
  const normalized = [];
  for (const p of parts) {
    if (p === '..') normalized.pop();
    else if (p !== '.') normalized.push(p);
  }
  const base = normalized.join('/');
  for (const ext of ['', '.js', '.jsx', '.ts', '.tsx', '.json']) {
    if (allFiles[base + ext] !== undefined) return base + ext;
  }
  return null;
}

function buildDepGraph(files) {
  const allFiles = flattenFiles(files);
  const imports = {};    // path → paths it imports
  const importedBy = {}; // path → paths that import it

  for (const [path, content] of Object.entries(allFiles)) {
    const ext = path.split('.').pop();
    if (!['js', 'jsx', 'ts', 'tsx'].includes(ext)) continue;

    const rawImports = parseImports(content);
    const resolved = rawImports
      .map(imp => resolveImport(path, imp, allFiles))
      .filter(Boolean);

    imports[path] = resolved;
    for (const dep of resolved) {
      if (!importedBy[dep]) importedBy[dep] = [];
      if (!importedBy[dep].includes(path)) importedBy[dep].push(path);
    }
  }

  return { imports, importedBy };
}

// ── Main component ──────────────────────────────────────────────────────────

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
  const [newFileState, setNewFileState] = useState({ folder: null, name: '' });
  const [newFolderState, setNewFolderState] = useState({ active: false, name: '' });
  const [renamingPath, setRenamingPath] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedDeps, setExpandedDeps] = useState(new Set());
  const newFileInputRef = useRef(null);
  const newFolderInputRef = useRef(null);
  const renameInputRef = useRef(null);

  // Build dependency graph whenever files change
  const depGraph = useMemo(() => buildDepGraph(files), [files]);

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

  const toggleDeps = useCallback((path, e) => {
    e.stopPropagation();
    setExpandedDeps(prev => {
      const s = new Set(prev);
      s.has(path) ? s.delete(path) : s.add(path);
      return s;
    });
  }, []);

  useEffect(() => {
    if (newFileState.folder !== null && newFileInputRef.current) {
      newFileInputRef.current.focus();
    }
  }, [newFileState.folder]);

  useEffect(() => {
    if (newFolderState.active && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [newFolderState.active]);

  useEffect(() => {
    if (renamingPath !== null && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingPath]);

  const startNewFile = useCallback((folder) => {
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

  const depItemClass = `cursor-pointer text-xs py-0.5 px-1 rounded truncate max-w-full transition-colors ${
    theme === 'dark'
      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
  }`;

  const renderTree = (items, path = '') => {
    const entries = Object.entries(items);
    const result = [];

    entries.forEach(([name, item]) => {
      const fullPath = path ? `${path}/${name}` : name;
      const isFolder = item.type === 'folder';
      const isSelected = selectedFile === fullPath;
      const isExpand = expanded[fullPath];
      const depth = fullPath.split('/').length - 1;
      const isRenaming = renamingPath === fullPath;

      // Dependency info for this file
      const fileImports = (!isFolder && depGraph.imports[fullPath]) || [];
      const fileImportedBy = (!isFolder && depGraph.importedBy[fullPath]) || [];
      const hasDeps = fileImports.length > 0 || fileImportedBy.length > 0;
      const depsOpen = expandedDeps.has(fullPath);

      result.push(
        <div key={fullPath}>
          {/* File / folder row */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer text-sm transition-all group ${
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
            {isFolder && (
              <span className={`text-xs transition-transform ${isExpand ? 'rotate-90' : ''}`}>
                ▶
              </span>
            )}

            <span className="text-sm shrink-0">
              {isFolder ? (isExpand ? '📂' : '📁') : getFileIcon(name)}
            </span>

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
                className="truncate flex-1 min-w-0"
                onDoubleClick={(e) => { e.stopPropagation(); startRename(fullPath); }}
              >
                {name}
              </span>
            )}

            {/* Dependency badge — shown when file has imports or importedBy */}
            {!isFolder && !isRenaming && hasDeps && (
              <button
                onClick={(e) => toggleDeps(fullPath, e)}
                title={`${fileImports.length} import${fileImports.length !== 1 ? 's' : ''}, used by ${fileImportedBy.length}`}
                className={`shrink-0 flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  depsOpen
                    ? 'bg-purple-600/30 text-purple-300'
                    : theme === 'dark'
                      ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                }`}
              >
                {fileImports.length > 0 && (
                  <span className="text-blue-400">→{fileImports.length}</span>
                )}
                {fileImports.length > 0 && fileImportedBy.length > 0 && (
                  <span className={theme === 'dark' ? 'text-slate-600' : 'text-gray-300'}>·</span>
                )}
                {fileImportedBy.length > 0 && (
                  <span className="text-emerald-400">←{fileImportedBy.length}</span>
                )}
              </button>
            )}

            {/* Hover actions */}
            {!isRenaming && (
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0">
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

          {/* Inline dependency viewer */}
          {!isFolder && depsOpen && hasDeps && (
            <div
              className={`py-1 border-l-2 ml-4 ${
                theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
              }`}
              style={{ paddingLeft: `${depth * 12 + 16}px` }}
            >
              {fileImports.length > 0 && (
                <div className="mb-1">
                  <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 px-1 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
                  }`}>
                    imports
                  </div>
                  {fileImports.map(dep => (
                    <div
                      key={dep}
                      onClick={() => onSelect(dep)}
                      className={depItemClass}
                      title={dep}
                    >
                      <span className="text-blue-400 mr-1">→</span>
                      {dep.split('/').pop()}
                      <span className={`ml-1 text-[10px] ${theme === 'dark' ? 'text-slate-600' : 'text-gray-400'}`}>
                        {dep.split('/').slice(0, -1).join('/')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {fileImportedBy.length > 0 && (
                <div>
                  <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 px-1 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
                  }`}>
                    used by
                  </div>
                  {fileImportedBy.map(dep => (
                    <div
                      key={dep}
                      onClick={() => onSelect(dep)}
                      className={depItemClass}
                      title={dep}
                    >
                      <span className="text-emerald-400 mr-1">←</span>
                      {dep.split('/').pop()}
                      <span className={`ml-1 text-[10px] ${theme === 'dark' ? 'text-slate-600' : 'text-gray-400'}`}>
                        {dep.split('/').slice(0, -1).join('/')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Render children if folder is expanded */}
          {isFolder && isExpand && item.children && (
            <div>
              {renderTree(item.children, fullPath)}
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
            onClick={() => setNewFolderState({ active: true, name: '' })}
            className={`p-1 rounded text-xs ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
            title={t.newFolder}
          >
            📁+
          </button>
        </div>
      </div>

      {/* Inline new-file input at root level */}
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

      {/* Inline new-folder input at root level */}
      {newFolderState.active && (
        <div className={`flex items-center gap-2 px-2 py-1 border-b border-dashed ${theme === 'dark' ? 'border-slate-600' : 'border-gray-300'}`}>
          <span className="text-sm">📁</span>
          <input
            ref={newFolderInputRef}
            value={newFolderState.name}
            onChange={(e) => setNewFolderState(prev => ({ ...prev, name: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const n = newFolderState.name.trim();
                if (n) onNewFile?.(n, '.gitkeep');
                setNewFolderState({ active: false, name: '' });
              }
              if (e.key === 'Escape') setNewFolderState({ active: false, name: '' });
            }}
            onBlur={() => setNewFolderState({ active: false, name: '' })}
            placeholder="folder-name"
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
      <div className="fixed inset-0 z-40" onClick={onClose} />
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
