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
| ✅ | **NATS EventBus** | **КОД НАПИСАН** | nats.ws клиент + mock fallback, нужен NATS сервер (см. Phase 4) |
| ✅ | **pgvector / RAG** | **КОД НАПИСАН** | Backend + frontend готовы, нужно подключить БД (см. Phase 3) |
| ✅ | **OTEL Export** | **КОД НАПИСАН** | Dual export (InMemory + Grafana Tempo), нужен Grafana Cloud (см. Phase 5) |
| ✅ | **Clerk Auth** | **КОД НАПИСАН** | ClerkProvider + mock fallback, нужен Clerk аккаунт (см. Phase 6) |

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

### Phase 3: pgvector + Backend — реальный RAG ✅ КОД НАПИСАН

> **Статус:** Весь код backend и frontend написан. Для активации реального RAG нужно только подключить PostgreSQL с pgvector. Без бекенда фронтенд автоматически использует мок-данные.

**Архитектура:**

```
Frontend (Vite :3000)  →  /api/rag/*  →  Backend (Express :3001)  →  PostgreSQL + pgvector
                                                   ↓
                                            Gemini text-embedding-004
```

#### Написанные файлы

```
backend/
├── package.json        # Express + pg + pgvector + dotenv + cors
├── .env.example        # Документация env-переменных
├── index.js            # Express сервер (порт 3001)
├── db.js               # pg Pool из DATABASE_URL
├── embeddings.js       # Gemini text-embedding-004 (768 dims)
├── schema.sql          # Идемпотентная DDL — таблица, индексы, hybrid_search()
└── routes/
    ├── health.js       # GET  /api/rag/health  — проверка подключения к БД
    ├── search.js       # POST /api/rag/search  — vector / bm25 / hybrid
    └── ingest.js       # POST /api/rag/ingest  — эмбеддинг + сохранение

src/api/rag/client.js   # Fetch-обёртка с health-check и fallback на мок
```

#### 🔌 Инструкция: Подключение своей БД

##### Вариант A — Docker (локальная разработка)

```bash
# 1. Запустить PostgreSQL с pgvector:
docker run -d --name pgvector \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=vibe_rag \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# 2. Применить схему (таблица, индексы, функция hybrid_search):
psql postgresql://postgres:secret@localhost:5432/vibe_rag -f backend/schema.sql

# 3. Настроить backend:
cp backend/.env.example backend/.env
# Отредактировать backend/.env:
#   DATABASE_URL=postgresql://postgres:secret@localhost:5432/vibe_rag
#   GEMINI_API_KEY=AIzaSy...  (тот же ключ что во фронтенде)

# 4. Запустить backend:
cd backend && npm install && npm run dev    # порт 3001

# 5. Запустить frontend (в другом терминале):
npm run dev                                  # порт 3000
# RAG Playground покажет бейдж "Connected" вместо "Mock mode"
```

##### Вариант B — Supabase (бесплатный хостинг)

1. Создать проект на [supabase.com](https://supabase.com)
2. Включить расширение Vector: Database → Extensions → vector → Enable
3. Запустить `backend/schema.sql` в SQL Editor (пропустить строку `CREATE EXTENSION` — Supabase уже включил)
4. Скопировать connection string: Project Settings → Database → Connection String (URI)
5. В `backend/.env`: `DATABASE_URL=<connection-string>`

##### Вариант C — Neon (бесплатный хостинг, pgvector предустановлен)

1. Создать проект на [neon.tech](https://neon.tech)
2. pgvector уже предустановлен
3. Запустить `backend/schema.sql` в SQL Editor
4. В `backend/.env`: `DATABASE_URL=<neon-connection-string>`

#### Env переменные

| Переменная | Где | Значение |
|-----------|-----|---------|
| `DATABASE_URL` | `backend/.env` | `postgresql://postgres:secret@localhost:5432/vibe_rag` |
| `GEMINI_API_KEY` | `backend/.env` | тот же ключ что `VITE_GEMINI_API_KEY` |
| `PORT` | `backend/.env` | `3001` (по умолчанию) |
| `VITE_RAG_BACKEND_URL` | `frontend .env` | не нужно в dev (Vite proxy), для prod: URL бекенда |

#### Как это работает

- **С бекендом:** RAG Playground → `ragSearch()` → health-check OK → `POST /api/rag/search` → PostgreSQL + pgvector → реальные результаты
- **Без бекенда:** RAG Playground → `ragSearch()` → health-check FAIL → fallback на `RAG_MOCK_RESULTS` → мок-данные (UI работает как раньше)
- **Режимы поиска:**
  - `hybrid` — BM25 + vector (вес 60/40), функция `hybrid_search()` в PostgreSQL
  - `vector` — cosine similarity через pgvector, нужен GEMINI_API_KEY
  - `bm25` — полнотекстовый поиск, работает без Gemini ключа

---

### Phase 4: NATS — реальный event bus ✅ КОД НАПИСАН

> **Статус:** Клиент `nats.ws` и мок-генератор написаны. `EventBusInspector` подключён. Для активации реального NATS нужно запустить сервер и задать `VITE_NATS_URL`.

#### Написанные файлы

```
src/api/nats/
├── client.js           # NATS WebSocket клиент + fallback на мок
└── mockEvents.js       # Генератор мок-событий (извлечён из EventBusInspector)
```

- `EventBusInspector.jsx` обновлён — использует `subscribeToEvents()` из клиента, показывает бейдж "Live NATS" / "Mock"

#### 🔌 Инструкция: Подключение NATS

```bash
# 1. Запустить NATS с JetStream + WebSocket:
docker run -d --name nats \
  -p 4222:4222 -p 8222:8222 -p 9222:9222 \
  nats -js -m 8222 --websocket_port 9222

# 2. Добавить в .env фронтенда:
echo "VITE_NATS_URL=ws://localhost:9222" >> .env

# 3. Перезапустить фронтенд:
npm run dev
# EventBusInspector покажет бейдж "Live NATS" вместо "Mock"
```

#### Публикация событий из бекенда

Для отправки реальных событий из backend (или другого сервиса):

```bash
# Установить NATS CLI:
# https://github.com/nats-io/natscli

# Опубликовать событие:
nats pub agents.codereviewer.result '{"status":"success","duration":1234}'
nats pub rag.search.response '{"query":"API docs","results":5}'
nats pub llm.complete '{"model":"gemini-2.0-flash","tokens":500}'
```

**Env:** `VITE_NATS_URL=ws://localhost:9222`
**NATS subjects:** `agents.>`, `rag.>`, `llm.>`, `tools.>`, `system.>`

---

### Phase 5: Grafana Cloud — внешний OTEL экспорт ✅ КОД НАПИСАН

> **Статус:** Dual-export реализован в `tracer.js`. Трейсы всегда идут в InMemory (DebugViewer работает). Если заданы `VITE_GRAFANA_ENDPOINT` + `VITE_GRAFANA_TOKEN` — дополнительно экспортируются в Grafana Tempo.

#### Как это работает

- `tracer.js` всегда регистрирует `InMemorySpanExporter` (DebugViewer продолжает работать)
- Если env-переменные Grafana заданы — динамически подключает `OTLPTraceExporter` (второй span processor)
- Оба экспортёра работают одновременно

#### 🔌 Инструкция: Подключение Grafana Cloud

1. **Зарегистрироваться** на [grafana.com](https://grafana.com) (бесплатный tier, 14 дней retention)
2. **Создать stack** → перейти в Grafana Cloud Portal
3. **Получить Tempo endpoint:**
   - Grafana Cloud Portal → Tempo → Details
   - Скопировать URL (например `https://tempo-us-central1.grafana.net`)
4. **Создать API token:**
   - Grafana Cloud Portal → Access Policies → Create token
   - Scope: `traces:write`
5. **Добавить в `.env` фронтенда:**

```bash
VITE_GRAFANA_ENDPOINT=https://tempo-us-central1.grafana.net
VITE_GRAFANA_TOKEN=instanceId:apiKey
# Формат токена: "instanceId:apiKey" (Instance ID из Tempo Details + API key)
```

6. **Перезапустить фронтенд** — в консоли появится `[otel] Grafana Tempo exporter подключён`
7. **Проверить:** Grafana → Explore → Tempo → Search → увидеть трейсы из Vibe IDE

#### Grafana Dashboard

Рекомендуемые метрики для дашборда:
- **Latency per agent** — распределение времени выполнения по агентам
- **Token usage** — input/output токены за период
- **Cost per request** — стоимость LLM вызовов
- **Error rate** — процент ошибок по типам

**Env:** `VITE_GRAFANA_ENDPOINT`, `VITE_GRAFANA_TOKEN`

---

### Phase 6: Auth — Clerk ✅ КОД НАПИСАН

> **Статус:** ClerkProvider с mock fallback написан. Без Clerk ключа — всё работает как раньше (случайные имена гостей). С Clerk ключом — реальные имена и аватары в коллаборации.

#### Написанные файлы

```
src/api/clerk/provider.jsx      # VibeClerkProvider + useVibeUser() + mock fallback
```

- `App.jsx` — split на `VibeIDE` (ClerkProvider shell) → `VibeIDEInner` (useVibeUser + RoomProvider)
- `hooks/index.js` — `avatar` добавлен в маппинг `useCollaborators`
- `Header.jsx` — реальные аватары (img) или буквы (fallback)
- `initialPresence` расширен: `{ name, avatar, cursor }`

#### Как это работает

- **Без Clerk:** `useVibeUser()` → `{ name: 'Alex42', avatar: null, isSignedIn: false }` — случайное гостевое имя, UI без изменений
- **С Clerk:** `useVibeUser()` → `{ name: 'John Doe', avatar: 'https://...', isSignedIn: true }` — реальные данные из Clerk
- **Аватары:** Если `avatar` URL — рендерится `<img>`. Если null — цветной круг с буквой (как раньше)
- **Liveblocks presence:** имя и аватар из Clerk передаются в `initialPresence`, другие участники видят реальные данные

#### 🔌 Инструкция: Подключение Clerk

```bash
# 1. Зарегистрироваться на https://clerk.com (бесплатный tier — 10K MAU)
# 2. Создать приложение → Dashboard → API Keys

# 3. Добавить Publishable Key в .env:
echo "VITE_CLERK_PUBLISHABLE_KEY=pk_test_..." >> .env

# 4. Перезапустить фронтенд:
npm run dev
# Появится Clerk Sign-In UI, аватары и имена — реальные
```

#### Настройка Clerk Dashboard

1. **Authentication** → включить нужные методы (Email, Google, GitHub)
2. **Customization** → Appearance → выбрать тему (тёмная подходит к Vibe IDE)
3. **Production:** заменить `pk_test_...` на `pk_live_...` при деплое

**Env:** `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`

---

## 📊 Приоритеты

| Фаза | Что нужно | Сложность | Импакт |
|------|-----------|-----------|--------|
| **2. Cursor AI** | Gemini ключ (уже есть) | ~1 день | 🔥🔥🔥 WOW-фича |
| **3. pgvector RAG** | Docker + PostgreSQL | ✅ Код написан | 🔥🔥🔥 Реальная база |
| **4. NATS** | Docker | ✅ Код написан | 🔥🔥 Живой event bus |
| **5. Grafana** | Grafana Cloud (бесплатно) | ✅ Код написан | 🔥🔥 Аналитика |
| **6. Clerk Auth** | Clerk (бесплатно) | ✅ Код написан | 🔥 Юзеры с именами |

---

## 📁 Структура проекта

```
vibe-ide/
├── src/
│   ├── App.jsx                       # Main entry + VibeClerkProvider + RoomProvider
│   ├── api/
│   │   ├── anthropic/client.js       # ✅ РЕАЛЬНО (Gemini 2.0 Flash + мок fallback)
│   │   ├── clerk/provider.jsx        # ✅ РЕАЛЬНО (ClerkProvider + mock fallback)
│   │   ├── rag/client.js             # ✅ РЕАЛЬНО (fetch + mock fallback)
│   │   ├── nats/client.js            # ✅ РЕАЛЬНО (nats.ws + mock fallback)
│   │   ├── nats/mockEvents.js       # Мок-генератор событий (fallback)
│   │   ├── liveblocks/config.jsx     # ✅ РЕАЛЬНО (createRoomContext)
│   │   └── telemetry/tracer.js       # ✅ РЕАЛЬНО (dual: InMemory + Grafana Tempo)
│   ├── components/
│   │   ├── editor/
│   │   │   ├── CodeEditor.jsx        # ✅ Monaco + Yjs CRDT (+ inline AI Phase 2)
│   │   │   └── LivePreview.jsx       # Sandbox executor
│   │   ├── agents/AgentBuilder.jsx   # ✅ РЕАЛЬНО (7 шаблонов, Gemini)
│   │   ├── rag/RAGPlayground.jsx     # ✅ РЕАЛЬНО (подключён к backend)
│   │   └── debug/DebugViewer.jsx     # ✅ OTEL viewer (→ Grafana Phase 5)
│   ├── hooks/index.js                # ✅ useCollaborators (Liveblocks)
│   └── stores/index.js               # ✅ Zustand
├── backend/                          # ✅ РЕАЛЬНО (Phase 3 — нужна БД для активации)
│   ├── package.json                  # Express + pg + pgvector + dotenv
│   ├── .env.example                  # Документация env-переменных
│   ├── index.js                      # Express сервер (порт 3001)
│   ├── db.js                         # pg Pool из DATABASE_URL
│   ├── embeddings.js                 # Gemini text-embedding-004
│   ├── schema.sql                    # Идемпотентная DDL (psql -f schema.sql)
│   └── routes/
│       ├── health.js                 # GET  /api/rag/health
│       ├── search.js                 # POST /api/rag/search
│       └── ingest.js                 # POST /api/rag/ingest
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
