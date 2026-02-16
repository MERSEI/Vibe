/**
 * Application Constants & Configuration
 */

// Collaboration cursor colors
export const CURSOR_COLORS = [
  '#9333EA', // Purple
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

// Supported programming languages
export const LANGUAGES = {
  javascript: { name: 'JavaScript', ext: ['js', 'jsx'], icon: '🟨' },
  typescript: { name: 'TypeScript', ext: ['ts', 'tsx'], icon: '🔷' },
  python: { name: 'Python', ext: ['py'], icon: '🐍' },
  yaml: { name: 'YAML', ext: ['yaml', 'yml'], icon: '⚙️' },
  markdown: { name: 'Markdown', ext: ['md'], icon: '📝' },
  json: { name: 'JSON', ext: ['json'], icon: '📋' },
  html: { name: 'HTML', ext: ['html', 'htm'], icon: '🌐' },
  css: { name: 'CSS', ext: ['css', 'scss'], icon: '🎨' },
  rust: { name: 'Rust', ext: ['rs'], icon: '🦀' },
  go: { name: 'Go', ext: ['go'], icon: '🐹' },
  sql: { name: 'SQL', ext: ['sql'], icon: '🗄️' },
  dockerfile: { name: 'Dockerfile', ext: ['dockerfile'], icon: '🐳' },
};

// Editor default settings
export const EDITOR_DEFAULTS = {
  fontSize: 14,
  tabSize: 2,
  lineHeight: 1.5,
  minimap: true,
  wordWrap: 'on',
  theme: 'dark',
};

// Agent templates
export const AGENT_TEMPLATES = [
  {
    id: 'chatbot',
    name: 'ChatBot',
    icon: '💬',
    description: 'Conversational AI assistant',
    model: 'claude-3-sonnet',
    tools: ['web_search', 'calculator'],
  },
  {
    id: 'rag-search',
    name: 'RAG-Search',
    icon: '🔍',
    description: 'Document retrieval & QA',
    model: 'claude-3-opus',
    tools: ['vector_search', 'summarize'],
  },
  {
    id: 'self-healing-cli',
    name: 'Self-Healing CLI',
    icon: '🔧',
    description: 'Auto-fixing command line',
    model: 'claude-3-sonnet',
    tools: ['shell_exec', 'error_parser'],
  },
  {
    id: 'code-review',
    name: 'Code Review',
    icon: '👀',
    description: 'Automated PR review',
    model: 'claude-3-opus',
    tools: ['code_analysis', 'git_diff', 'security_scan'],
  },
  {
    id: 'sql-generator',
    name: 'SQL Generator',
    icon: '🗄️',
    description: 'Natural language → SQL',
    model: 'claude-3-sonnet',
    tools: ['schema_reader', 'query_validator'],
  },
  {
    id: 'api-designer',
    name: 'API Designer',
    icon: '🔌',
    description: 'Design REST & GraphQL APIs',
    model: 'claude-3-opus',
    tools: ['openapi_spec', 'schema_validator', 'mock_generator'],
  },
  {
    id: 'test-generator',
    name: 'Test Generator',
    icon: '🧪',
    description: 'Auto-generate unit tests',
    model: 'claude-3-haiku',
    tools: ['ast_parser', 'test_runner', 'coverage_report'],
  },
];

// RAG chunking strategies
export const CHUNKING_STRATEGIES = [
  { id: 'recursive', name: 'Recursive', description: 'Split by structure' },
  { id: 'semantic', name: 'Semantic', description: 'Split by meaning' },
  { id: 'fixed', name: 'Fixed Size', description: 'Split by token count' },
];

// LLM Models
export const LLM_MODELS = [
  { id: 'claude-3-opus', name: 'Gemini 2.0 Flash (via opus alias)', costPer1k: 0 },
  { id: 'claude-3-sonnet', name: 'Gemini 2.0 Flash (via sonnet alias)', costPer1k: 0 },
  { id: 'claude-3-haiku', name: 'Gemini 2.0 Flash Lite (via haiku alias)', costPer1k: 0 },
  { id: 'gpt-4-turbo', name: 'Gemini 2.0 Flash (via gpt-4 alias)', costPer1k: 0 },
  { id: 'gpt-4o', name: 'Gemini 2.0 Flash (via gpt-4o alias)', costPer1k: 0 },
];

// LLM Providers
export const LLM_PROVIDERS = [
  { id: 'gemini',    name: 'Gemini',    baseUrl: '/api/gemini/v1beta/openai', placeholder: 'AIzaSy...' },
  { id: 'openai',    name: 'OpenAI',    baseUrl: '/api/openai/v1',            placeholder: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic', baseUrl: '/api/anthropic/v1',         placeholder: 'sk-ant-...' },
];

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = [
  { keys: ['Cmd/Ctrl', 'S'], action: 'save', description: 'Save file' },
  { keys: ['Cmd/Ctrl', 'R'], action: 'run', description: 'Run code' },
  { keys: ['Cmd/Ctrl', '/'], action: 'comment', description: 'Toggle comment' },
  { keys: ['Cmd/Ctrl', 'F'], action: 'search', description: 'Find in file' },
  { keys: ['Cmd/Ctrl', 'Shift', 'F'], action: 'searchAll', description: 'Find in project' },
  { keys: ['Cmd/Ctrl', 'P'], action: 'quickOpen', description: 'Quick open file' },
  { keys: ['Cmd/Ctrl', 'Shift', 'P'], action: 'commandPalette', description: 'Command palette' },
  { keys: ['Cmd/Ctrl', 'Z'], action: 'undo', description: 'Undo' },
  { keys: ['Cmd/Ctrl', 'Shift', 'Z'], action: 'redo', description: 'Redo' },
  { keys: ['Cmd/Ctrl', 'D'], action: 'duplicate', description: 'Duplicate line' },
];

// Event bus channels
export const EVENT_CHANNELS = {
  agents: { color: 'purple', label: 'Agents' },
  rag: { color: 'blue', label: 'RAG' },
  llm: { color: 'green', label: 'LLM' },
  tools: { color: 'orange', label: 'Tools' },
  system: { color: 'gray', label: 'System' },
};

// Theme configuration
export const THEME_CONFIG = {
  dark: {
    bg: 'bg-slate-950',
    bgSecondary: 'bg-slate-900',
    bgTertiary: 'bg-slate-800',
    border: 'border-slate-800',
    text: 'text-white',
    textSecondary: 'text-slate-400',
    textMuted: 'text-slate-500',
  },
  light: {
    bg: 'bg-gray-100',
    bgSecondary: 'bg-white',
    bgTertiary: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textMuted: 'text-gray-400',
  },
};
