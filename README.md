# ⚡ Vibe IDE

AI-Powered Development Environment with real-time collaboration, agent orchestration, RAG pipeline, and full observability.

![Vibe IDE](https://img.shields.io/badge/Status-MVP-green) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## ✨ Features

### 🎨 Epic 1: IDE Core
- **Monaco-style Editor** — Syntax highlighting for JS/Python/YAML
- **Live Preview** — Sandpack-style hot-reload preview
- **CRDT Collaboration** — Real-time editing with Liveblocks + Yjs
- **File Tree** — Hierarchical file browser with drag-and-drop
- **Editor Tabs** — Multi-file editing with tab management
- **Keyboard Shortcuts** — Cmd+S, Cmd+R, Cmd+/ and more
- **Theme Toggle** — Dark/Light mode support
- **i18n** — English & Russian localization

### 🤖 Epic 2: Agent SDK
- **LangChain Wrapper** — VibeAgent class for AI agents
- **Multi-Agent DAG** — Visual DAG execution flow
- **Starter Templates** — ChatBot, RAG-Search, Self-Healing CLI
- **NATS Event Bus** — Real-time agent communication

### 🔍 Epic 3: RAG Pipeline
- **pgvector Integration** — Vector similarity search
- **Chunking Strategies** — Recursive, semantic, fixed-size
- **Hybrid Search** — BM25 + vector search
- **Source Viewer** — Document chunk inspection

### 🐛 Epic 4: Debugger
- **OpenTelemetry Tracing** — Full trace timeline
- **Token Usage Charts** — Cost and usage visualization
- **Span Breakdown** — Detailed span analysis
- **Event Bus Inspector** — Real-time NATS monitoring

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/vibe-ide.git
cd vibe-ide

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📁 Project Structure

```
src/
├── App.jsx                 # Main entry point
├── components/
│   ├── layout/            # Layout components
│   ├── editor/            # Editor components
│   ├── agents/            # Agent orchestration
│   ├── rag/               # RAG playground
│   ├── debug/             # Debug/trace viewer
│   └── common/            # Shared components
├── hooks/                 # Custom React hooks
├── utils/                 # Utilities
│   ├── constants.js       # App constants
│   ├── i18n.js           # Translations
│   └── syntax.js         # Syntax highlighting
└── api/                   # API clients (TODO)
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Editor | Monaco Editor (planned) |
| Collaboration | Liveblocks + Yjs (planned) |
| Agents | LangChain.js (planned) |
| Vector DB | pgvector (planned) |
| Tracing | OpenTelemetry (planned) |

## 📋 Roadmap

See [ROADMAP.md](./docs/ROADMAP.md) for detailed development plan.

### Phases Overview
1. **Core Infrastructure** — Monaco, Liveblocks, State management
2. **Agent SDK** — LangChain integration, DAG execution
3. **RAG Pipeline** — pgvector, embeddings, hybrid search
4. **Observability** — OpenTelemetry, Grafana stack
5. **Production Hardening** — Auth, testing, CI/CD

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save file |
| `Cmd/Ctrl + R` | Run code |
| `Cmd/Ctrl + /` | Toggle comment |
| `Cmd/Ctrl + F` | Find in file |
| `Cmd/Ctrl + P` | Quick open file |
| `Cmd/Ctrl + Shift + P` | Command palette |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

Built with ❤️ using Claude
