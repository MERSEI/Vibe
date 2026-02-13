# 🚀 Vibe IDE — Production Roadmap

## Текущий статус
**MVP Demo готов** — все 4 эпика реализованы как функциональные симуляции.
Код разбит на компоненты, готов к интеграции реальных библиотек.

---

## 📁 Структура проекта

```
vibe-ide/
├── src/
│   ├── App.jsx                    # Main entry point
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.jsx         # App shell
│   │   │   ├── Header.jsx         # Top navigation
│   │   │   ├── Sidebar.jsx        # Left nav tabs
│   │   │   └── StatusBar.jsx      # Bottom status
│   │   ├── editor/
│   │   │   ├── EditorPanel.jsx    # Main editor container
│   │   │   ├── FileTree.jsx       # File browser
│   │   │   ├── CodeEditor.jsx     # Monaco-style editor
│   │   │   ├── EditorTabs.jsx     # Tab bar
│   │   │   └── LivePreview.jsx    # Sandpack-style preview
│   │   ├── agents/
│   │   │   └── AgentBuilder.jsx   # Agent orchestration
│   │   ├── rag/
│   │   │   └── RAGPlayground.jsx  # RAG interface
│   │   ├── debug/
│   │   │   ├── DebugViewer.jsx    # OTEL trace viewer
│   │   │   └── EventBusInspector.jsx # NATS monitor
│   │   ├── common/
│   │   │   └── index.jsx          # Toast, Button, Modal, etc.
│   │   └── index.js               # Component exports
│   ├── hooks/
│   │   └── index.js               # useTheme, useI18n, useCollaborators, etc.
│   ├── utils/
│   │   ├── constants.js           # App constants
│   │   ├── i18n.js                # Translations
│   │   └── syntax.js              # Syntax highlighting
│   ├── stores/                    # Zustand/Jotai stores (TODO)
│   ├── api/                       # API clients (TODO)
│   └── types/                     # TypeScript types (TODO)
├── docs/
│   └── ROADMAP.md                 # This file
└── tests/                         # Test files (TODO)
```

---

## 🗺️ Дорожная карта по фазам

### Phase 1: Core Infrastructure (2-3 недели)
**Цель:** Превратить симуляции в реальные интеграции

| Задача | Описание | Библиотеки | Приоритет |
|--------|----------|------------|-----------|
| 1.1 Monaco Integration | Заменить кастомный редактор на Monaco | `@monaco-editor/react` | 🔴 Critical |
| 1.2 Liveblocks Setup | Настроить CRDT синхронизацию | `@liveblocks/client`, `@liveblocks/react`, `yjs`, `y-monaco` | 🔴 Critical |
| 1.3 File System API | Реальная работа с файлами | `@anthropic-ai/sdk` (для Claude), локальный fs | 🟡 High |
| 1.4 State Management | Глобальное состояние | `zustand` или `jotai` | 🟡 High |
| 1.5 TypeScript Migration | Типизация всего кода | `typescript` | 🟢 Medium |

**Детали 1.1 — Monaco Integration:**
```jsx
// Заменить CodeEditor.jsx на:
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';

function MonacoEditor({ content, onChange, language }) {
  const handleMount = (editor, monaco) => {
    // Setup Yjs binding для CRDT
    const ydoc = new Y.Doc();
    const yText = ydoc.getText('monaco');
    new MonacoBinding(yText, editor.getModel(), new Set([editor]));
  };
  
  return (
    <Editor
      height="100%"
      language={language}
      value={content}
      onChange={onChange}
      onMount={handleMount}
      theme="vs-dark"
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        formatOnPaste: true,
        automaticLayout: true,
      }}
    />
  );
}
```

**Детали 1.2 — Liveblocks:**
```jsx
// В App.jsx
import { createClient } from '@liveblocks/client';
import { LiveblocksProvider, RoomProvider } from '@liveblocks/react';

const client = createClient({
  publicApiKey: process.env.LIVEBLOCKS_PUBLIC_KEY,
});

// Обернуть приложение:
<LiveblocksProvider client={client}>
  <RoomProvider id="vibe-ide-room" initialPresence={{ cursor: null }}>
    <App />
  </RoomProvider>
</LiveblocksProvider>
```

---

### Phase 2: Agent SDK (2-3 недели)
**Цель:** Реальная оркестрация AI агентов

| Задача | Описание | Библиотеки | Приоритет |
|--------|----------|------------|-----------|
| 2.1 LangChain Wrapper | Базовый VibeAgent класс | `langchain`, `@langchain/anthropic` | 🔴 Critical |
| 2.2 Multi-Agent Runner | DAG execution с async channels | `nats.js`, custom DAG engine | 🟡 High |
| 2.3 Tool Registry | Регистрация и вызов tools | Custom + LangChain tools | 🟡 High |
| 2.4 Streaming Support | Потоковый вывод LLM | `@anthropic-ai/sdk` | 🟢 Medium |

**Детали 2.1 — LangChain Wrapper:**
```typescript
// src/api/agents/VibeAgent.ts
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';

export class VibeAgent {
  private executor: AgentExecutor;
  
  constructor(config: AgentConfig) {
    const llm = new ChatAnthropic({
      modelName: config.model,
      temperature: config.temperature,
    });
    
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', config.systemPrompt],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);
    
    const agent = createToolCallingAgent({
      llm,
      tools: config.tools,
      prompt,
    });
    
    this.executor = new AgentExecutor({ agent, tools: config.tools });
  }
  
  async run(input: string) {
    return this.executor.invoke({ input });
  }
}
```

**Детали 2.2 — DAG Execution:**
```typescript
// src/api/agents/DAGRunner.ts
import { connect, JSONCodec } from 'nats';

interface DAGNode {
  id: string;
  agent: VibeAgent;
  inputs: string[];
  outputs: string[];
}

export class DAGRunner {
  private nc: NatsConnection;
  private jc = JSONCodec();
  
  async execute(dag: DAGNode[]) {
    this.nc = await connect({ servers: process.env.NATS_URL });
    
    // Топологическая сортировка
    const sorted = this.topologicalSort(dag);
    
    for (const node of sorted) {
      // Ждём все inputs
      const inputs = await this.gatherInputs(node.inputs);
      
      // Выполняем агента
      const result = await node.agent.run(inputs);
      
      // Публикуем результат
      for (const output of node.outputs) {
        this.nc.publish(output, this.jc.encode(result));
      }
    }
  }
}
```

---

### Phase 3: RAG Pipeline (2-3 недели)
**Цель:** Полноценный retrieval-augmented generation

| Задача | Описание | Библиотеки | Приоритет |
|--------|----------|------------|-----------|
| 3.1 PgVector Setup | Postgres + pgvector extension | `pg`, `pgvector` | 🔴 Critical |
| 3.2 Embedding Pipeline | Документ → chunks → embeddings | `@anthropic-ai/sdk`, `langchain` | 🔴 Critical |
| 3.3 Hybrid Search | BM25 + vector search | `pg_bm25` или custom | 🟡 High |
| 3.4 Chunking Strategies | Recursive, semantic, fixed | `langchain/text_splitter` | 🟢 Medium |

**Детали 3.1 — PgVector Migration:**
```sql
-- migrations/001_pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

**Детали 3.2 — Ingest Pipeline:**
```typescript
// src/api/rag/IngestPipeline.ts
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitters';
import Anthropic from '@anthropic-ai/sdk';

export class IngestPipeline {
  private splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 50,
  });
  
  private anthropic = new Anthropic();
  
  async ingest(document: string, metadata: object) {
    // 1. Split into chunks
    const chunks = await this.splitter.splitText(document);
    
    // 2. Generate embeddings
    const embeddings = await Promise.all(
      chunks.map(chunk => this.embed(chunk))
    );
    
    // 3. Store in pgvector
    for (let i = 0; i < chunks.length; i++) {
      await db.query(
        'INSERT INTO documents (content, embedding, metadata) VALUES ($1, $2, $3)',
        [chunks[i], embeddings[i], metadata]
      );
    }
  }
  
  private async embed(text: string) {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
      messages: [{ role: 'user', content: text }],
    });
    // В реальности использовать embedding API (OpenAI или Voyage)
  }
}
```

---

### Phase 4: Observability (1-2 недели)
**Цель:** Полная видимость в работу системы

| Задача | Описание | Библиотеки | Приоритет |
|--------|----------|------------|-----------|
| 4.1 OTEL Integration | Трейсинг всех LLM вызовов | `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node` | 🔴 Critical |
| 4.2 Grafana Stack | Tempo + Prometheus + Grafana | Docker Compose / Helm | 🟡 High |
| 4.3 Cost Tracking | Подсчёт токенов и стоимости | Custom middleware | 🟡 High |
| 4.4 Error Overlay | Красивые ошибки в UI | React Error Boundary | 🟢 Medium |

**Детали 4.1 — OTEL Setup:**
```typescript
// src/api/telemetry/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';

const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'vibe-ide',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
});

sdk.start();

// LLM call wrapper with tracing
export async function tracedLLMCall(name: string, fn: () => Promise<any>) {
  const span = tracer.startSpan(name);
  try {
    const result = await fn();
    span.setAttribute('tokens.input', result.usage?.input_tokens);
    span.setAttribute('tokens.output', result.usage?.output_tokens);
    span.setAttribute('cost', calculateCost(result.usage));
    return result;
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

---

### Phase 5: Production Hardening (2-3 недели)
**Цель:** Готовность к production deploy

| Задача | Описание | Приоритет |
|--------|----------|-----------|
| 5.1 Authentication | Auth0 / Clerk интеграция | 🔴 Critical |
| 5.2 Rate Limiting | Защита API endpoints | 🔴 Critical |
| 5.3 Error Handling | Graceful degradation | 🟡 High |
| 5.4 Performance | Code splitting, lazy loading | 🟡 High |
| 5.5 Testing | Unit + Integration + E2E | 🟡 High |
| 5.6 CI/CD | GitHub Actions pipeline | 🟢 Medium |
| 5.7 Documentation | API docs, user guide | 🟢 Medium |

---

## 📊 Оценка времени

| Фаза | Длительность | Ресурсы |
|------|--------------|---------|
| Phase 1: Core | 2-3 недели | 1-2 dev |
| Phase 2: Agents | 2-3 недели | 1-2 dev |
| Phase 3: RAG | 2-3 недели | 1-2 dev |
| Phase 4: Observability | 1-2 недели | 1 dev |
| Phase 5: Hardening | 2-3 недели | 1-2 dev |
| **ИТОГО** | **10-14 недель** | |

---

## 🛠️ Tech Stack (финальный)

### Frontend
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Editor:** Monaco Editor
- **Collaboration:** Liveblocks + Yjs
- **Charts:** Recharts
- **i18n:** react-i18next

### Backend
- **Runtime:** Node.js / Bun
- **API:** tRPC или REST (Express/Fastify)
- **Database:** PostgreSQL + pgvector
- **Cache:** Redis
- **Message Bus:** NATS
- **Search:** PostgreSQL FTS + pg_bm25

### AI/ML
- **LLM Provider:** Anthropic Claude
- **Agent Framework:** LangChain.js
- **Embeddings:** OpenAI / Voyage AI
- **Vector DB:** pgvector

### DevOps
- **Containers:** Docker
- **Orchestration:** Kubernetes / Fly.io
- **Monitoring:** Grafana + Tempo + Prometheus
- **Tracing:** OpenTelemetry
- **CI/CD:** GitHub Actions

---

## ✅ Checklist для запуска

### Pre-launch
- [ ] Все Phase 1-4 завершены
- [ ] Unit tests покрытие > 70%
- [ ] E2E tests для критических flows
- [ ] Security audit пройден
- [ ] Performance benchmarks OK
- [ ] Documentation готова

### Launch day
- [ ] Staging environment протестирован
- [ ] Rollback plan готов
- [ ] Monitoring alerts настроены
- [ ] On-call schedule определён
- [ ] Communication plan готов

### Post-launch
- [ ] Собирать user feedback
- [ ] Monitor error rates
- [ ] Iterate based on usage data

---

## 🎯 Метрики успеха

| Метрика | Target | Измерение |
|---------|--------|-----------|
| Time to first edit | < 3 sec | Performance monitoring |
| Collaboration latency | < 100ms | Liveblocks metrics |
| LLM response time | < 5 sec | OTEL traces |
| Error rate | < 0.1% | Grafana dashboards |
| User satisfaction | > 4.5/5 | NPS surveys |

---

## 📞 Контакты

Вопросы по roadmap → создать GitHub Issue
