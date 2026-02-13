/**
 * Internationalization (i18n) Translations
 * 
 * Supported languages: English (en), Russian (ru)
 * Add new languages by creating new translation objects
 */

export const translations = {
  en: {
    // App
    title: 'Vibe IDE',
    subtitle: 'AI-Powered Development Environment',

    // Splash Screen
    splashTagline: 'AI-Powered Development Environment',
    splashBuiltBy: 'Built entirely by Claude · Anthropic',
    splashStartDemo: 'Start Interactive Demo',
    splashFeatures: {
      editor: 'Monaco Editor',
      agents: 'AI Agents DAG',
      rag: 'RAG Pipeline',
      tracing: 'OTEL Tracing',
      collaboration: 'Live Collaboration',
      search: 'pgvector Search',
    },
    splashFooter: 'Vibe IDE · Demo v1.0 · 2025 · claude-sonnet-4-5',

    // Navigation
    files: 'Files',
    editor: 'Editor',
    preview: 'Preview',
    console: 'Console',
    agents: 'Agents',
    rag: 'RAG',
    debug: 'Debug',
    settings: 'Settings',
    
    // Actions
    run: 'Run',
    save: 'Save',
    format: 'Format',
    newFile: 'New File',
    newFolder: 'New Folder',
    rename: 'Rename',
    delete: 'Delete',
    duplicate: 'Duplicate',
    
    // Search & Query
    search: 'Search',
    searchFiles: 'Search files...',
    searchDocs: 'Search documents...',
    query: 'Ask a question...',
    noResults: 'No results found',
    
    // Agents
    templates: 'Templates',
    createAgent: 'Create Agent',
    activeAgents: 'Active Agents',
    agentStatus: {
      idle: 'Idle',
      running: 'Running',
      completed: 'Completed',
      error: 'Error',
    },
    dagExecution: 'DAG Execution',
    
    // RAG
    chunkingStrategy: 'Chunking Strategy',
    vectorDb: 'Vector Database',
    embeddingModel: 'Embedding Model',
    ttl: 'TTL',
    relevance: 'Relevance',
    hybridSearch: 'Hybrid BM25 + Vector search enabled',
    
    // Debug
    traces: 'Traces',
    spans: 'Spans',
    errors: 'Errors',
    cost: 'Cost',
    tokens: 'Tokens',
    duration: 'Duration',
    tokenUsage: 'Token Usage',
    traceTimeline: 'Trace Timeline',
    eventBus: 'Event Bus',
    
    // Theme & Language
    darkMode: 'Dark',
    lightMode: 'Light',
    language: 'Language',
    
    // Collaboration
    collaborators: 'collaborators',
    youAreHere: 'You are here',
    editing: 'editing',
    
    // Status
    connected: 'Connected',
    disconnected: 'Disconnected',
    live: 'Live',
    saved: 'Saved',
    unsaved: 'Unsaved',
    
    // Messages
    fileSaved: '✅ File saved!',
    codeExecuted: '▶️ Code executed!',
    errorOccurred: '❌ Error occurred',
    noOutput: 'No output yet',
    runToSee: 'Run code to see results',
    
    // Keyboard shortcuts
    shortcuts: 'Keyboard Shortcuts',
    shortcutDescriptions: {
      save: 'Save file',
      run: 'Run code',
      comment: 'Toggle comment',
      search: 'Find in file',
      searchAll: 'Find in project',
      quickOpen: 'Quick open file',
      commandPalette: 'Command palette',
      undo: 'Undo',
      redo: 'Redo',
    },
  },
  
  ru: {
    // App
    title: 'Vibe IDE',
    subtitle: 'AI-среда разработки',

    // Splash Screen
    splashTagline: 'AI-среда разработки',
    splashBuiltBy: 'Полностью создано Claude · Anthropic',
    splashStartDemo: 'Начать интерактивную демо',
    splashFeatures: {
      editor: 'Редактор Monaco',
      agents: 'DAG AI агентов',
      rag: 'RAG конвейер',
      tracing: 'OTEL трейсинг',
      collaboration: 'Совместное редактирование',
      search: 'pgvector поиск',
    },
    splashFooter: 'Vibe IDE · Демо v1.0 · 2025 · claude-sonnet-4-5',

    // Navigation
    files: 'Файлы',
    editor: 'Редактор',
    preview: 'Превью',
    console: 'Консоль',
    agents: 'Агенты',
    rag: 'RAG',
    debug: 'Отладка',
    settings: 'Настройки',
    
    // Actions
    run: 'Запуск',
    save: 'Сохранить',
    format: 'Формат',
    newFile: 'Новый файл',
    newFolder: 'Новая папка',
    rename: 'Переименовать',
    delete: 'Удалить',
    duplicate: 'Дублировать',
    
    // Search & Query
    search: 'Поиск',
    searchFiles: 'Поиск файлов...',
    searchDocs: 'Поиск документов...',
    query: 'Задайте вопрос...',
    noResults: 'Ничего не найдено',
    
    // Agents
    templates: 'Шаблоны',
    createAgent: 'Создать агента',
    activeAgents: 'Активные агенты',
    agentStatus: {
      idle: 'Ожидание',
      running: 'Выполняется',
      completed: 'Завершено',
      error: 'Ошибка',
    },
    dagExecution: 'DAG выполнение',
    
    // RAG
    chunkingStrategy: 'Стратегия разбиения',
    vectorDb: 'Векторная БД',
    embeddingModel: 'Модель эмбеддингов',
    ttl: 'TTL',
    relevance: 'Релевантность',
    hybridSearch: 'Гибридный BM25 + Vector поиск',
    
    // Debug
    traces: 'Трейсы',
    spans: 'Спаны',
    errors: 'Ошибки',
    cost: 'Стоимость',
    tokens: 'Токены',
    duration: 'Длительность',
    tokenUsage: 'Использование токенов',
    traceTimeline: 'Таймлайн трейсов',
    eventBus: 'Шина событий',
    
    // Theme & Language
    darkMode: 'Тёмная',
    lightMode: 'Светлая',
    language: 'Язык',
    
    // Collaboration
    collaborators: 'участников',
    youAreHere: 'Вы здесь',
    editing: 'редактирует',
    
    // Status
    connected: 'Подключено',
    disconnected: 'Отключено',
    live: 'Live',
    saved: 'Сохранено',
    unsaved: 'Не сохранено',
    
    // Messages
    fileSaved: '✅ Файл сохранён!',
    codeExecuted: '▶️ Код выполнен!',
    errorOccurred: '❌ Произошла ошибка',
    noOutput: 'Нет вывода',
    runToSee: 'Запустите код для просмотра результатов',
    
    // Keyboard shortcuts
    shortcuts: 'Горячие клавиши',
    shortcutDescriptions: {
      save: 'Сохранить файл',
      run: 'Запустить код',
      comment: 'Закомментировать',
      search: 'Найти в файле',
      searchAll: 'Найти в проекте',
      quickOpen: 'Быстрое открытие',
      commandPalette: 'Палитра команд',
      undo: 'Отменить',
      redo: 'Повторить',
    },
  },
};

/**
 * Get translation by key path
 * @param {object} translations - Translation object
 * @param {string} path - Dot-separated key path (e.g., 'agentStatus.running')
 * @returns {string} Translated string or key if not found
 */
export function getTranslation(translations, path) {
  const keys = path.split('.');
  let result = translations;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return path; // Return key if translation not found
    }
  }
  
  return result;
}
