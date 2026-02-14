# ⚡ Vibe IDE

AI-Powered Development Environment with real-time collaboration, agent orchestration, RAG pipeline, and full observability.

![Vibe IDE](https://img.shields.io/badge/Status-MVP-green) ![React](https://img.shields.io/badge/React-18-blue) ![Liveblocks](https://img.shields.io/badge/Liveblocks-CRDT-purple) ![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-tracing-orange)

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
- **VibeAgent class** — LangChain-style agent abstraction (mock)
- **Multi-Agent DAG** — Visual DAG execution flow with drag-and-drop
- **Starter Templates** — ChatBot, RAG-Search, Self-Healing CLI

### 🔍 Epic 3: RAG Pipeline
- **pgvector Integration** — Vector similarity search (mock)
- **Chunking Strategies** — Recursive, semantic, fixed-size
- **Hybrid Search** — BM25 + vector search

### 🐛 Epic 4: Debugger
- **OpenTelemetry Tracing** — Real in-memory traces, full span timeline
- **Token Usage Charts** — Cost and usage visualization
- **Event Bus Inspector** — Real-time NATS monitoring (mock)

## 🚀 Quick Start

```bash
git clone https://github.com/MERSEI/Vibe.git
cd Vibe
npm install

# Add Liveblocks key for real CRDT collaboration:
echo "VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_..." > .env

npm run dev
# Open in two browser tabs — CRDT text sync works out of the box
```

## 📁 Project Structure

```
src/
├── App.jsx                    # Main entry + Liveblocks RoomProvider
├── api/
│   ├── anthropic/client.js   # Mock AI client (real: add sk-ant-... key)
│   ├── liveblocks/config.jsx # Real Liveblocks (createRoomContext pattern)
│   └── telemetry/tracer.js   # Real OpenTelemetry (in-memory exporter)
├── components/
│   ├── editor/
│   │   ├── CodeEditor.jsx    # Monaco + Yjs CRDT sync
│   │   └── LivePreview.jsx   # JS sandbox executor
│   ├── agents/               # AgentBuilder DAG
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
| AI Agents | Mock (LangChain.js ready) | 🟡 Mock |
| Vector DB | Mock (pgvector ready) | 🟡 Mock |
| Event Bus | Mock (NATS.ws ready) | 🟡 Mock |

## 📋 Roadmap

See [ROADMAP.md](./docs/ROADMAP.md) for the full integration plan.

### Next integrations (in priority order)
1. **Anthropic API** — Add `sk-ant-...` key → agents give real AI answers
2. **Cursor-style inline completions** — Ghost text in Monaco via `registerInlineCompletionsProvider`
3. **NATS** — Real event bus (Docker: `docker run -p 4222:4222 nats`)
4. **Clerk Auth** — Named users in collaboration presence
5. **pgvector** — Real RAG via Supabase or self-hosted PostgreSQL

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
