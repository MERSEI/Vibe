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

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          theme={theme}
          t={t}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onToggleEventBus={onToggleEventBus}
          showEventBus={showEventBus}
        />

        <main className="flex-1 flex overflow-hidden">
          {children}
        </main>
      </div>

      <StatusBar
        theme={theme}
        t={t}
        selectedFile={selectedFile}
        fileLanguage={fileLanguage}
      />
    </div>
  );
}
