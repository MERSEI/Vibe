# 🚀 Vibe IDE — Production Roadmap

## Текущий статус
**MVP с реальными интеграциями** — живёт на Vercel, CRDT-коллаборация через Liveblocks + Yjs, AI-агенты через Google Gemini API (бесплатно).

---

## ✅ Что уже реализовано

| # | Интеграция | Статус | Детали |
|---|-----------|--------|--------|
| ✅ | **Monaco Editor** | **РЕАЛЬНО** | `@monaco-editor/react` — minimap, autocomplete, Ctrl+F, multi-cursor |
| ✅ | **Liveblocks Presence** | **РЕАЛЬНО** | WebSocket к liveblocks.io, счётчик и аватары коллабораторов |
| ✅ | **Yjs CRDT** | **РЕАЛЬНО** | Синхронизация текста через `@liveblocks/yjs` + manual Yjs↔Monaco sync |
| ✅ | **OpenTelemetry** | **РЕАЛЬНО** | `WebTracerProvider` + `InMemorySpanExporter`, трейсы в DebugViewer |
| ✅ | **Zustand stores** | **РЕАЛЬНО** | Файлы, темы, UI, коллабораторы, трейсы |
| ✅ | **Vercel Deploy** | **РЕАЛЬНО** | Публичный URL, CI через GitHub |
| ✅ | **Dark/Light theme** | **РЕАЛЬНО** | Toggle, persists в store |
| ✅ | **i18n EN/RU** | **РЕАЛЬНО** | Переключение языка |
| ✅ | **Gemini API** | **РЕАЛЬНО** | `gemini-2.0-flash` через OpenAI-совместимый endpoint, fallback на мок |
| ✅ | **AgentBuilder DAG** | **РЕАЛЬНО** | 7 шаблонов, drag-and-drop, реальные AI-ответы |
| 🟡 | **NATS EventBus** | **МОК** | `setInterval` генерирует события → Phase 4 |
| 🟡 | **pgvector / RAG** | **МОК** | 10 документов хардкод → Phase 3 |
| 🟡 | **OTEL Export** | **IN-MEMORY** | Трейсы только локально → Phase 5 |

---

## 🗺️ Дорожная карта по фазам

---

### Phase 2: Cursor-style AI — автодополнение в Monaco
**Что нужно:** `VITE_GEMINI_API_KEY` (уже есть) + Monaco inline completions API
**Сложность:** ~1 день

| Задача | Описание |
|--------|----------|
| 2.1 Inline suggestions | `monaco.languages.registerInlineCompletionsProvider` |
| 2.2 Ghost text | Серый текст как в Cursor при Tab-дополнении |
| 2.3 Debounce + контекст | Отправлять ±10 строк вокруг курсора с 300ms debounce |

```js
// В CodeEditor.jsx после onMount:
monaco.languages.registerInlineCompletionsProvider('*', {
  provideInlineCompletions: async (model, position) => {
    const lines = model.getLinesContent();
    const lineIdx = position.lineNumber - 1;
    const context = lines.slice(Math.max(0, lineIdx - 10), lineIdx + 10).join('\n');
    const suggestion = await sendMessage({
      model: 'claude-3-haiku',
      systemPrompt: 'Complete the code. Return only the completion, no explanation.',
      userMessage: context,
    });
    return { items: [{ insertText: suggestion.text }] };
  },
  freeInlineCompletions: () => {},
});
```

**Env:** `VITE_GEMINI_API_KEY` (уже задан)

---

### Phase 3: pgvector — реальный RAG
**Что нужно:** PostgreSQL + pgvector. Рекомендуется Supabase (бесплатный tier).
**Сложность:** ~1-2 дня

| Задача | Описание |
|--------|----------|
| 3.1 Supabase проект | Создать на supabase.com, включить pgvector |
| 3.2 SQL схема | Таблица `documents` с vector(768) колонкой |
| 3.3 Embeddings | Gemini Embedding API (`text-embedding-004`, 768 dim, бесплатно) |
| 3.4 Backend API | Vite proxy → Supabase REST для `/api/rag/search` и `/api/rag/ingest` |
| 3.5 Hybrid search | FTS (ts_vector) + vector cosine similarity (pgvector `<=>`) |

```sql
-- Supabase SQL Editor:
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Функция гибридного поиска:
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding vector(768),
  match_count INT DEFAULT 5
)
RETURNS TABLE(id UUID, content TEXT, score FLOAT, metadata JSONB) AS $$
  SELECT id, content,
    (0.5 * (1 - (embedding <=> query_embedding)) +
     0.5 * ts_rank(to_tsvector('english', content), plainto_tsquery(query_text))) AS score,
    metadata
  FROM documents
  ORDER BY score DESC
  LIMIT match_count;
$$ LANGUAGE sql;
```

```js
// src/api/rag/client.js (новый файл):
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function ragSearch(query) {
  // 1. Получить embedding через Gemini
  const embRes = await fetch('/api/gemini/v1beta/models/text-embedding-004:embedContent', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${import.meta.env.VITE_GEMINI_API_KEY}` },
    body: JSON.stringify({ content: { parts: [{ text: query }] } }),
  });
  const { embedding } = await embRes.json();

  // 2. Hybrid search в pgvector
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/hybrid_search`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_text: query, query_embedding: embedding.values }),
  });
  return res.json();
}
```

**Env:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
**Альтернатива:** self-hosted PostgreSQL + pgvector + Express backend

---

### Phase 4: NATS — реальный event bus
**Что нужно:** NATS сервер (self-hosted Docker или nats.io cloud)
**Сложность:** ~4-6 часов

| Задача | Описание |
|--------|----------|
| 4.1 NATS сервер | Docker с JetStream + WebSocket listener |
| 4.2 `nats.ws` | Браузерный клиент через WebSocket |
| 4.3 Замена setInterval | Реальные события от агентов через pub/sub |
| 4.4 Agent pub/sub | Агенты публикуют результаты в subjects |

```bash
# Docker быстрый старт с JetStream + WebSocket:
docker run -d --name nats \
  -p 4222:4222 -p 8222:8222 -p 9222:9222 \
  nats -js -m 8222 --websocket_port 9222
```

```js
// src/api/nats/client.js (новый файл):
import { connect, JSONCodec } from 'nats.ws';

const jc = JSONCodec();
let nc = null;

export async function getNatsConnection() {
  if (!nc) {
    nc = await connect({ servers: import.meta.env.VITE_NATS_URL ?? 'ws://localhost:9222' });
  }
  return nc;
}

export async function publishAgentResult(agentId, result) {
  const conn = await getNatsConnection();
  conn.publish(`agents.${agentId}.result`, jc.encode(result));
}

export function subscribeToAgents(callback) {
  getNatsConnection().then(conn => {
    const sub = conn.subscribe('agents.*.result');
    (async () => {
      for await (const msg of sub) {
        callback(jc.decode(msg.data));
      }
    })();
    return sub;
  });
}
```

**Env:** `VITE_NATS_URL=ws://localhost:9222`
**NATS subjects:** `agents.{id}.result`, `rag.search.response`, `llm.token.stream`, `system.health`

---

### Phase 5: Grafana Cloud — внешний OTEL экспорт
**Что нужно:** Grafana Cloud аккаунт (бесплатный tier, 14 дней retention)
**Сложность:** ~2-3 часа

Сейчас трейсы хранятся только в памяти (`InMemorySpanExporter`, последние 50 спанов).
Заменить на `OTLPTraceExporter` → Grafana Tempo для персистентного хранения и дашбордов.

| Задача | Описание |
|--------|----------|
| 5.1 Grafana Cloud | Зарегистрироваться на grafana.com, создать stack |
| 5.2 Tempo endpoint | Получить URL + Instance ID + API key |
| 5.3 OTLPTraceExporter | Заменить InMemorySpanExporter в `tracer.js` |
| 5.4 Дашборд | Импортировать готовый LLM Observability дашборд |

```js
// src/api/telemetry/tracer.js — заменить экспортер:
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-web';

const GRAFANA_ENDPOINT = import.meta.env.VITE_GRAFANA_ENDPOINT;
const GRAFANA_TOKEN = import.meta.env.VITE_GRAFANA_TOKEN;

// Если ключи заданы — реальный Grafana, иначе in-memory
const exporter = GRAFANA_ENDPOINT
  ? new OTLPTraceExporter({
      url: `${GRAFANA_ENDPOINT}/otlp/v1/traces`,
      headers: { Authorization: `Basic ${btoa(GRAFANA_TOKEN)}` },
    })
  : new InMemorySpanExporter();
```

**Env:** `VITE_GRAFANA_ENDPOINT=https://tempo-us-central1.grafana.net`, `VITE_GRAFANA_TOKEN=instanceId:apiKey`
**Метрики в Grafana:** latency per agent, token usage, cost per request, error rate

---

### Phase 6: Auth — Clerk
**Что нужно:** Clerk аккаунт (бесплатный tier)
**Сложность:** ~2-3 часа

| Задача | Описание |
|--------|----------|
| 6.1 Clerk install | `npm install @clerk/clerk-react` |
| 6.2 ClerkProvider | Обернуть `App.jsx` |
| 6.3 Liveblocks auth | Clerk `userId` → Liveblocks presence `name` |
| 6.4 Protected routes | `useAuth()` hook перед загрузкой IDE |

```jsx
// App.jsx:
import { ClerkProvider, useUser } from '@clerk/clerk-react';

// В RoomProvider presence:
const { user } = useUser();
initialPresence={{ name: user?.firstName ?? 'Anonymous', cursor: null }}
```

**Env:** `VITE_CLERK_PUBLISHABLE_KEY=pk_live_...`

---

## 📊 Приоритеты

| Фаза | Что нужно | Сложность | Импакт |
|------|-----------|-----------|--------|
| **2. Cursor AI** | Gemini ключ (уже есть) | ~1 день | 🔥🔥🔥 WOW-фича |
| **3. pgvector RAG** | Supabase (бесплатно) | ~2 дня | 🔥🔥🔥 Реальная база |
| **4. NATS** | Docker | ~half-day | 🔥🔥 Живой event bus |
| **5. Grafana** | Grafana Cloud (бесплатно) | ~2-3 часа | 🔥🔥 Аналитика |
| **6. Clerk Auth** | Clerk (бесплатно) | ~2-3 часа | 🔥 Юзеры с именами |

---

## 📁 Структура проекта

```
vibe-ide/
├── src/
│   ├── App.jsx                       # Main entry + RoomProvider
│   ├── api/
│   │   ├── anthropic/client.js       # ✅ РЕАЛЬНО (Gemini 2.0 Flash + мок fallback)
│   │   ├── rag/client.js             # 🟡 МОК → Phase 3 (pgvector + Supabase)
│   │   ├── nats/client.js            # 🟡 МОК → Phase 4 (NATS.ws)
│   │   ├── liveblocks/config.jsx     # ✅ РЕАЛЬНО (createRoomContext)
│   │   └── telemetry/tracer.js       # ✅ РЕАЛЬНО (in-memory → Grafana Phase 5)
│   ├── components/
│   │   ├── editor/
│   │   │   ├── CodeEditor.jsx        # ✅ Monaco + Yjs CRDT (+ inline AI Phase 2)
│   │   │   └── LivePreview.jsx       # Sandbox executor
│   │   ├── agents/AgentBuilder.jsx   # ✅ РЕАЛЬНО (7 шаблонов, Gemini)
│   │   ├── rag/RAGPlayground.jsx     # 🟡 МОК → Phase 3
│   │   └── debug/DebugViewer.jsx     # ✅ OTEL viewer (→ Grafana Phase 5)
│   ├── hooks/index.js                # ✅ useCollaborators (Liveblocks)
│   └── stores/index.js               # ✅ Zustand
├── docs/ROADMAP.md                   # Этот файл
└── .env                              # API ключи (не в git)
```

---

## ⌨️ Быстрый старт

```bash
git clone https://github.com/MERSEI/Vibe.git
cd vibe-ide
npm install

# Минимально (CRDT работает):
echo "VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_..." > .env

# AI-агенты (бесплатный ключ на aistudio.google.com/app/apikey):
echo "VITE_GEMINI_API_KEY=AIza..." >> .env

npm run dev
# Открыть в двух вкладках — CRDT и AI работают
```
