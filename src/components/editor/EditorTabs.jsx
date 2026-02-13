/**
 * EditorTabs Component
 * 
 * Tab bar for open files
 */

import React from 'react';

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

export function EditorTabs({
  tabs,
  selectedTab,
  onSelect,
  onClose,
  theme,
}) {
  const borderClass = theme === 'dark' ? 'border-slate-800' : 'border-gray-200';
  const bgClass = theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50';

  const getIcon = (filename) => {
    const ext = filename.split('.').pop();
    return FILE_ICONS[ext] || FILE_ICONS.default;
  };

  return (
    <div className={`h-9 border-b ${borderClass} flex items-center px-2 gap-1 ${bgClass} overflow-x-auto`}>
      {tabs.map(tab => {
        const filename = tab.split('/').pop();
        const isSelected = selectedTab === tab;

        return (
          <div
            key={tab}
            onClick={() => onSelect(tab)}
            className={`h-7 px-3 rounded-t flex items-center gap-2 text-xs cursor-pointer transition-all group flex-shrink-0 ${
              isSelected
                ? theme === 'dark'
                  ? 'bg-slate-800 text-white border-t border-x border-purple-500/50'
                  : 'bg-white text-gray-800 border-t border-x border-purple-300'
                : theme === 'dark'
                  ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-sm">{getIcon(filename)}</span>
            <span className="max-w-24 truncate">{filename}</span>
            
            {/* Close button */}
            <button
              onClick={(e) => onClose(tab, e)}
              className={`ml-1 w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                theme === 'dark'
                  ? 'hover:bg-slate-600 text-slate-400 hover:text-white'
                  : 'hover:bg-gray-300 text-gray-400 hover:text-gray-700'
              }`}
            >
              ×
            </button>
          </div>
        );
      })}

      {/* New tab button */}
      <button
        className={`h-7 w-7 rounded flex items-center justify-center text-lg ${
          theme === 'dark'
            ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title="New file"
      >
        +
      </button>
    </div>
  );
}
