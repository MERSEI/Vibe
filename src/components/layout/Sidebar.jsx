/**
 * Sidebar Component
 * 
 * Left navigation with tab icons
 */

import React from 'react';

const SIDEBAR_TABS = [
  { id: 'editor', icon: '📝', label: 'editor' },
  { id: 'agents', icon: '🤖', label: 'agents' },
  { id: 'rag', icon: '🔍', label: 'rag' },
  { id: 'debug', icon: '🐛', label: 'debug' },
];

export function Sidebar({
  theme,
  t,
  activeTab,
  onTabChange,
  onToggleEventBus,
  showEventBus,
}) {
  const borderClass = theme === 'dark' ? 'border-slate-800' : 'border-gray-200';
  const bgClass = theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50';

  return (
    <aside className={`w-12 border-r ${borderClass} flex flex-col items-center py-2 gap-1 ${bgClass}`}>
      {/* Main tabs */}
      {SIDEBAR_TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
            activeTab === tab.id
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
              : theme === 'dark'
                ? 'hover:bg-slate-800 text-slate-400'
                : 'hover:bg-gray-200 text-gray-500'
          }`}
          title={t[tab.label]}
        >
          {tab.icon}
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Event Bus toggle */}
      <button
        onClick={onToggleEventBus}
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
          showEventBus
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
            : theme === 'dark'
              ? 'hover:bg-slate-800 text-slate-400'
              : 'hover:bg-gray-200 text-gray-500'
        }`}
        title={t.eventBus}
      >
        📡
      </button>

      {/* Settings */}
      <button
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
          theme === 'dark'
            ? 'hover:bg-slate-800 text-slate-400'
            : 'hover:bg-gray-200 text-gray-500'
        }`}
        title={t.settings}
      >
        ⚙️
      </button>
    </aside>
  );
}
