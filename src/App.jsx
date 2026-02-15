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
import { VibeClerkProvider, useVibeUser } from './api/clerk/provider';
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
  const { name, avatar } = useVibeUser();

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
  } = useFileSystem();

  // Local UI state
  const [activeTab, setActiveTab] = React.useState('editor');
  const [toast, setToast] = React.useState(null);
  const [showEventBus, setShowEventBus] = React.useState(false);

  // Demo state
  const [showSplash, setShowSplash] = useState(true);
  const [showShowcase, setShowShowcase] = useState(false);

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

  // Render active panel based on tab
  const renderActivePanel = () => {
    switch (activeTab) {
      case 'editor':
        return (
          <EditorPanel
            files={files}
            selectedFile={selectedFile}
            openTabs={openTabs}
            onSelectFile={selectFile}
            onCloseTab={closeTab}
            onUpdateFile={updateFile}
            getFileContent={getFileContent}
            getFileLanguage={getFileLanguage}
            collaborators={collaborators}
            showEventBus={showEventBus}
            theme={theme}
            t={t}
          />
        );
      case 'agents':
        return (
          <Suspense fallback={<PanelLoader />}>
            <AgentBuilder theme={theme} t={t} />
          </Suspense>
        );
      case 'rag':
        return (
          <Suspense fallback={<PanelLoader />}>
            <RAGPlayground theme={theme} t={t} />
          </Suspense>
        );
      case 'debug':
        return (
          <Suspense fallback={<PanelLoader />}>
            <DebugViewer theme={theme} t={t} />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <RoomProvider id="vibe-ide-demo" initialPresence={{ name, avatar, cursor: null }}>
    <ErrorBoundary theme={theme}>
      {/* Cinematic splash screen — shown on first load */}
      {showSplash && (
        <SplashScreen
          lang={lang}
          t={t}
          onStart={() => {
            setShowSplash(false);
            setShowShowcase(true);
          }}
        />
      )}

      <Layout
        theme={theme}
        lang={lang}
        t={t}
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
        <ErrorBoundary theme={theme}>{renderActivePanel()}</ErrorBoundary>
      </Layout>

      {/* Floating demo tour button — visible after splash is dismissed */}
      {!showSplash && !showShowcase && (
        <DemoTourButton onClick={() => setShowShowcase(true)} />
      )}

      {/* Interactive showcase panel */}
      {showShowcase && (
        <InteractiveShowcase
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={() => setShowShowcase(false)}
        />
      )}
    </ErrorBoundary>
    </RoomProvider>
  );
}
