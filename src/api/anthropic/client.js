/**
 * Anthropic API Client — MOCK MODE
 *
 * Returns realistic hardcoded responses with simulated latency.
 * OTEL traces are still recorded in DebugViewer via withSpan().
 */

import { withSpan } from '../telemetry/tracer';

const MODEL_COSTS = {
  'claude-3-opus-20240229':   { input: 0.015,   output: 0.075 },
  'claude-3-sonnet-20240229': { input: 0.003,   output: 0.015 },
  'claude-3-haiku-20240307':  { input: 0.00025, output: 0.00125 },
};

const MODEL_ID_MAP = {
  'claude-3-opus':   'claude-3-opus-20240229',
  'claude-3-sonnet': 'claude-3-sonnet-20240229',
  'claude-3-haiku':  'claude-3-haiku-20240307',
  'gpt-4':           'claude-3-opus-20240229',
  'gpt-4o':          'claude-3-sonnet-20240229',
};

function resolveModelId(model) {
  return MODEL_ID_MAP[model] ?? model;
}

function calcCost(modelId, inputTokens, outputTokens) {
  const rates = MODEL_COSTS[modelId] ?? { input: 0.003, output: 0.015 };
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
}

// Realistic mock responses for Agent runs
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

// Realistic mock responses for RAG search
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
  }
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function sendMessage({
  model,
  systemPrompt,
  userMessage,
  maxTokens = 1024,
  traceName = 'llm.complete()',
}) {
  const modelId = resolveModelId(model);

  return withSpan(traceName, async (span) => {
    // Simulate network latency
    const latency = 800 + Math.random() * 1200;
    await span.span('api_call', () => sleep(latency));

    // Pick mock response based on context
    let text;
    if (traceName.includes('rag')) {
      text = RAG_MOCK_RESULTS(userMessage.slice(0, 40));
    } else {
      text = AGENT_RESPONSES[Math.floor(Math.random() * AGENT_RESPONSES.length)];
    }

    const inputTokens = Math.round(200 + Math.random() * 600);
    const outputTokens = Math.round(300 + Math.random() * 500);

    await span.span('parse_response', () => sleep(20));

    const cost = calcCost(modelId, inputTokens, outputTokens);

    return {
      text,
      model: modelId,
      __tokens__: { input: inputTokens, output: outputTokens },
      __cost__: cost,
    };
  });
}
