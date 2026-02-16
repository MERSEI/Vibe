/**
 * EditorPanel Component
 *
 * Main editor panel with file tree, code editor, and preview
 */

import React, { useState } from 'react';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { EditorTabs } from './EditorTabs';
import { LivePreview } from './LivePreview';

export function EditorPanel({
  files,
  selectedFile,
  openTabs,
  onSelectFile,
  onCloseTab,
  onUpdateFile,
  getFileContent,
  getFileLanguage,
  createFile,
  deleteFile,
  renameFile,
  collaborators,
  theme,
  t,
}) {
  const borderClass = theme === 'dark' ? 'border-slate-800' : 'border-gray-200';
  const content = getFileContent(selectedFile);
  const language = getFileLanguage(selectedFile);

  const [showFileTree, setShowFileTree] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [showPreview, setShowPreview] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  const handleNewFile = (folderPath, fileName) => {
    if (!fileName?.trim()) return;
    createFile?.(folderPath, fileName, '');
    if (fileName !== '.gitkeep') {
      const newPath = folderPath ? `${folderPath}/${fileName}` : fileName;
      onSelectFile?.(newPath);
    }
  };

  const toggleBtnClass = (active) =>
    `p-1 rounded text-xs transition-colors ${
      active
        ? 'bg-purple-600/20 text-purple-400'
        : theme === 'dark'
          ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
    }`;

  const handleDownload = () => {
    if (!selectedFile || !content) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.split('/').pop();
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* File Tree */}
      <div
        className={`border-r ${borderClass} flex-shrink-0 transition-all duration-200 overflow-hidden ${
          showFileTree ? 'w-56' : 'w-0'
        }`}
      >
        <FileTree
          files={files}
          selectedFile={selectedFile}
          onSelect={onSelectFile}
          onNewFile={handleNewFile}
          onDelete={deleteFile}
          onRename={renameFile}
          theme={theme}
          t={t}
        />
      </div>

      {/* Editor + Preview */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tabs row + panel toggles */}
        <div className={`flex items-center border-b ${borderClass} min-w-0`}>
          <div className="flex items-center gap-1 px-2 shrink-0">
            <button
              onClick={() => setShowFileTree(!showFileTree)}
              className={toggleBtnClass(showFileTree)}
              title="Toggle file tree"
            >
              📁
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={toggleBtnClass(showPreview)}
              title="Toggle preview"
            >
              👁
            </button>
            <button
              onClick={handleDownload}
              className={toggleBtnClass(false)}
              title="Download file"
            >
              ⬇
            </button>
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <EditorTabs
              tabs={openTabs}
              selectedTab={selectedFile}
              onSelect={onSelectFile}
              onClose={onCloseTab}
              theme={theme}
            />
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 flex min-h-0">
          {/* Code Editor */}
          <div className="flex-1 min-w-0">
            <CodeEditor
              key={selectedFile}
              fileKey={selectedFile}
              content={content}
              onChange={(newContent) => onUpdateFile(selectedFile, newContent)}
              language={language}
              theme={theme}
              collaborators={collaborators}
            />
          </div>

          {/* Preview Panel */}
          <div
            className={`border-l ${borderClass} flex-shrink-0 transition-all duration-200 overflow-hidden ${
              showPreview ? 'w-80' : 'w-0'
            }`}
          >
            <LivePreview
              code={content}
              language={language}
              theme={theme}
              t={t}
            />
          </div>
        </div>
      </div>
    </>
  );
}
