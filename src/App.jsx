/**
 * Vibe IDE - Main Application Entry Point
 *
 * AI-Powered Development Environment with:
 * - Monaco-style code editor
 * - Real-time CRDT collaboration
 * - AI Agent orchestration
 * - RAG pipeline integration
 * - OpenTelemetry tracing
 *
 * Production features:
 * - Zustand global state management (Phase 1.4)
 * - React.lazy code splitting (Phase 5.4)
 * - Error Boundaries (Phase 4.4)
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { RoomProvider } from './api/liveblocks/config';
import { VibeClerkProvider, useVibeUser, isClerkEnabled, ClerkSignInScreen } from './api/clerk/provider';
import { Layout } from './components/layout/Layout';
import { EditorPanel } from './components/editor/EditorPanel';
import { Toast } from './components/common/index';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Spinner } from './components/common/index';
import { SplashScreen } from './components/demo/SplashScreen';
import { InteractiveShowcase } from './components/demo/InteractiveShowcase';
import { DemoTourButton } from './components/demo/DemoTourButton';
import {
  useTheme,
  useI18n,
  useCollaborators,
  useKeyboardShortcuts,
  useFileSystem,
} from './hooks/index';

// Lazy-loaded panels (Phase 5.4 — code splitting)
const AgentBuilder = lazy(() =>
  import('./components/agents/AgentBuilder').then((m) => ({
    default: m.AgentBuilder,
  }))
);
const RAGPlayground = lazy(() =>
  import('./components/rag/RAGPlayground').then((m) => ({
    default: m.RAGPlayground,
  }))
);
const DebugViewer = lazy(() =>
  import('./components/debug/DebugViewer').then((m) => ({
    default: m.DebugViewer,
  }))
);

// Lazy loading fallback
function PanelLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="text-purple-400" />
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    </div>
  );
}

// Shell: wraps everything in VibeClerkProvider so useVibeUser() works inside
export default function VibeIDE() {
  return (
    <VibeClerkProvider>
      <VibeIDEInner />
    </VibeClerkProvider>
  );
}

// Inner component: can safely call useVibeUser() (inside VibeClerkProvider)
function VibeIDEInner() {
  // Clerk / guest user data
  const { name, avatar, isSignedIn } = useVibeUser();

  // Hooks
  const { theme, toggleTheme } = useTheme();
  const { lang, t, toggleLang } = useI18n();
  const { collaborators } = useCollaborators();
  const {
    files,
    selectedFile,
    openTabs,
    selectFile,
    closeTab,
    updateFile,
    getFileContent,
    getFileLanguage,
    createFile,
    deleteFile,
    renameFile,
  } = useFileSystem();

  // Local UI state
  const [activeTab, setActiveTab] = React.useState('editor');
  const [visitedTabs, setVisitedTabs] = React.useState(new Set(['editor']));
  const [toast, setToast] = React.useState(null);
  const [showEventBus, setShowEventBus] = React.useState(false);

  // Demo state
  const [showSplash, setShowSplash] = useState(true);
  const [showShowcase, setShowShowcase] = useState(false);

  // Track visited tabs for mount-once pattern
  const handleTabChange = React.useCallback((tab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: () => setToast({ message: t.fileSaved, type: 'success' }),
    onRun: () => setToast({ message: t.codeExecuted, type: 'info' }),
  });

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Flow: Splash → Clerk SignIn (if enabled & not signed in) → IDE
  if (showSplash) {
    return (
      <SplashScreen
        lang={lang}
        t={t}
        onStart={() => {
          setShowSplash(false);
          setShowShowcase(true);
        }}
      />
    );
  }

  // Clerk auth gate: after splash, before IDE
  if (isClerkEnabled && !isSignedIn) {
    return <ClerkSignInScreen />;
  }

  return (
    <RoomProvider id="vibe-ide-demo" initialPresence={{ name, avatar, cursor: null }}>
    <ErrorBoundary theme={theme}>
      <Layout
        theme={theme}
        lang={lang}
        t={t}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onToggleTheme={toggleTheme}
        onToggleLang={toggleLang}
        onToggleEventBus={() => setShowEventBus(!showEventBus)}
        showEventBus={showEventBus}
        collaborators={collaborators}
        selectedFile={selectedFile}
        fileLanguage={getFileLanguage(selectedFile)}
      >
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Mount-once, hide/show pattern — preserves state across tab switches */}
        <ErrorBoundary theme={theme}>
          <div className={`flex-1 flex overflow-hidden ${activeTab === 'editor' ? '' : 'hidden'}`}>
            <EditorPanel
              files={files}
              selectedFile={selectedFile}
              openTabs={openTabs}
              onSelectFile={selectFile}
              onCloseTab={closeTab}
              onUpdateFile={updateFile}
              getFileContent={getFileContent}
              getFileLanguage={getFileLanguage}
              createFile={createFile}
              deleteFile={deleteFile}
              renameFile={renameFile}
              collaborators={collaborators}
              theme={theme}
              t={t}
            />
          </div>

          {visitedTabs.has('agents') && (
            <div className={`flex-1 flex overflow-hidden ${activeTab === 'agents' ? '' : 'hidden'}`}>
              <Suspense fallback={<PanelLoader />}>
                <AgentBuilder
                  theme={theme}
                  t={t}
                  createFile={createFile}
                  selectFile={selectFile}
                  files={files}
                  getFileContent={getFileContent}
                  updateFile={updateFile}
                  selectedFile={selectedFile}
                />
              </Suspense>
            </div>
          )}

          {visitedTabs.has('rag') && (
            <div className={`flex-1 flex overflow-hidden ${activeTab === 'rag' ? '' : 'hidden'}`}>
              <Suspense fallback={<PanelLoader />}>
                <RAGPlayground theme={theme} t={t} />
              </Suspense>
            </div>
          )}

          {visitedTabs.has('debug') && (
            <div className={`flex-1 flex overflow-hidden ${activeTab === 'debug' ? '' : 'hidden'}`}>
              <Suspense fallback={<PanelLoader />}>
                <DebugViewer theme={theme} t={t} />
              </Suspense>
            </div>
          )}
        </ErrorBoundary>
      </Layout>

      {/* Floating demo tour button — visible after splash is dismissed */}
      {!showSplash && !showShowcase && (
        <DemoTourButton onClick={() => setShowShowcase(true)} />
      )}

      {/* Interactive showcase panel */}
      {showShowcase && (
        <InteractiveShowcase
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onClose={() => setShowShowcase(false)}
        />
      )}
    </ErrorBoundary>
    </RoomProvider>
  );
}
