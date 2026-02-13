import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useUIStore,
  useThemeStore,
  useI18nStore,
  useFileStore,
  useCollaboratorStore,
  useTranslations,
} from '../../src/stores/index';

// Reset stores between tests
beforeEach(() => {
  useUIStore.setState({ activeTab: 'editor', showEventBus: false, toast: null });
  useThemeStore.setState({ theme: 'dark' });
  useI18nStore.setState({ lang: 'en' });
  useCollaboratorStore.setState({ collaborators: [], isConnected: false });
});

describe('useUIStore', () => {
  it('has correct initial state', () => {
    const state = useUIStore.getState();
    expect(state.activeTab).toBe('editor');
    expect(state.showEventBus).toBe(false);
    expect(state.toast).toBeNull();
  });

  it('setActiveTab changes the active tab', () => {
    useUIStore.getState().setActiveTab('agents');
    expect(useUIStore.getState().activeTab).toBe('agents');
  });

  it('toggleEventBus flips the flag', () => {
    expect(useUIStore.getState().showEventBus).toBe(false);
    useUIStore.getState().toggleEventBus();
    expect(useUIStore.getState().showEventBus).toBe(true);
    useUIStore.getState().toggleEventBus();
    expect(useUIStore.getState().showEventBus).toBe(false);
  });

  it('showToast sets message and type', () => {
    useUIStore.getState().showToast('Hello', 'success');
    const state = useUIStore.getState();
    expect(state.toast).toEqual({ message: 'Hello', type: 'success' });
  });

  it('showToast defaults to info type', () => {
    useUIStore.getState().showToast('Info msg');
    expect(useUIStore.getState().toast.type).toBe('info');
  });

  it('clearToast nullifies toast', () => {
    useUIStore.getState().showToast('msg');
    useUIStore.getState().clearToast();
    expect(useUIStore.getState().toast).toBeNull();
  });
});

describe('useThemeStore', () => {
  it('starts with dark theme', () => {
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('toggleTheme switches between dark and light', () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('setTheme sets a specific theme', () => {
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
  });
});

describe('useI18nStore', () => {
  it('starts with English', () => {
    expect(useI18nStore.getState().lang).toBe('en');
  });

  it('toggleLang switches between en and ru', () => {
    useI18nStore.getState().toggleLang();
    expect(useI18nStore.getState().lang).toBe('ru');
    useI18nStore.getState().toggleLang();
    expect(useI18nStore.getState().lang).toBe('en');
  });

  it('setLang sets a specific language', () => {
    useI18nStore.getState().setLang('ru');
    expect(useI18nStore.getState().lang).toBe('ru');
  });
});

describe('useFileStore', () => {
  it('has initial files and selected file', () => {
    const state = useFileStore.getState();
    expect(state.selectedFile).toBe('src/index.js');
    expect(state.openTabs).toContain('src/index.js');
    expect(state.files).toHaveProperty('src');
    expect(state.files).toHaveProperty('docs');
  });

  it('selectFile adds to tabs and sets selected', () => {
    useFileStore.getState().selectFile('src/agent.js');
    const state = useFileStore.getState();
    expect(state.selectedFile).toBe('src/agent.js');
    expect(state.openTabs).toContain('src/agent.js');
  });

  it('selectFile does not duplicate tabs', () => {
    useFileStore.getState().selectFile('src/index.js');
    const tabs = useFileStore.getState().openTabs.filter(
      (t) => t === 'src/index.js'
    );
    expect(tabs).toHaveLength(1);
  });

  it('closeTab removes from tabs', () => {
    useFileStore.getState().selectFile('src/agent.js');
    useFileStore.getState().closeTab('src/agent.js');
    expect(useFileStore.getState().openTabs).not.toContain('src/agent.js');
  });

  it('closeTab selects last tab when closing selected', () => {
    useFileStore.getState().selectFile('src/agent.js');
    useFileStore.getState().selectFile('src/config.yaml');
    useFileStore.getState().closeTab('src/config.yaml');
    expect(useFileStore.getState().selectedFile).toBe('src/agent.js');
  });

  it('getFileContent returns file content', () => {
    const content = useFileStore.getState().getFileContent('src/index.js');
    expect(content).toContain('Vibe IDE');
  });

  it('getFileContent returns empty string for missing file', () => {
    const content = useFileStore.getState().getFileContent('nonexistent.js');
    expect(content).toBe('');
  });

  it('getFileLanguage detects language from path', () => {
    expect(useFileStore.getState().getFileLanguage('src/index.js')).toBe('javascript');
    expect(useFileStore.getState().getFileLanguage('src/config.yaml')).toBe('yaml');
  });

  it('updateFile changes file content', () => {
    useFileStore.getState().updateFile('src/index.js', 'new content');
    expect(useFileStore.getState().getFileContent('src/index.js')).toBe('new content');
  });

  it('createFile adds a new file', () => {
    useFileStore.getState().createFile('src', 'test.js', 'console.log("test")');
    expect(useFileStore.getState().getFileContent('src/test.js')).toBe(
      'console.log("test")'
    );
  });

  it('deleteFile removes file and its tab', () => {
    useFileStore.getState().selectFile('src/agent.js');
    useFileStore.getState().deleteFile('src/agent.js');
    expect(useFileStore.getState().openTabs).not.toContain('src/agent.js');
    expect(useFileStore.getState().getFileContent('src/agent.js')).toBe('');
  });
});

describe('useCollaboratorStore', () => {
  it('starts empty and disconnected', () => {
    const state = useCollaboratorStore.getState();
    expect(state.collaborators).toHaveLength(0);
    expect(state.isConnected).toBe(false);
  });

  it('setConnected updates connection status', () => {
    useCollaboratorStore.getState().setConnected(true);
    expect(useCollaboratorStore.getState().isConnected).toBe(true);
  });

  it('addCollaborator adds a user', () => {
    useCollaboratorStore.getState().addCollaborator({
      id: 'u1',
      name: 'Test',
      color: '#fff',
      cursor: { line: 1, col: 1 },
    });
    expect(useCollaboratorStore.getState().collaborators).toHaveLength(1);
    expect(useCollaboratorStore.getState().collaborators[0].name).toBe('Test');
  });

  it('removeCollaborator removes by id', () => {
    useCollaboratorStore.getState().addCollaborator({
      id: 'u1',
      name: 'Test',
      color: '#fff',
      cursor: { line: 1, col: 1 },
    });
    useCollaboratorStore.getState().removeCollaborator('u1');
    expect(useCollaboratorStore.getState().collaborators).toHaveLength(0);
  });

  it('updateCursors modifies collaborator data', () => {
    useCollaboratorStore.getState().addCollaborator({
      id: 'u1',
      name: 'Test',
      color: '#fff',
      cursor: { line: 1, col: 1 },
    });
    useCollaboratorStore.getState().updateCursors((c) => ({
      ...c,
      cursor: { line: 10, col: 20 },
    }));
    const cursor = useCollaboratorStore.getState().collaborators[0].cursor;
    expect(cursor.line).toBe(10);
    expect(cursor.col).toBe(20);
  });
});
