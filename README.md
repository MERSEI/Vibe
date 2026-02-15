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
- **Multi-Agent DAG** — Visual DAG execution flow with drag-and-drop
- **7 Templates** — ChatBot, RAG-Search, Self-Healing CLI, Code Review, SQL Generator, API Designer, Test Generator

### 🔍 Epic 3: RAG Pipeline
- **pgvector Integration** — Vector similarity search (mock, real DB coming in Phase 3)
- **Chunking Strategies** — Recursive, semantic, fixed-size
- **Hybrid Search** — BM25 + vector search, 10-document mock corpus

### 🐛 Epic 4: Debugger
- **OpenTelemetry Tracing** — Real in-memory traces, full span timeline
- **Token Usage Charts** — Cost and usage visualization
- **Event Bus Inspector** — Real-time NATS monitoring (mock, real NATS coming in Phase 4)

## 🚀 Quick Start

```bash
git clone https://github.com/MERSEI/Vibe.git
cd Vibe
npm install

# Real CRDT collaboration (already configured):
# VITE_LIVEBLOCKS_PUBLIC_KEY is set in .env

# Real AI responses — get free key at https://aistudio.google.com/app/apikey
echo "VITE_GEMINI_API_KEY=AIza..." >> .env

npm run dev
# Open in two browser tabs — CRDT text sync works out of the box
# Without Gemini key — realistic mock responses are used automatically
```

## 📁 Project Structure

```
src/
├── App.jsx                    # Main entry + Liveblocks RoomProvider
├── api/
│   ├── anthropic/client.js   # Gemini API (free) with mock fallback
│   ├── liveblocks/config.jsx # Real Liveblocks (createRoomContext pattern)
│   └── telemetry/tracer.js   # Real OpenTelemetry (in-memory exporter)
├── components/
│   ├── editor/
│   │   ├── CodeEditor.jsx    # Monaco + Yjs CRDT sync
│   │   └── LivePreview.jsx   # JS sandbox executor
│   ├── agents/               # AgentBuilder DAG (7 templates)
│   ├── rag/                  # RAG Playground
│   └── debug/                # OTEL DebugViewer
├── hooks/index.js             # useCollaborators (Liveblocks)
└── stores/index.js            # Zustand global state
```

## 🛠️ Tech Stack

| Category | Technology | Status |
|----------|------------|--------|
| Framework | React 18 + Vite | ✅ Live |
| Styling | Tailwind CSS | ✅ Live |
| State | Zustand | ✅ Live |
| Editor | Monaco Editor (`@monaco-editor/react`) | ✅ Live |
| Collaboration | Liveblocks + Yjs CRDT | ✅ Live |
| Tracing | OpenTelemetry (in-memory) | ✅ Live |
| AI Agents | Gemini 2.0 Flash (free tier) | ✅ Live |
| Vector DB | Mock (pgvector — Phase 3) | 🟡 Mock |
| Event Bus | Mock (NATS — Phase 4) | 🟡 Mock |
| Observability | In-memory (Grafana Cloud — Phase 5) | 🟡 Local |

## 📋 Roadmap

See [ROADMAP.md](./docs/ROADMAP.md) for the full integration plan.

### Next integrations (in priority order)
1. **Cursor-style inline completions** — Ghost text in Monaco via `registerInlineCompletionsProvider`
2. **pgvector + PostgreSQL** — Real RAG via Supabase or self-hosted PostgreSQL + Gemini Embeddings
3. **NATS** — Real event bus (Docker: `docker run -p 4222:4222 nats -js`)
4. **Grafana Cloud** — Export OTEL traces to Grafana Tempo (free tier)
5. **Clerk Auth** — Named users in collaboration presence

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

---

Built with ❤️ using Claude
