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
    <footer className={`h-6 border-t ${borderClass} flex items-center justify-between px-3 sm:px-4 text-xs ${bgClass} ${textClass}`}>
      {/* Left section */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Connection status */}
        <span className="flex items-center gap-1">
          <span className={isConnected ? 'text-green-500' : 'text-red-500'}>●</span>
          <span className="hidden sm:inline">{isConnected ? t.connected : t.disconnected}</span>
        </span>

        {/* Current file */}
        <span className="flex items-center gap-1 truncate max-w-[8rem] sm:max-w-none">
          📄 {selectedFile}
        </span>

        {/* Language — hidden on mobile */}
        <span className="hidden sm:flex items-center gap-1">
          🔤 {fileLanguage}
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Shortcuts hint — hidden on mobile */}
        <span className="hidden sm:inline">⌘S {t.save}</span>
        <span className="hidden sm:inline">⌘R {t.run}</span>

        {/* Cursor position — hidden on mobile */}
        <span className="hidden sm:inline">
          Ln {cursorPosition.line}, Col {cursorPosition.col}
        </span>
      </div>
    </footer>
  );
}
