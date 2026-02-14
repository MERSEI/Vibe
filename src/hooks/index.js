/**
 * Custom React Hooks
 * 
 * Centralized state management and side effects
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOthers, useMyPresence } from '../api/liveblocks/config';
import { translations } from '../utils/i18n';
import { CURSOR_COLORS } from '../utils/constants';

// ============= useTheme =============
export function useTheme(initialTheme = 'dark') {
  const [theme, setTheme] = useState(() => {
    // In production: read from localStorage or system preference
    return initialTheme;
  });

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Apply theme to document (for production)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return { theme, setTheme, toggleTheme };
}

// ============= useI18n =============
export function useI18n(initialLang = 'en') {
  const [lang, setLang] = useState(initialLang);
  
  const t = useMemo(() => translations[lang], [lang]);
  
  const toggleLang = useCallback(() => {
    setLang(prev => prev === 'en' ? 'ru' : 'en');
  }, []);

  return { lang, setLang, t, toggleLang };
}

// ============= useCollaborators =============
export function useCollaborators() {
  const others = useOthers();
  const [, updateMyPresence] = useMyPresence();

  const collaborators = others.map((other, index) => ({
    id: other.connectionId,
    name: other.presence?.name ?? `User-${other.connectionId}`,
    color: CURSOR_COLORS[(index + 1) % CURSOR_COLORS.length],
    cursor: other.presence?.cursor ?? null,
    selection: null,
  }));

  const updatePresence = useCallback((presence) => {
    updateMyPresence(presence);
  }, [updateMyPresence]);

  return {
    collaborators,
    isConnected: true,
    updatePresence,
    broadcastEvent: () => {},
  };
}

// ============= useFileSystem =============
export function useFileSystem() {
  const [files, setFiles] = useState(getInitialFiles());
  const [selectedFile, setSelectedFile] = useState('src/index.js');
  const [openTabs, setOpenTabs] = useState(['src/index.js']);

  const selectFile = useCallback((path) => {
    setSelectedFile(path);
    setOpenTabs(prev => prev.includes(path) ? prev : [...prev, path]);
  }, []);

  const closeTab = useCallback((path, e) => {
    if (e) e.stopPropagation();
    setOpenTabs(prev => {
      const newTabs = prev.filter(t => t !== path);
      if (selectedFile === path && newTabs.length > 0) {
        setSelectedFile(newTabs[newTabs.length - 1]);
      }
      return newTabs;
    });
  }, [selectedFile]);

  const updateFile = useCallback((path, content) => {
    setFiles(prev => {
      const newFiles = JSON.parse(JSON.stringify(prev));
      const parts = path.split('/');
      let current = newFiles;
      
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]].children;
      }
      current[parts[parts.length - 1]].content = content;
      
      return newFiles;
    });
  }, []);

  const getFileContent = useCallback((path) => {
    const parts = path.split('/');
    let current = files;
    
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]]?.children || {};
    }
    
    return current[parts[parts.length - 1]]?.content || '';
  }, [files]);

  const getFileLanguage = useCallback((path) => {
    const ext = path.split('.').pop();
    const langMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      json: 'json',
    };
    return langMap[ext] || 'javascript';
  }, []);

  const createFile = useCallback((folderPath, fileName, content = '') => {
    setFiles(prev => {
      const newFiles = JSON.parse(JSON.stringify(prev));
      const parts = folderPath.split('/').filter(Boolean);
      let current = newFiles;
      
      for (const part of parts) {
        if (!current[part]) {
          current[part] = { type: 'folder', children: {} };
        }
        current = current[part].children;
      }
      
      const ext = fileName.split('.').pop();
      current[fileName] = {
        type: 'file',
        language: ext,
        content,
      };
      
      return newFiles;
    });
  }, []);

  const deleteFile = useCallback((path) => {
    setFiles(prev => {
      const newFiles = JSON.parse(JSON.stringify(prev));
      const parts = path.split('/');
      let current = newFiles;
      
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]].children;
      }
      delete current[parts[parts.length - 1]];
      
      return newFiles;
    });
    
    closeTab(path);
  }, [closeTab]);

  return {
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
  };
}

// ============= useKeyboardShortcuts =============
export function useKeyboardShortcuts({ onSave, onRun, onFormat, onSearch }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.includes('Mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
      if (mod && e.key === 'r') {
        e.preventDefault();
        onRun?.();
      }
      if (mod && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        onFormat?.();
      }
      if (mod && e.key === 'f') {
        e.preventDefault();
        onSearch?.();
      }
      if (mod && e.key === '/') {
        e.preventDefault();
        // Toggle comment - handled in editor
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onRun, onFormat, onSearch]);
}

// ============= useLocalStorage =============
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Note: localStorage not available in artifacts
      // In production: use actual localStorage
      return initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    setStoredValue(value);
    // In production: localStorage.setItem(key, JSON.stringify(value));
  }, []);

  return [storedValue, setValue];
}

// ============= useDebounce =============
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ============= Initial Files Data =============
function getInitialFiles() {
  return {
    'src': {
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

main();`
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
}`
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
  vector_db: pgvector`
        }
      }
    },
    'docs': {
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
- \`Cmd+/\` - Comment`
        }
      }
    }
  };
}
