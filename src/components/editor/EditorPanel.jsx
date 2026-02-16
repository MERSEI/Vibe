/**
 * EditorPanel Component
 * 
 * Main editor panel with file tree, code editor, and preview
 */

import React from 'react';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { EditorTabs } from './EditorTabs';
import { LivePreview } from './LivePreview';
import { EventBusInspector } from '../debug/EventBusInspector';

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
  showEventBus,
  theme,
  t,
}) {
  const borderClass = theme === 'dark' ? 'border-slate-800' : 'border-gray-200';
  const content = getFileContent(selectedFile);
  const language = getFileLanguage(selectedFile);

  const handleNewFile = (folderPath, fileName) => {
    if (!fileName?.trim()) return;
    createFile?.(folderPath, fileName, '');
    const newPath = folderPath ? `${folderPath}/${fileName}` : fileName;
    onSelectFile?.(newPath);
  };

  return (
    <>
      {/* File Tree */}
      <div className={`w-56 border-r ${borderClass} flex-shrink-0`}>
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
        {/* Tabs */}
        <EditorTabs
          tabs={openTabs}
          selectedTab={selectedFile}
          onSelect={onSelectFile}
          onClose={onCloseTab}
          theme={theme}
        />

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
          <div className={`w-80 border-l ${borderClass} flex-shrink-0`}>
            <LivePreview
              code={content}
              language={language}
              theme={theme}
              t={t}
            />
          </div>
        </div>

        {/* Event Bus (collapsible) */}
        {showEventBus && (
          <div className={`border-t ${borderClass}`}>
            <EventBusInspector theme={theme} t={t} />
          </div>
        )}
      </div>
    </>
  );
}
