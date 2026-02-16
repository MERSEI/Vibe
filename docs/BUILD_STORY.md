# ⚡ Vibe IDE — История разработки

> **"От impression demo до enterprise IDE за 4 дня — полностью с Claude"**

---

## TL;DR

| | |
|---|---|
| **Период** | 13–16 февраля 2026 |
| **Инструмент** | Claude Code (Haiku 4.5) |
| **Подход** | Итеративные фазы: мок → реальная интеграция → продакшн |
| **Результат** | Полноценная AI IDE с CRDT, агентами, RAG, OTEL — задеплоена на Railway |
| **Размер** | ~3 500 строк React/JS + Express backend |

---

## День 1 — Feb 13: Первый импульс

**Начало:** Пустой репозиторий. Задача — сделать впечатляющее демо IDE.

```
a77fc26  Initial commit: Vibe IDE impression demo
62c856a  Configure Vercel deployment
e696510  feat: add cinematic splash screen and interactive demo showcase
970b632  Merge pull request #1
a169117  fix: make Liveblocks optional with mock providers for demo mode
55330c6  fix: simplify SplashScreen animations and state logic
d3bca55  Merge pull request #2
e94f589  feat: add Russian language support (i18n EN/RU)
91d8730  Merge pull request #3
```

**Что было построено:**
- Кинематографичный splash screen с анимациями
- Monaco Editor — полноценный редактор кода (minimap, autocomplete, Ctrl+F)
- Файловое дерево, вкладки, dark/light тема
- i18n: EN + RU
- Liveblocks присутствие (с mock fallback — без ключа работает как демо)
- Деплой на **Vercel**

**Ключевой паттерн, заложенный здесь:**
> Все интеграции строятся по принципу «real API + mock fallback». Без ключа — мок с реалистичными данными. С ключом — реальный сервис. UI не меняется.

---

## День 2 — Feb 14: CRDT и Gemini

```
50cb01e  feat: Liveblocks CRDT + Yjs Monaco binding
96a59de  fix: replace y-monaco with manual Yjs↔Monaco sync
cfb4a20  fix: inject VibeAgent mock into LivePreview sandbox
60ed680  fix: correct Yjs delta format
e35ffe3  fix: load shared Yjs content on second-tab join
b835de0  fix: use correct 'synced' event name
e711695  docs: update ROADMAP and README
bb476f2  fix: move runtime deps for Vercel
3f02e04  fix: unique random session names
330275c  feat: rich demo file content for all editor files
ce0c85a  fix: per-file content isolation in Monaco
89640f8  feat: integrate Google Gemini API + expand agent templates
```

**Что было построено:**
- **CRDT real-time collaboration**: Liveblocks + Yjs + Monaco binding
  - Открыть IDE в двух вкладках → текст синхронизируется без сервера
  - Потребовалось заменить `y-monaco` на ручную Yjs↔Monaco синхронизацию (библиотека несовместима)
- **Gemini API** вместо OpenAI: бесплатный tier, `gemini-2.0-flash` через OpenAI-совместимый endpoint
- Богатый demo-контент во всех файлах: agent templates, code examples
- **Агентские шаблоны**: ChatBot, RAG-Search, Self-Healing CLI, Code Review, SQL Generator, API Designer

**Технический вызов дня:**
> Liveblocks + Yjs + Monaco — три библиотеки с разными моделями данных. Решение: ручной биндинг через `yText.observe()` → `editor.executeEdits()` и обратно, с флагом `isRemote` для предотвращения циклов.

---

## День 3 — Feb 15: Enterprise интеграции + Railway

```
c8007fd  feat: Phase 3-6 integrations + Railway deployment
cd1b13f  fix: sync package-lock.json
8801056  fix: override Nixpacks install (npm install vs npm ci)
49430ba  fix: pin Node engine to 22.15.1
2e9dc41  fix: regenerate package-lock.json
810a954  feat: add Clerk auth gate — SignIn screen
f666516  fix: Splash → Clerk SignIn → IDE flow
b1234ed  fix: add Gemini API reverse proxy in Express for production
```

**Что было построено за один коммит (Phase 3-6):**

| Фаза | Интеграция | Детали |
|------|-----------|--------|
| 3 | **pgvector + RAG** | Express backend, PostgreSQL + pgvector, hybrid search (BM25 + vector), `POST /api/rag/ingest` с Gemini text-embedding-004 (768 dims) |
| 4 | **NATS Event Bus** | nats.ws клиент, JetStream, mock fallback с авто-генерацией событий, бейдж Live/Mock |
| 5 | **Grafana OTLP** | Dual export: InMemorySpanExporter (DebugViewer) + OTLPTraceExporter (Grafana Tempo) |
| 6 | **Clerk Auth** | ClerkProvider + mock fallback, аватары в CRDT presence |

**Переход с Vercel на Railway:**
- Vercel — только статика, нет Node.js backend
- Railway — запускает `node backend/index.js`, который одновременно: Express API + static `dist/` + reverse proxy для Gemini/Grafana
- Проблема: CORS при прямых API запросах из браузера → Express стал production proxy

**Паттерн production proxy:**
```js
// backend/index.js — реальные API запросы идут через сервер
app.use('/api/gemini', express.raw(), (req, res) => {
  https.request({ hostname: 'generativelanguage.googleapis.com', ... }).pipe(res);
});
```

---

## День 4 — Feb 16: Агентская оркестрация

```
fec36c3  feat: DAG editing, agent delete, IDE file integration
eb34b51  feat: Phase 7 — IDE file ops, DAG→editor, recharts debugger
a72ce47  fix: pass createFile/selectFile as props
071cf2a  fix: Open in Editor overwrites current IDE file
ca06db4  feat: add + Merge button
2758397  fix: move handleAddMerge out of DAGVisualization
aa502e2  Redesign DAG canvas to n8n/Make style
aba35d4  feat: DAG canvas, click-to-edit, bidirectional sync, inline folder
82b615b  feat: parallel DAG execution + node status visualization
ad97e08  feat: canvas stable size, API keys, file picker, OTLP proxy
3577b21  feat: save DAG output to AgentsOutputs/, fix Grafana 404
38444c0  fix: add Grafana OTLP proxy to Express for production
cef21cc  docs: update README and ROADMAP
```

### Phase 7–8: DAG как живой код

**Концепция:** Агенты в DAG — не просто UI узлы, а объекты с конфигом, синхронизированным с файлами в IDE.

```
agents/
├── CodeReviewer.json   ← редактируй в Monaco, агент обновляется в DAG
└── DocWriter.json      ← или наоборот: измени параметры в DAG, файл обновится
```

Bidirectional sync через `agentFileSyncRef` — предотвращение циклов через сравнение последнего написанного контента.

**Визуальный редизайн:** DAG canvas → n8n/Make стиль (SVG, 1400×820, узлы с цветными акцентами, соединения с кривыми Безье).

### Phase 9: Параллельное выполнение

**Задача:** Запустить несколько моделей одновременно.

**Решение:** Топологическая сортировка DAG → `Promise.all()` per level.

```js
function topoLevels(nodes, edges) {
  // BFS по уровням indegree=0
  // Результат: [[input], [agent1, agent2], [merge], [output]]
}

for (const level of topoLevels(dagNodes, dagEdges)) {
  await Promise.all(level.map(nodeId => executeNode(nodeId)));
}
// agent1 и agent2 выполняются одновременно → latency сокращается вдвое
```

Визуализация статуса нод в реальном времени: 🔵 running → 🟢 completed / 🔴 error.

### Phase 10: Multi-provider API keys

**Задача:** Подключить свои ключи для разных провайдеров.

```
AgentConfig
├── Provider: [Gemini ▼] [OpenAI ▼] [Anthropic ▼]
└── API Key: [sk-ant-... ●●●●●●●●●●●]
```

Каждый агент независимо: `agent.provider` + `agent.apiKey` → `sendMessage({ apiKey, provider })` → выбирает нужный baseUrl из `LLM_PROVIDERS`.

**UX детали:** Input нода → выбор файлов проекта как контекст; Output нода → просмотр результатов; сохранение в `AgentsOutputs/`.

### Phase 11: Production Grafana

**Проблема:** 404 на `/api/grafana/otlp/v1/traces`.

**Путь к решению:**
1. Сначала казалось: неправильный URL path (двойной `/otlp`)
2. Исправили в `vite.config.js` — не помогло (404 → 401, но потом снова 404)
3. **Root cause:** Vite proxy работает только в `vite dev`/`vite preview`. Railway запускает `node backend/index.js` — там нет Vite. Браузер шлёт запросы на Railway Express-сервер, который не знает что делать с `/api/grafana`.
4. **Решение:** Добавить Express proxy по аналогии с существующим `/api/gemini` proxy.

```js
// Ключевой insight: new URL(endpoint).hostname отдельно от /otlp пути
endpointHostname = new URL(VITE_GRAFANA_ENDPOINT).hostname;
// путь из запроса: /otlp/v1/traces
// = https://otlp-gateway.grafana.net/otlp/v1/traces ✓
```

---

## Архитектурный итог

```
┌─────────────────────────────────────────────┐
│                 Browser                      │
│  Monaco Editor (Yjs CRDT) ←→ Liveblocks     │
│  AgentBuilder DAG (SVG, topoLevels)          │
│  RAG Playground ←→ /api/rag/*               │
│  DebugViewer ←→ OTEL InMemorySpanExporter   │
└────────────────┬────────────────────────────┘
                 │ HTTP (same origin)
┌────────────────▼────────────────────────────┐
│          Express Backend (Railway)           │
│  /api/gemini/* → generativelanguage.google  │
│  /api/grafana/* → otlp-gateway.grafana.net  │
│  /api/rag/search → PostgreSQL + pgvector    │
│  /api/rag/ingest → Gemini embeddings        │
│  GET * → dist/index.html (SPA)              │
└─────────────────────────────────────────────┘
```

**Внешние сервисы (все с бесплатным tier):**

| Сервис | Для чего | Ключ |
|--------|----------|------|
| Liveblocks | CRDT WebSocket | `VITE_LIVEBLOCKS_PUBLIC_KEY` |
| Gemini API | AI агенты + embeddings | `VITE_GEMINI_API_KEY` |
| Grafana Cloud | OTLP трейсы | `VITE_GRAFANA_ENDPOINT` + `VITE_GRAFANA_TOKEN` |
| Clerk | Auth + аватары | `VITE_CLERK_PUBLISHABLE_KEY` |
| Railway | Hosting + Node server | auto |
| Neon/Supabase | pgvector для RAG | `DATABASE_URL` |

---

## Метрики разработки

| Метрика | Значение |
|---------|---------|
| Дней разработки | **4** (13–16 Feb 2026) |
| Git коммитов | **40+** |
| Строк кода | ~3 500 (React/JS) + ~600 (Express) |
| Компонентов React | 20+ |
| Фаз разработки | **11** |
| Внешних интеграций | **6** (Liveblocks, Gemini, pgvector, NATS, Grafana, Clerk) |
| Деплоев | Vercel → Railway |
| Время до первого деплоя | **< 4 часов** |

---

## Ключевые паттерны, которые работают

### 1. Mock-first development
Каждая интеграция имеет mock fallback. Это позволяет:
- Показывать рабочее демо без ключей
- Разрабатывать UI независимо от API доступности
- Мгновенно переключаться в "реальный" режим добавлением одной переменной

### 2. Production proxy pattern
Браузер никогда не обращается к внешним API напрямую. Все запросы → Express → внешний API. Результат: ноль CORS ошибок в продакшне, централизованное логирование, возможность добавить auth/rate limiting.

### 3. Bidirectional sync с ref-guard
Синхронизация между UI state и файлами через `lastWrittenRef` предотвращает бесконечные циклы без сложных систем событий.

### 4. Topological DAG execution
`topoLevels()` + `Promise.all()` per level — минимальный код для максимального параллелизма. Агенты на одном уровне запускаются одновременно, на разных — последовательно.

---

## Питч (3 минуты)

> **"Неделю назад этого не существовало."**
>
> Vibe IDE — это AI-powered среда разработки с real-time коллаборацией, мультиагентным оркестратором и полной телеметрией. Построена за 4 дня в паре с Claude Code.
>
> **День 1:** Monaco редактор с CRDT синхронизацией через Liveblocks + Yjs. Открываете в двух вкладках — текст синхронизируется в реальном времени. Без бэкенда.
>
> **День 2:** Подключили Gemini API. Агентский шаблон + real AI ответы. Бесплатно.
>
> **День 3:** За один день — pgvector RAG, NATS event bus, Grafana OTLP трейсинг, Clerk auth. Задеплоили на Railway. Работает в продакшне.
>
> **День 4:** DAG canvas в стиле n8n. Параллельное выполнение агентов через топологическую сортировку. Per-agent API keys. Файлы проекта как контекст. Результаты агентов сохраняются в файловое дерево.
>
> **Ключевой insight:** Каждая интеграция строится по принципу "real API + mock fallback". Демо всегда работает. Реальные данные — одна переменная окружения.
>
> Это не прототип. Это рабочий продукт с CRDT, векторной БД, телеметрией и мультиагентным оркестратором. Построен одним человеком с Claude за 4 дня.

---

*Документ сгенерирован: 16 февраля 2026 | [GitHub](https://github.com/MERSEI/Vibe) | [Live Demo](https://vibe-production-cd60.up.railway.app)*
