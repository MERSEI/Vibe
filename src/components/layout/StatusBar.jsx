/**
 * StatusBar Component
 * 
 * Bottom status bar with file info and shortcuts
 */

import React from 'react';

export function StatusBar({
  theme,
  t,
  selectedFile,
  fileLanguage,
  cursorPosition = { line: 1, col: 1 },
  isConnected = true,
}) {
  const borderClass = theme === 'dark' ? 'border-slate-800' : 'border-gray-200';
  const bgClass = theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50';
  const textClass = theme === 'dark' ? 'text-slate-400' : 'text-gray-500';

  return (
    <footer className={`h-6 border-t ${borderClass} flex items-center justify-between px-4 text-xs ${bgClass} ${textClass}`}>
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <span className="flex items-center gap-1">
          <span className={isConnected ? 'text-green-500' : 'text-red-500'}>●</span>
          {isConnected ? t.connected : t.disconnected}
        </span>

        {/* Current file */}
        <span className="flex items-center gap-1">
          📄 {selectedFile}
        </span>

        {/* Language */}
        <span className="flex items-center gap-1">
          🔤 {fileLanguage}
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Shortcuts hint */}
        <span>⌘S {t.save}</span>
        <span>⌘R {t.run}</span>

        {/* Cursor position */}
        <span>
          Ln {cursorPosition.line}, Col {cursorPosition.col}
        </span>
      </div>
    </footer>
  );
}
