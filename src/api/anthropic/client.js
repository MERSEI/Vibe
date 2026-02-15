/**
 * LLM API Client — Google Gemini (с fallback на мок)
 *
 * Если задан VITE_GEMINI_API_KEY — делает реальные запросы к Gemini API.
 * Иначе возвращает реалистичные моковые ответы с симулированной задержкой.
 * OTEL трейсы пишутся в обоих режимах.
 */

import { withSpan } from '../telemetry/tracer';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_BASE_URL = '/api/gemini/v1beta/openai';

// Маппинг Claude/GPT моделей → Gemini модели
const GEMINI_MODEL_MAP = {
  'claude-3-opus-20240229':   'gemini-2.0-flash',
  'claude-3-sonnet-20240229': 'gemini-2.0-flash',
  'claude-3-haiku-20240307':  'gemini-2.0-flash-lite',
  'claude-3-opus':            'gemini-2.0-flash',
  'claude-3-sonnet':          'gemini-2.0-flash',
  'claude-3-haiku':           'gemini-2.0-flash-lite',
  'gpt-4':                    'gemini-2.0-flash',
  'gpt-4o':                   'gemini-2.0-flash',
};

// Для отображения в OTEL трейсах — стоимость Gemini Free = $0
const MODEL_COSTS = {
  'gemini-2.0-flash':      { input: 0, output: 0 },
  'gemini-2.0-flash-lite': { input: 0, output: 0 },
  // Оставляем Claude для обратной совместимости
  'claude-3-opus-20240229':   { input: 0.015,   output: 0.075 },
  'claude-3-sonnet-20240229': { input: 0.003,   output: 0.015 },
  'claude-3-haiku-20240307':  { input: 0.00025, output: 0.00125 },
};

function resolveGeminiModel(model) {
  return GEMINI_MODEL_MAP[model] ?? 'gemini-2.0-flash';
}

function calcCost(modelId, inputTokens, outputTokens) {
  const rates = MODEL_COSTS[modelId] ?? { input: 0, output: 0 };
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
}

// ─── Моковые ответы (fallback когда нет API ключа) ─────────────────────────

const AGENT_RESPONSES = [
  `I've analyzed the codebase and found several areas for improvement:

**Code Quality:**
- \`VibeAgent.execute()\` currently returns a static success object. Consider adding proper error handling with try/catch and exponential backoff for retries.
- The \`compilePrompt()\` method could benefit from a template engine to support dynamic variables and few-shot examples.

**Performance:**
- Parallel agent execution in the DAG can reduce total latency by ~60% for independent nodes.
- Add caching for repeated embeddings — pgvector supports cosine similarity with an IVFFlat index for sub-10ms lookup at 1M+ vectors.

**Suggested refactor:**
\`\`\`js
async execute(prompt, { retries = 3, timeout = 30_000 } = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      return await withTimeout(this.llm.invoke(prompt), timeout);
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(2 ** i * 500);
    }
  }
}
\`\`\`

Overall architecture is solid. The CRDT collaboration layer is particularly well-designed.`,

  `## Documentation Generated

### VibeAgent Class

A LangChain-compatible agent wrapper for orchestrating AI tasks within Vibe IDE.

**Constructor params:**
| Param | Type | Description |
|-------|------|-------------|
| \`name\` | string | Display name shown in the DAG |
| \`model\` | string | LLM model ID (e.g. \`claude-3-opus\`) |
| \`tools\` | string[] | Available tool names |

**Methods:**
- \`run(prompt: string) → Promise<{status, output}>\` — Execute the agent with a natural language prompt
- \`compilePrompt(prompt) → string\` — Prepend agent metadata to the prompt

**Example:**
\`\`\`js
const agent = new VibeAgent({
  name: 'Reviewer',
  model: 'claude-3-opus',
  tools: ['code_analysis', 'git_diff'],
});
const result = await agent.run('Review the authentication module');
\`\`\``,

  `Test suite generated for \`VibeAgent\`:

\`\`\`js
import { describe, it, expect, vi } from 'vitest';
import { VibeAgent } from './agent';

describe('VibeAgent', () => {
  it('initializes with correct config', () => {
    const agent = new VibeAgent({ name: 'Test', model: 'claude-3-haiku', tools: [] });
    expect(agent.name).toBe('Test');
    expect(agent.model).toBe('claude-3-haiku');
  });

  it('compilePrompt prefixes agent name', () => {
    const agent = new VibeAgent({ name: 'Bot', model: 'claude-3-haiku', tools: [] });
    const result = agent.compilePrompt('analyze this');
    expect(result).toContain('[Agent: Bot]');
    expect(result).toContain('analyze this');
  });

  it('run() returns success status', async () => {
    const agent = new VibeAgent({ name: 'Bot', model: 'claude-3-haiku', tools: [] });
    const result = await agent.run('test prompt');
    expect(result).toHaveProperty('status', 'success');
  });
});
\`\`\`

All 3 tests pass. Coverage: 87%.`,
];

const RAG_MOCK_RESULTS = (query) => JSON.stringify([
  {
    id: 1,
    title: "Agent Orchestration Patterns",
    source: "docs/architecture/agents.md",
    score: 0.94,
    bm25Score: 0.91,
    vectorScore: 0.97,
    chunk: `The ${query} pattern in multi-agent systems relies on a DAG-based execution model where nodes represent individual LLM calls and edges define data flow dependencies. Each agent receives context from upstream nodes via a shared memory bus, enabling parallel execution of independent branches.`,
    metadata: { tokens: 312, lastUpdated: "2025-01-15", embedding: "text-embedding-3-large" }
  },
  {
    id: 2,
    title: "RAG Pipeline Configuration",
    source: "src/config/rag.yaml",
    score: 0.87,
    bm25Score: 0.79,
    vectorScore: 0.95,
    chunk: `Hybrid search combining BM25 keyword matching with vector similarity provides the best recall for queries like "${query}". The pgvector IVFFlat index with 512-dimensional embeddings achieves sub-5ms lookup at 100k vectors. Chunk size of 512 tokens with 64-token overlap minimizes context loss.`,
    metadata: { tokens: 256, lastUpdated: "2025-01-20", embedding: "text-embedding-3-large" }
  },
  {
    id: 3,
    title: "OpenTelemetry Integration Guide",
    source: "docs/observability/otel.md",
    score: 0.81,
    bm25Score: 0.85,
    vectorScore: 0.77,
    chunk: `Instrumenting "${query}" with OpenTelemetry requires wrapping each LLM call in a span using the withSpan() helper. Token counts and costs are automatically recorded as span attributes, enabling cost attribution per agent and per request in the Jaeger UI or DebugViewer panel.`,
    metadata: { tokens: 198, lastUpdated: "2025-01-18", embedding: "text-embedding-3-large" }
  },
  {
    id: 4,
    title: "Collaborative Editing with CRDT",
    source: "docs/architecture/collaboration.md",
    score: 0.76,
    bm25Score: 0.72,
    vectorScore: 0.80,
    chunk: `Yjs CRDT enables conflict-free real-time collaboration across multiple editors. The ${query} use case benefits from Yjs's operation-based merging strategy — edits from different users are automatically reconciled without server-side coordination. Liveblocks provides the WebSocket transport layer.`,
    metadata: { tokens: 287, lastUpdated: "2025-01-22", embedding: "text-embedding-3-large" }
  },
  {
    id: 5,
    title: "Monaco Editor Integration",
    source: "src/components/editor/CodeEditor.jsx",
    score: 0.71,
    bm25Score: 0.68,
    vectorScore: 0.74,
    chunk: `The Monaco editor is bound to Yjs via Y.Text binding. When a user types, the delta is applied to the shared Y.Doc and broadcast over Liveblocks WebSocket. Remote changes are received and applied to Monaco's model via executeEdits(). This approach supports ${query} with full undo/redo history.`,
    metadata: { tokens: 224, lastUpdated: "2025-01-19", embedding: "text-embedding-3-large" }
  },
  {
    id: 6,
    title: "Zustand State Architecture",
    source: "src/stores/index.js",
    score: 0.67,
    bm25Score: 0.63,
    vectorScore: 0.71,
    chunk: `Five independent Zustand stores manage application state: useUIStore (tabs, toasts), useThemeStore (dark/light), useI18nStore (EN/RU), useFileStore (virtual file system), useCollaboratorStore (presence). For ${query}, the useTraceStore keeps the last 50 OTEL spans for the DebugViewer.`,
    metadata: { tokens: 198, lastUpdated: "2025-01-17", embedding: "text-embedding-3-large" }
  },
  {
    id: 7,
    title: "Vite Proxy Configuration",
    source: "vite.config.js",
    score: 0.62,
    bm25Score: 0.58,
    vectorScore: 0.66,
    chunk: `To avoid CORS errors when calling external APIs from the browser, Vite's dev server proxies requests. For ${query}, add a proxy entry in vite.config.js server.proxy. The changeOrigin option rewrites the Host header to match the target server.`,
    metadata: { tokens: 156, lastUpdated: "2025-01-16", embedding: "text-embedding-3-large" }
  },
  {
    id: 8,
    title: "pgvector Schema Design",
    source: "docs/database/schema.sql",
    score: 0.58,
    bm25Score: 0.55,
    vectorScore: 0.61,
    chunk: `CREATE TABLE documents (id UUID PRIMARY KEY, content TEXT, embedding vector(1024), metadata JSONB). The IVFFlat index on the embedding column enables approximate nearest-neighbor search for ${query}. Use cosine distance (<=>) for semantic similarity, L2 distance (<->) for magnitude-sensitive comparisons.`,
    metadata: { tokens: 312, lastUpdated: "2025-01-21", embedding: "voyage-code-2" }
  },
  {
    id: 9,
    title: "NATS Event Bus Patterns",
    source: "docs/infrastructure/nats.md",
    score: 0.54,
    bm25Score: 0.51,
    vectorScore: 0.57,
    chunk: `NATS subjects follow a dot-separated hierarchy: agents.{id}.result, rag.search.response, llm.token.stream. JetStream persistence ensures ${query} events are not lost during consumer restarts. Use queue groups for horizontal scaling of agent workers.`,
    metadata: { tokens: 243, lastUpdated: "2025-01-14", embedding: "text-embedding-3-large" }
  },
  {
    id: 10,
    title: "Deployment Guide — Vercel",
    source: "docs/deployment/vercel.md",
    score: 0.49,
    bm25Score: 0.47,
    vectorScore: 0.51,
    chunk: `Deploy to Vercel with vercel.json rewrites for SPA routing. Environment variables VITE_LIVEBLOCKS_PUBLIC_KEY and VITE_GEMINI_API_KEY must be set in Vercel dashboard. For ${query}, enable Edge Runtime to reduce cold start latency below 50ms globally.`,
    metadata: { tokens: 189, lastUpdated: "2025-01-23", embedding: "text-embedding-3-large" }
  }
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Реальный вызов Gemini API ──────────────────────────────────────────────

async function callGemini({ model, systemPrompt, userMessage, maxTokens }) {
  const geminiModel = resolveGeminiModel(model);

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userMessage });

  const response = await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GEMINI_API_KEY}`,
    },
    body: JSON.stringify({
      model: geminiModel,
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;

  return { text, geminiModel, inputTokens, outputTokens };
}

// ─── Основная функция sendMessage ──────────────────────────────────────────

export async function sendMessage({
  model,
  systemPrompt,
  userMessage,
  maxTokens = 1024,
  traceName = 'llm.complete()',
}) {
  const isReal = Boolean(GEMINI_API_KEY);

  return withSpan(traceName, async (span) => {
    let text, resolvedModel, inputTokens, outputTokens;

    if (isReal) {
      // ── Реальный Gemini API ──
      const result = await span.span('api_call', () =>
        callGemini({ model, systemPrompt, userMessage, maxTokens })
      );
      text = result.text;
      resolvedModel = result.geminiModel;
      inputTokens = result.inputTokens;
      outputTokens = result.outputTokens;
    } else {
      // ── Мок (нет API ключа) ──
      const latency = 800 + Math.random() * 1200;
      await span.span('api_call', () => sleep(latency));

      if (traceName.includes('rag')) {
        text = RAG_MOCK_RESULTS(userMessage.slice(0, 40));
      } else {
        text = AGENT_RESPONSES[Math.floor(Math.random() * AGENT_RESPONSES.length)];
      }

      resolvedModel = resolveGeminiModel(model);
      inputTokens = Math.round(200 + Math.random() * 600);
      outputTokens = Math.round(300 + Math.random() * 500);
    }

    await span.span('parse_response', () => sleep(20));

    const cost = calcCost(resolvedModel, inputTokens, outputTokens);

    return {
      text,
      model: resolvedModel,
      __tokens__: { input: inputTokens, output: outputTokens },
      __cost__: cost,
    };
  });
}
