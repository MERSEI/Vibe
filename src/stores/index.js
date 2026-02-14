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
          content: `/**
 * Vibe IDE — AI Agent Orchestration Entry Point
 *
 * Runs a multi-step pipeline:
 *   1. CodeReviewer  → static analysis + security scan
 *   2. DocWriter     → generates JSDoc from reviewed code
 *   3. TestGen       → produces Vitest unit tests
 *
 * All agents share a context object that accumulates results.
 */

import { VibeAgent } from './agent';

// ─── Agent definitions ────────────────────────────────────────────────────────

const reviewer = new VibeAgent({
  name: 'CodeReviewer',
  model: 'claude-opus-4-6',
  systemPrompt: 'You are an expert code reviewer. Identify bugs, security issues, and suggest improvements.',
  tools: ['code_analysis', 'security_scan', 'git_diff'],
  temperature: 0.2,
});

const docWriter = new VibeAgent({
  name: 'DocWriter',
  model: 'claude-opus-4-6',
  systemPrompt: 'Generate clear, concise JSDoc comments for the provided code.',
  tools: ['ast_parser', 'jsdoc_generator'],
  temperature: 0.4,
});

const testGen = new VibeAgent({
  name: 'TestGen',
  model: 'claude-sonnet-4-5-20250929',
  systemPrompt: 'Generate comprehensive Vitest unit tests with edge cases.',
  tools: ['test_runner', 'coverage_analyzer'],
  temperature: 0.3,
});

// ─── Pipeline execution ───────────────────────────────────────────────────────

async function runPipeline(sourceCode) {
  const ctx = { source: sourceCode, results: {} };

  console.log('▶ Starting agent pipeline...');

  // Step 1 — Code review
  ctx.results.review = await reviewer.run(
    \`Review this code and return structured findings:\\n\\n\${ctx.source}\`
  );
  console.log('✓ CodeReviewer:', ctx.results.review.summary);

  // Step 2 — Documentation (uses review context)
  ctx.results.docs = await docWriter.run(
    \`Generate JSDoc for this code. Known issues: \${ctx.results.review.issues.join(', ')}\\n\\n\${ctx.source}\`
  );
  console.log('✓ DocWriter: generated', ctx.results.docs.commentCount, 'comments');

  // Step 3 — Tests (uses both previous results)
  ctx.results.tests = await testGen.run(
    \`Write Vitest tests. Cover these edge cases: \${ctx.results.review.edgeCases.join(', ')}\\n\\n\${ctx.source}\`
  );
  console.log('✓ TestGen:', ctx.results.tests.testCount, 'tests generated');

  return ctx.results;
}

// ─── Run ──────────────────────────────────────────────────────────────────────

const sampleCode = \`
export function calculateTotal(items, taxRate = 0.1) {
  return items
    .filter(item => item.active)
    .reduce((sum, item) => sum + item.price * item.qty, 0) * (1 + taxRate);
}
\`;

runPipeline(sampleCode).then(results => {
  console.log('Pipeline complete:', JSON.stringify(results, null, 2));
});`,
        },
        'agent.js': {
          type: 'file',
          language: 'javascript',
          content: `/**
 * VibeAgent — LangChain-compatible agent wrapper for Claude
 *
 * Supports tool calling, streaming, retry with exponential backoff,
 * and OpenTelemetry tracing for every LLM invocation.
 */

import { tracer } from '../api/telemetry/tracer';

const RETRY_DELAYS = [500, 1500, 4000]; // ms

export class VibeAgent {
  constructor({ name, model, systemPrompt = '', tools = [], temperature = 0.7, maxTokens = 4096 }) {
    this.name        = name;
    this.model       = model;
    this.systemPrompt = systemPrompt;
    this.tools       = tools;
    this.temperature = temperature;
    this.maxTokens   = maxTokens;
    this._callCount  = 0;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async run(prompt, context = {}) {
    const span = tracer.startSpan(\`agent:\${this.name}\`);
    span.setAttribute('llm.model', this.model);
    span.setAttribute('agent.tools', this.tools.join(','));

    try {
      const result = await this._withRetry(() => this._call(prompt, context));
      span.setAttribute('llm.tokens.output', result.usage?.output_tokens ?? 0);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: 2, message: err.message }); // ERROR
      throw err;
    } finally {
      span.end();
    }
  }

  get callCount() { return this._callCount; }

  // ─── Internal ──────────────────────────────────────────────────────────────

  async _call(prompt, context) {
    this._callCount++;

    const messages = [
      ...(context.history ?? []),
      { role: 'user', content: this._buildPrompt(prompt, context) },
    ];

    // In production: replace with real Anthropic SDK call
    const response = await this._mockLLM(messages);

    if (response.stop_reason === 'tool_use') {
      return this._handleToolUse(response, context);
    }

    return this._parseOutput(response);
  }

  _buildPrompt(prompt, context) {
    const parts = [prompt];
    if (context.memory?.length) {
      parts.unshift(\`Context:\\n\${context.memory.join('\\n')}\\n\`);
    }
    return parts.join('\\n');
  }

  async _handleToolUse(response, context) {
    const toolResults = await Promise.all(
      response.content
        .filter(b => b.type === 'tool_use')
        .map(async b => ({
          type: 'tool_result',
          tool_use_id: b.id,
          content: await this._executeTool(b.name, b.input),
        }))
    );
    return this._call(toolResults, { ...context, history: [...(context.history ?? []), response] });
  }

  async _executeTool(name, input) {
    console.log(\`  ⚙ tool:\${name}\`, input);
    // Tool registry — extend with real implementations
    const registry = {
      code_analysis:   () => ({ issues: ['unused variable x', 'missing null check'], score: 87 }),
      security_scan:   () => ({ vulnerabilities: [], rating: 'A' }),
      ast_parser:      () => ({ nodes: 42, functions: 3, classes: 1 }),
      jsdoc_generator: () => ({ commentCount: 4 }),
      test_runner:     () => ({ passed: 12, failed: 0, coverage: '94%' }),
      git_diff:        () => ({ additions: 18, deletions: 5, files: 2 }),
    };
    return (registry[name] ?? (() => ({ result: 'ok' })))();
  }

  _parseOutput(response) {
    const text = response.content.find(b => b.type === 'text')?.text ?? '';
    return {
      text,
      summary:    text.split('\\n')[0],
      issues:     ['missing null check', 'no input validation'],
      edgeCases:  ['empty array', 'negative prices', 'taxRate = 0'],
      testCount:  8,
      commentCount: 4,
      usage:      response.usage,
    };
  }

  async _withRetry(fn) {
    for (let i = 0; i <= RETRY_DELAYS.length; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === RETRY_DELAYS.length || !this._isRetryable(err)) throw err;
        await new Promise(r => setTimeout(r, RETRY_DELAYS[i]));
      }
    }
  }

  _isRetryable(err) {
    return err.status === 429 || err.status >= 500;
  }

  async _mockLLM(messages) {
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
    return {
      role: 'assistant',
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: \`Analyzed \${messages.length} messages. All checks passed.\` }],
      usage: { input_tokens: 312, output_tokens: 128 },
    };
  }
}`,
        },
        'config.yaml': {
          type: 'file',
          language: 'yaml',
          content: `# ─────────────────────────────────────────────────────────
# Vibe IDE — Production Configuration
# ─────────────────────────────────────────────────────────

app:
  name: vibe-ide
  version: 1.0.0
  environment: production
  base_url: https://vibe-ide.vercel.app

# ─── LLM Providers ───────────────────────────────────────

llm:
  default_provider: anthropic
  providers:
    anthropic:
      models:
        - id: claude-opus-4-6
          max_tokens: 8192
          context_window: 200000
          use_for: [orchestration, code_review, reasoning]
        - id: claude-sonnet-4-5-20250929
          max_tokens: 4096
          context_window: 200000
          use_for: [test_generation, documentation, chat]
        - id: claude-haiku-4-5-20251001
          max_tokens: 2048
          use_for: [embeddings_rerank, quick_classification]
      rate_limit:
        requests_per_minute: 50
        tokens_per_minute: 100000

# ─── Agent Definitions ───────────────────────────────────

agents:
  - name: CodeReviewer
    model: claude-opus-4-6
    temperature: 0.2
    tools: [code_analysis, security_scan, git_diff]
    system_prompt: |
      You are an expert code reviewer specializing in security,
      performance, and maintainability. Be concise and actionable.

  - name: DocWriter
    model: claude-sonnet-4-5-20250929
    temperature: 0.4
    tools: [ast_parser, jsdoc_generator]
    system_prompt: |
      Generate clear JSDoc comments. Focus on params, returns,
      and non-obvious behavior. Skip trivial getters/setters.

  - name: TestGen
    model: claude-sonnet-4-5-20250929
    temperature: 0.3
    tools: [test_runner, coverage_analyzer]
    system_prompt: |
      Write Vitest unit tests. Prioritize edge cases:
      null/undefined inputs, boundary values, async errors.

# ─── RAG Pipeline ────────────────────────────────────────

rag:
  embedding_model: voyage-code-3
  embedding_dimensions: 1024
  chunk_size: 512
  chunk_overlap: 64
  chunking_strategy: recursive   # recursive | semantic | fixed

  vector_db:
    provider: pgvector
    connection: ${DATABASE_URL}
    table: document_embeddings
    index: ivfflat
    index_lists: 100

  retrieval:
    top_k: 8
    rerank: true
    reranker_model: claude-haiku-4-5-20251001
    hybrid_search: true          # BM25 + vector cosine
    similarity_threshold: 0.72

# ─── Collaboration ───────────────────────────────────────

collaboration:
  provider: liveblocks
  room_id: vibe-ide-demo
  presence_fields: [name, cursor, selection]
  crdt_engine: yjs
  persistence: liveblocks_storage

# ─── Observability ───────────────────────────────────────

observability:
  tracing:
    provider: opentelemetry
    exporter: otlp                # otlp | jaeger | zipkin | in_memory
    endpoint: ${OTEL_EXPORTER_OTLP_ENDPOINT}
    sampling_rate: 1.0            # 1.0 = 100% in dev, use 0.1 in prod

  metrics:
    provider: prometheus
    scrape_interval: 15s
    custom_metrics:
      - name: llm_tokens_total
        type: counter
        labels: [model, agent, direction]
      - name: llm_latency_seconds
        type: histogram
        buckets: [0.1, 0.5, 1, 2, 5, 10]

  logging:
    level: info
    format: json
    redact: [api_key, token, password]

# ─── Event Bus ───────────────────────────────────────────

event_bus:
  provider: nats
  url: ${NATS_URL}
  jetstream: true
  subjects:
    agents: vibe.agents.>
    rag:    vibe.rag.>
    llm:    vibe.llm.>
    system: vibe.system.>`,
        },
      },
    },
    docs: {
      type: 'folder',
      children: {
        'README.md': {
          type: 'file',
          language: 'markdown',
          content: `# ⚡ Vibe IDE

> AI-powered collaborative IDE with real-time CRDT editing,
> multi-agent orchestration, RAG pipeline, and full observability.

[![Deploy](https://img.shields.io/badge/Vercel-deployed-black)](https://vibe-ide.vercel.app)
[![Liveblocks](https://img.shields.io/badge/CRDT-Liveblocks%20%2B%20Yjs-purple)](https://liveblocks.io)
[![OpenTelemetry](https://img.shields.io/badge/tracing-OpenTelemetry-orange)](https://opentelemetry.io)

---

## ✨ What's Live Right Now

| Feature | Status | Details |
|---------|--------|---------|
| Monaco Editor | ✅ Real | VS Code engine — minimap, autocomplete, Ctrl+F |
| CRDT Collaboration | ✅ Real | Liveblocks + Yjs — open two tabs to try |
| OpenTelemetry | ✅ Real | In-memory traces visible in Debug tab |
| AI Agents | 🟡 Mock | Realistic responses, real OTEL traces |
| RAG Pipeline | 🟡 Mock | Add pgvector to make it real |
| NATS Event Bus | 🟡 Mock | Add NATS server to make it real |

---

## 🚀 Quick Start

\`\`\`bash
git clone https://github.com/MERSEI/Vibe.git
cd Vibe && npm install

# For real CRDT collaboration:
echo "VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_..." > .env

npm run dev
# Open http://localhost:3000 in two tabs — CRDT works!
\`\`\`

---

## 🏗️ Architecture

\`\`\`
┌─────────────────────────────────────────────────┐
│                   Vibe IDE                       │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Monaco  │  │  Agent   │  │     RAG      │  │
│  │  Editor  │  │ Builder  │  │  Playground  │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │               │            │
│  ┌────▼──────────────▼───────────────▼───────┐  │
│  │            Zustand Global State            │  │
│  └────┬──────────────┬───────────────┬───────┘  │
│       │              │               │            │
│  ┌────▼────┐  ┌──────▼──────┐  ┌───▼────────┐  │
│  │  Yjs /  │  │  Anthropic  │  │    OTEL    │  │
│  │Liveblks │  │  Claude API │  │  Tracer    │  │
│  └─────────┘  └─────────────┘  └────────────┘  │
└─────────────────────────────────────────────────┘
\`\`\`

---

## 🤖 Agent Pipeline

Agents run as a **DAG** — each node receives context from upstream:

\`\`\`
  [CodeReviewer] ──► [DocWriter]
        │                 │
        └────────►  [TestGen]  ──► Output
\`\`\`

Add a real Anthropic key to make agents actually think.

---

## 📊 Observability

Every LLM call is automatically traced with OpenTelemetry:

- **Span name:** \`agent:<name>\`
- **Attributes:** model, input/output tokens, tools used, latency
- **View:** click the 🐛 Debug tab → Trace Timeline

Switch to Grafana Tempo for persistent traces:
\`\`\`bash
VITE_GRAFANA_ENDPOINT=https://tempo-us-central1.grafana.net/tempo
\`\`\`

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`Ctrl+S\` | Save file |
| \`Ctrl+F\` | Find in file |
| \`Ctrl+/\` | Toggle comment |
| \`Ctrl+R\` | Run preview |

---

## 🛣️ Roadmap

See [ROADMAP.md](../docs/ROADMAP.md) for the full integration plan.

Next up: **Anthropic API key** → agents give real AI answers.`,
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
