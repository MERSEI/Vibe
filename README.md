    # ⚡ Vibe IDE

AI-Powered Development Environment with real-time collaboration, agent orchestration, RAG pipeline, and full observability.

![Vibe IDE](https://img.shields.io/badge/Status-MVP-green) ![React](https://img.shields.io/badge/React-18-blue) ![Liveblocks](https://img.shields.io/badge/Liveblocks-CRDT-purple) ![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-tracing-orange) ![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-blue)

## ✨ Features

### 🎨 Epic 1: IDE Core
- **Monaco Editor** — Full VS Code editor with minimap, autocomplete, Ctrl+F, multi-cursor
- **CRDT Collaboration** — Real-time text sync via Liveblocks + Yjs (open two tabs to try)
- **Live Preview** — Sandpack-style JS sandbox with console output
- **File Tree** — Hierarchical file browser
- **Editor Tabs** — Multi-file editing
- **Theme Toggle** — Dark/Light mode
- **i18n** — English & Russian localization

### 🤖 Epic 2: Agent SDK
- **Gemini 2.0 Flash** — Real AI responses via Google Gemini API (free tier)
- **Multi-Agent DAG** — Visual DAG canvas with drag-and-drop nodes and connect mode
- **Parallel Execution** — Topological sort + `Promise.all()` per level; true parallel agent runs with live status (blue/green/red)
- **Per-Agent API Keys** — Provider selector (Gemini / OpenAI / Anthropic) + API key input per agent; bidirectional sync with `agents/*.json` files
- **File Context** — Click Input node to attach project files as LLM context
- **Output Viewer** — Click Output node after run to view results; save to `AgentsOutputs/` folder with timestamp
- **6 Templates** — ChatBot, RAG-Search, Self-Healing CLI, Code Review, SQL Generator, API Designer

### 🔍 Epic 3: RAG Pipeline
- **pgvector + Express Backend** — Real PostgreSQL + pgvector backend with hybrid search. Falls back to mock data automatically if DB is not running
- **Chunking Strategies** — Recursive, semantic, fixed-size
- **Hybrid Search** — BM25 + vector + hybrid modes via `hybrid_search()` PostgreSQL function
- **Document Ingestion** — `POST /api/rag/ingest` with Gemini text-embedding-004 (768 dims)

### 🐛 Epic 4: Debugger
- **OpenTelemetry Tracing** — Dual export: in-memory (DebugViewer) + Grafana Tempo (when configured)
- **Token Usage Charts** — Cost and usage visualization
- **Event Bus Inspector** — NATS WebSocket client with mock fallback. Shows "Live NATS" / "Mock" badge

## 🚀 Quick Start

```bash
git clone https://github.com/MERSEI/Vibe.git
cd Vibe
npm install

# Real CRDT collaboration (already configured):
# VITE_LIVEBLOCKS_PUBLIC_KEY is set in .env

# Real AI responses — get free key at https://aistudio.google.com/app/apikey
echo "VITE_GEMINI_API_KEY=AIza..." >> .env

# Grafana Tempo tracing (optional):
# VITE_GRAFANA_ENDPOINT=https://otlp-gateway-prod-eu-west-2.grafana.net/otlp
# VITE_GRAFANA_TOKEN=instanceId:apiKey

npm run dev
# Open in two browser tabs — CRDT text sync works out of the box
# Without Gemini key — realistic mock responses are used automatically
```

### Real RAG (optional — requires Docker)

```bash
# 1. Start PostgreSQL with pgvector:
docker run -d --name pgvector -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=vibe_rag -p 5432:5432 pgvector/pgvector:pg16

# 2. Apply schema:
psql postgresql://postgres:secret@localhost:5432/vibe_rag -f backend/schema.sql

# 3. Configure backend:
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL and GEMINI_API_KEY

# 4. Start backend:
cd backend && npm install && npm run dev   # port 3001

# RAG Playground will show "Connected" badge instead of "Mock mode"
# See docs/ROADMAP.md Phase 3 for Supabase/Neon alternatives
```

## 📁 Project Structure

```
src/
├── App.jsx                    # Main entry + ClerkProvider + RoomProvider
├── api/
│   ├── anthropic/client.js   # Gemini API (free) with mock fallback
│   ├── clerk/provider.jsx    # Clerk auth with mock fallback
│   ├── rag/client.js         # RAG backend client (fetch + mock fallback)
│   ├── nats/client.js        # NATS WebSocket client with mock fallback
│   ├── liveblocks/config.jsx # Real Liveblocks (createRoomContext pattern)
│   └── telemetry/tracer.js   # Real OpenTelemetry (dual: in-memory + Grafana)
├── components/
│   ├── editor/
│   │   ├── CodeEditor.jsx    # Monaco + Yjs CRDT sync
│   │   └── LivePreview.jsx   # JS sandbox executor
│   ├── agents/               # AgentBuilder DAG (7 templates)
│   ├── rag/                  # RAG Playground (connected to backend)
│   └── debug/                # OTEL DebugViewer
├── hooks/index.js             # useCollaborators (Liveblocks)
└── stores/index.js            # Zustand global state

backend/
├── package.json               # Express + pg + pgvector
├── schema.sql                 # PostgreSQL DDL (idempotent)
├── index.js                   # Express server (port 3001)
├── db.js                      # pg Pool
├── embeddings.js              # Gemini text-embedding-004
└── routes/                    # health, search, ingest
```

## 🛠️ Tech Stack

| Category | Technology | Status |
|----------|------------|--------|
| Framework | React 18 + Vite | ✅ Live |
| Styling | Tailwind CSS | ✅ Live |
| State | Zustand | ✅ Live |
| Editor | Monaco Editor (`@monaco-editor/react`) | ✅ Live |
| Collaboration | Liveblocks + Yjs CRDT | ✅ Live |
| Tracing | OpenTelemetry (in-memory + Grafana Tempo) | ✅ Ready |
| AI Agents | Gemini 2.0 Flash (free tier) | ✅ Live |
| Vector DB | pgvector + Express backend | ✅ Ready (needs DB) |
| Event Bus | NATS WebSocket (nats.ws) + mock fallback | ✅ Ready (needs NATS) |
| Observability | OTLP → Grafana Tempo via Express proxy + in-memory | ✅ Live |
| Auth | Clerk (@clerk/clerk-react) + mock fallback | ✅ Ready (needs Clerk key) |

## 📋 Roadmap

See [ROADMAP.md](./docs/ROADMAP.md) for the full integration plan.

### Next integrations (in priority order)
1. **Cursor-style inline completions** — Ghost text in Monaco via `registerInlineCompletionsProvider`
2. ~~**pgvector + PostgreSQL**~~ — **Done!** Backend + frontend code written. Connect your DB to activate (see ROADMAP Phase 3)
3. ~~**NATS**~~ — **Done!** nats.ws client with mock fallback. Run Docker NATS to activate (see ROADMAP Phase 4)
4. ~~**Grafana Cloud**~~ — **Done!** Dual OTLP export. Set `VITE_GRAFANA_ENDPOINT` + `VITE_GRAFANA_TOKEN` (see ROADMAP Phase 5)
5. ~~**Clerk Auth**~~ — **Done!** ClerkProvider with mock fallback. Set `VITE_CLERK_PUBLISHABLE_KEY` to activate (see ROADMAP Phase 6)

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save file |
| `Cmd/Ctrl + R` | Run code |
| `Cmd/Ctrl + /` | Toggle comment |
| `Cmd/Ctrl + F` | Find in file |
| `Cmd/Ctrl + P` | Quick open |
| `Cmd/Ctrl + Shift + P` | Command palette |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push and open a Pull Request

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.


