import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchRouter } from './routes/search.js';
import { ingestRouter } from './routes/ingest.js';
import { healthRouter } from './routes/health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT ?? 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));

// Маршруты RAG
app.use('/api/rag', healthRouter);
app.use('/api/rag', searchRouter);
app.use('/api/rag', ingestRouter);

// Production: serve frontend static files from dist/
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Глобальный обработчик ошибок
app.use((err, _req, res, _next) => {
  console.error('[express] ошибка:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`RAG backend: http://localhost:${PORT}`);
  console.log('  GET  /api/rag/health');
  console.log('  POST /api/rag/search');
  console.log('  POST /api/rag/ingest');
});
