import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { searchRouter } from './routes/search.js';
import { ingestRouter } from './routes/ingest.js';
import { healthRouter } from './routes/health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT ?? 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

app.use(cors({ origin: CORS_ORIGIN }));

// ── Reverse proxy: /api/gemini/* → generativelanguage.googleapis.com ──
// Registered BEFORE express.json() so the raw body stream is preserved.
// In dev, Vite handles this proxy. In production, Express does it.
app.use('/api/gemini', express.raw({ type: '*/*', limit: '2mb' }), (req, res) => {
  const targetPath = req.originalUrl.replace(/^\/api\/gemini/, '');
  const body = req.body && req.body.length ? req.body : null;

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: targetPath,
    method: req.method,
    headers: {
      'content-type': req.headers['content-type'] || 'application/json',
      'authorization': req.headers['authorization'] || '',
    },
  };
  if (body) options.headers['content-length'] = body.length;

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[proxy] Gemini proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Gemini proxy error: ' + err.message });
    }
  });

  if (body) proxyReq.write(body);
  proxyReq.end();
});

// ── Reverse proxy: /api/grafana/* → Grafana OTLP endpoint ──
// VITE_GRAFANA_ENDPOINT may include /otlp suffix; we use only the hostname
// so the request path (/otlp/v1/traces) is forwarded correctly.
const GRAFANA_ENDPOINT = process.env.VITE_GRAFANA_ENDPOINT;
if (GRAFANA_ENDPOINT) {
  app.use('/api/grafana', express.raw({ type: '*/*', limit: '2mb' }), (req, res) => {
    const targetPath = req.originalUrl.replace(/^\/api\/grafana/, '');
    const body = req.body && req.body.length ? req.body : null;
    let endpointHostname;
    try {
      endpointHostname = new URL(GRAFANA_ENDPOINT).hostname;
    } catch {
      endpointHostname = 'otlp-gateway-prod-eu-west-2.grafana.net';
    }

    const options = {
      hostname: endpointHostname,
      port: 443,
      path: targetPath,
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
        'authorization': req.headers['authorization'] || '',
      },
    };
    if (body) options.headers['content-length'] = body.length;

    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error('[proxy] Grafana error:', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'Grafana proxy error: ' + err.message });
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  });
}

// JSON body parser for RAG routes
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
  console.log('  POST /api/gemini/* → proxy');
});
