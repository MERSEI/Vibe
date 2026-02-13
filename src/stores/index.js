/**
 * Zustand Global Store
 *
 * Centralized state management for Vibe IDE (Roadmap Phase 1.4)
 * Replaces scattered useState/hook state with a single store.
 */

import { create } from 'zustand';
import { translations } from '../utils/i18n';
import { getLanguageFromFile } from '../utils/syntax';

// ============= UI Store =============
export const useUIStore = create((set) => ({
  activeTab: 'editor',
  showEventBus: false,
  toast: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleEventBus: () => set((s) => ({ showEventBus: !s.showEventBus })),
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}));

// ============= Theme Store =============
export const useThemeStore = create((set) => ({
  theme: 'dark',

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),
}));

// ============= I18n Store =============
export const useI18nStore = create((set, get) => ({
  lang: 'en',

  get t() {
    return translations[get().lang];
  },

  setLang: (lang) => set({ lang }),
  toggleLang: () => set((s) => ({ lang: s.lang === 'en' ? 'ru' : 'en' })),
}));

// Note: `get t()` in Zustand plain objects won't work as a reactive getter.
// Use the selector pattern instead:
export const useTranslations = () => {
  const lang = useI18nStore((s) => s.lang);
  return translations[lang];
};

// ============= File System Store =============
function getInitialFiles() {
  return {
    src: {
      type: 'folder',
      children: {
        'index.js': {
          type: 'file',
          language: 'javascript',
          content: `// Welcome to Vibe IDE
import { VibeAgent } from './agent';

const agent = new VibeAgent({
  name: 'Assistant',
  model: 'claude-3-opus',
  tools: ['web_search', 'code_exec']
});

async function main() {
  const response = await agent.run(
    "Analyze this codebase"
  );
  console.log(response);
}

main();`,
        },
        'agent.js': {
          type: 'file',
          language: 'javascript',
          content: `// LangChain-style Agent Wrapper
export class VibeAgent {
  constructor(config) {
    this.name = config.name;
    this.model = config.model;
    this.tools = config.tools || [];
  }

  async run(prompt) {
    const compiled = this.compilePrompt(prompt);
    return this.execute(compiled);
  }

  compilePrompt(prompt) {
    return \`[Agent: \${this.name}]\\n\${prompt}\`;
  }

  async execute(prompt) {
    console.log('Executing:', prompt);
    return { status: 'success' };
  }
}`,
        },
        'config.yaml': {
          type: 'file',
          language: 'yaml',
          content: `# Vibe IDE Configuration
app:
  name: vibe-ide
  version: 1.0.0

agents:
  - name: CodeReviewer
    model: claude-3-opus
    tools:
      - code_analysis
      - git_diff

rag:
  embedding_model: text-embedding-3-large
  chunk_size: 512
  vector_db: pgvector`,
        },
      },
    },
    docs: {
      type: 'folder',
      children: {
        'README.md': {
          type: 'file',
          language: 'markdown',
          content: `# Vibe IDE

## Features
- Monaco Editor
- CRDT Collaboration
- AI Agents
- RAG Pipeline
- OpenTelemetry

## Shortcuts
- \`Cmd+S\` - Save
- \`Cmd+R\` - Run
- \`Cmd+/\` - Comment`,
        },
      },
    },
  };
}

export const useFileStore = create((set, get) => ({
  files: getInitialFiles(),
  selectedFile: 'src/index.js',
  openTabs: ['src/index.js'],

  selectFile: (path) =>
    set((s) => ({
      selectedFile: path,
      openTabs: s.openTabs.includes(path) ? s.openTabs : [...s.openTabs, path],
    })),

  closeTab: (path) =>
    set((s) => {
      const newTabs = s.openTabs.filter((t) => t !== path);
      const newSelected =
        s.selectedFile === path && newTabs.length > 0
          ? newTabs[newTabs.length - 1]
          : s.selectedFile;
      return { openTabs: newTabs, selectedFile: newSelected };
    }),

  updateFile: (path, content) =>
    set((s) => {
      const newFiles = JSON.parse(JSON.stringify(s.files));
      const parts = path.split('/');
      let current = newFiles;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]].children;
      }
      current[parts[parts.length - 1]].content = content;
      return { files: newFiles };
    }),

  getFileContent: (path) => {
    const parts = path.split('/');
    let current = get().files;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]]?.children || {};
    }
    return current[parts[parts.length - 1]]?.content || '';
  },

  getFileLanguage: (path) => getLanguageFromFile(path),

  createFile: (folderPath, fileName, content = '') =>
    set((s) => {
      const newFiles = JSON.parse(JSON.stringify(s.files));
      const parts = folderPath.split('/').filter(Boolean);
      let current = newFiles;
      for (const part of parts) {
        if (!current[part]) {
          current[part] = { type: 'folder', children: {} };
        }
        current = current[part].children;
      }
      const ext = fileName.split('.').pop();
      current[fileName] = { type: 'file', language: ext, content };
      return { files: newFiles };
    }),

  deleteFile: (path) =>
    set((s) => {
      const newFiles = JSON.parse(JSON.stringify(s.files));
      const parts = path.split('/');
      let current = newFiles;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]].children;
      }
      delete current[parts[parts.length - 1]];
      const newTabs = s.openTabs.filter((t) => t !== path);
      const newSelected =
        s.selectedFile === path && newTabs.length > 0
          ? newTabs[newTabs.length - 1]
          : s.selectedFile;
      return { files: newFiles, openTabs: newTabs, selectedFile: newSelected };
    }),
}));

// ============= Collaborators Store =============
export const useCollaboratorStore = create((set) => ({
  collaborators: [],
  isConnected: false,

  setConnected: (connected) => set({ isConnected: connected }),
  setCollaborators: (collaborators) => set({ collaborators }),
  addCollaborator: (collaborator) =>
    set((s) => ({ collaborators: [...s.collaborators, collaborator] })),
  removeCollaborator: (id) =>
    set((s) => ({
      collaborators: s.collaborators.filter((c) => c.id !== id),
    })),
  updateCursors: (updater) =>
    set((s) => ({ collaborators: s.collaborators.map(updater) })),
}));

// Collaboration state is now driven by Liveblocks via useCollaborators() in hooks/index.js.
// The useCollaboratorStore below remains available for any direct Zustand access.
