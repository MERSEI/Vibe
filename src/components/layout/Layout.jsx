/**
 * Layout Component
 *
 * Main application shell with header, sidebar, and footer
 */

import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { THEME_CONFIG } from '../../utils/constants';
import { EventBusInspector } from '../debug/EventBusInspector';

export function Layout({
  children,
  theme,
  lang,
  t,
  activeTab,
  onTabChange,
  onToggleTheme,
  onToggleLang,
  onToggleEventBus,
  showEventBus,
  collaborators,
  selectedFile,
  fileLanguage,
}) {
  const themeClasses = THEME_CONFIG[theme];

  return (
    <div className={`h-screen flex flex-col ${themeClasses.bg} ${themeClasses.text}`}>
      <Header
        theme={theme}
        lang={lang}
        t={t}
        onToggleTheme={onToggleTheme}
        onToggleLang={onToggleLang}
        collaborators={collaborators}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar
          theme={theme}
          t={t}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onToggleEventBus={onToggleEventBus}
          showEventBus={showEventBus}
        />

        <main className="flex-1 flex overflow-hidden min-h-0">
          {children}
        </main>
      </div>

      {showEventBus && (
        <div className={`shrink-0 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
          <EventBusInspector theme={theme} t={t} />
        </div>
      )}

      <StatusBar
        theme={theme}
        t={t}
        selectedFile={selectedFile}
        fileLanguage={fileLanguage}
      />
    </div>
  );
}
