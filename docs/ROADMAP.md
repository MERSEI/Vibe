# 🚀 Vibe IDE — Production Roadmap

## Текущий статус
**MVP Demo с реальными интеграциями** — живёт на Vercel, CRDT-коллаборация работает через Liveblocks + Yjs.

---

## ✅ Что уже реализовано (сделано)

| # | Интеграция | Статус | Детали |
|---|-----------|--------|--------|
| ✅ | **Monaco Editor** | **РЕАЛЬНО** | `@monaco-editor/react` — minimap, autocomplete, Ctrl+F, multi-cursor |
| ✅ | **Liveblocks Presence** | **РЕАЛЬНО** | WebSocket к liveblocks.io, счётчик и аватары коллабораторов |
| ✅ | **Yjs CRDT** | **РЕАЛЬНО** | Синхронизация текста через `@liveblocks/yjs` + manual Yjs↔Monaco sync |
| ✅ | **OpenTelemetry** | **РЕАЛЬНО** | `WebTracerProvider` + `InMemorySpanExporter`, трейсы в DebugViewer |
| ✅ | **Zustand stores** | **РЕАЛЬНО** | Файлы, темы, UI, коллабораторы |
| ✅ | **Vercel Deploy** | **РЕАЛЬНО** | Публичный URL, CI через GitHub |
| ✅ | **Dark/Light theme** | **РЕАЛЬНО** | Toggle, persists в store |
| ✅ | **i18n EN/RU** | **РЕАЛЬНО** | Переключение языка |
| 🟡 | **Anthropic API** | **МОК** | Реалистичные ответы + задержка, OTEL трейсы пишутся |
| 🟡 | **NATS EventBus** | **МОК** | `setInterval` генерирует события |
| 🟡 | **pgvector / RAG** | **МОК** | Хардкоженные 3 документа |
| 🟡 | **AgentBuilder DAG** | **МОК** | Визуальный drag-and-drop, run — мок |

---

## 🗺️ Дорожная карта по фазам

---

### Phase 2: Anthropic API — реальный LLM
**Что нужно:** API ключ `sk-ant-...`
**Сложность:** ~2 часа, 1 файл (`src/api/anthropic/client.js`)

| Задача | Описание | Что менять |
|--------|----------|------------|
| 2.1 Реальный `sendMessage()` | Убрать мок, подключить SDK | `client.js` — раскомментировать реальный вызов |
| 2.2 Streaming | Потоковый вывод токенов в UI | `client.js` + `RAGPlayground.jsx` + `AgentBuilder.jsx` |
| 2.3 Tool use | Вызов инструментов через Claude | Новый `tools/` модуль |

```js
// src/api/anthropic/client.js — раскомментировать:
const response = await anthropic.messages.create({
  model: 'claude-opus-4-6',
  max_tokens: 2048,
  messages: [{ role: 'user', content: message }],
});
```

**Env:** `VITE_ANTHROPIC_API_KEY=sk-ant-...` (уже есть прокси в vite.config.js)

---

### Phase 3: Cursor-style AI — автодополнение в Monaco
**Что нужно:** Anthropic API ключ (Phase 2) + Monaco inline completions
**Сложность:** ~1 день

| Задача | Описание |
|--------|----------|
| 3.1 Inline suggestions | `monaco.languages.registerInlineCompletionsProvider` |
| 3.2 Ghost text | Серый текст как в Cursor при Tab-дополнении |
| 3.3 Debounce + контекст | Отправлять ±10 строк вокруг курсора |

```js
// В CodeEditor.jsx после onMount:
monaco.languages.registerInlineCompletionsProvider('*', {
  provideInlineCompletions: async (model, position) => {
    const code = model.getValue();
    const suggestion = await getAISuggestion(code, position);
    return { items: [{ insertText: suggestion }] };
  },
  freeInlineCompletions: () => {},
});
```

---

### Phase 4: NATS — реальный event bus
**Что нужно:** NATS сервер (self-hosted или nats.io cloud)
**Сложность:** ~4 часа

| Задача | Описание |
|--------|----------|
| 4.1 NATS.ws | `nats.ws` — NATS через WebSocket для браузера |
| 4.2 Замена setInterval | Реальные события от агентов |
| 4.3 Agent pub/sub | Агенты публикуют результаты в subjects |

```bash
# Docker быстрый старт:
docker run -p 4222:4222 -p 8222:8222 nats -js
# Добавить WebSocket listener: -p 9222:9222 --config nats-ws.conf
```

```js
import { connect, JSONCodec } from 'nats.ws';
const nc = await connect({ servers: 'ws://localhost:9222' });
```

**Env:** `VITE_NATS_URL=ws://localhost:9222`

---

### Phase 5: pgvector — реальный RAG
**Что нужно:** PostgreSQL + pgvector + embedding API
**Сложность:** ~1 день + backend сервер

| Задача | Описание |
|--------|----------|
| 5.1 Backend API | Express/Fastify `/api/rag/search` и `/api/rag/ingest` |
| 5.2 pgvector | PostgreSQL + `CREATE EXTENSION vector` |
| 5.3 Embeddings | Voyage AI или OpenAI `text-embedding-3-small` |
| 5.4 Hybrid search | FTS + vector cosine similarity |

```sql
CREATE EXTENSION vector;
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT,
  embedding vector(1024),
  metadata JSONB
);
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);
```

**Вариант без backend:** Supabase (PostgreSQL + pgvector + REST API из коробки)

---

### Phase 6: Auth — Clerk или Auth0
**Что нужно:** Clerk аккаунт (бесплатный tier)
**Сложность:** ~2 часа

| Задача | Описание |
|--------|----------|
| 6.1 Clerk install | `@clerk/clerk-react` |
| 6.2 ClerkProvider | Обернуть App.jsx |
| 6.3 Liveblocks auth | Использовать Clerk userId в Liveblocks presence |
| 6.4 Protected routes | `useAuth()` hook |

```jsx
import { ClerkProvider, useUser } from '@clerk/clerk-react';
// userId → Liveblocks presence name вместо 'Me'
```

---

### Phase 7: Grafana / Tempo — внешний OTEL экспорт
**Что нужно:** Grafana Cloud аккаунт (бесплатный tier)
**Сложность:** ~2 часа

Сейчас трейсы хранятся в памяти (`InMemorySpanExporter`).
Заменить на `OTLPTraceExporter` → Grafana Tempo:

```js
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const exporter = new OTLPTraceExporter({
  url: 'https://tempo-us-central1.grafana.net/tempo/api/push',
  headers: { Authorization: `Basic ${btoa(instanceId + ':' + apiKey)}` },
});
```

**Env:** `VITE_GRAFANA_ENDPOINT`, `VITE_GRAFANA_TOKEN`

---

## 📊 Приоритеты

| Фаза | Что нужно | Импакт для демо |
|------|-----------|----------------|
| **2. Anthropic API** | API ключ | 🔥🔥🔥 Агенты реально отвечают |
| **3. Cursor AI** | API ключ | 🔥🔥🔥 Главная WOW-фича |
| **4. NATS** | Docker / nats.io | 🔥🔥 EventBus живой |
| **6. Auth** | Clerk аккаунт | 🔥🔥 Юзеры с именами |
| **5. pgvector** | PostgreSQL сервер | 🔥 RAG реальный |
| **7. Grafana** | Grafana Cloud | 🔥 Трейсы наружу |

---

## 📁 Структура проекта

```
vibe-ide/
├── src/
│   ├── App.jsx                       # Main entry + RoomProvider
│   ├── api/
│   │   ├── anthropic/client.js       # 🟡 МОК → Phase 2
│   │   ├── liveblocks/config.jsx     # ✅ РЕАЛЬНО (createRoomContext)
│   │   └── telemetry/tracer.js       # ✅ РЕАЛЬНО (OTEL in-memory)
│   ├── components/
│   │   ├── editor/
│   │   │   ├── CodeEditor.jsx        # ✅ Monaco + Yjs CRDT
│   │   │   └── LivePreview.jsx       # Sandbox executor
│   │   ├── agents/AgentBuilder.jsx   # 🟡 МОК DAG
│   │   ├── rag/RAGPlayground.jsx     # 🟡 МОК search
│   │   └── debug/DebugViewer.jsx     # ✅ OTEL viewer
│   ├── hooks/index.js                # ✅ useCollaborators (Liveblocks)
│   └── stores/index.js               # ✅ Zustand
├── docs/ROADMAP.md                   # Этот файл
└── .env                              # VITE_LIVEBLOCKS_PUBLIC_KEY (не в git)
```

---

## ⌨️ Быстрый старт

```bash
git clone https://github.com/MERSEI/Vibe.git
cd Vibe
npm install
echo "VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_..." > .env
npm run dev
# Открыть в двух вкладках — CRDT работает
```
