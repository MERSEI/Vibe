import { Router } from 'express';
import { pool } from '../db.js';
import { getEmbedding } from '../embeddings.js';

export const ingestRouter = Router();

const MAX_TITLE = 255;
const MAX_SOURCE = 500;
const MAX_CONTENT = 50_000; // ~10k words

// POST /api/rag/ingest
// Body: { title, source, content, metadata? }
ingestRouter.post('/ingest', async (req, res) => {
  const { title, source, content, metadata = {} } = req.body;

  if (!title || !source || !content) {
    return res.status(400).json({
      error: 'title, source и content обязательны',
    });
  }

  if (title.length > MAX_TITLE || source.length > MAX_SOURCE || content.length > MAX_CONTENT) {
    return res.status(400).json({ error: 'Input exceeds maximum allowed length' });
  }

  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    return res.status(400).json({ error: 'metadata must be an object' });
  }

  try {
    const embedding = await getEmbedding(content);
    const embeddingStr = `[${embedding.join(',')}]`;

    const { rows } = await pool.query(
      `INSERT INTO documents (title, source, content, embedding, metadata)
       VALUES ($1, $2, $3, $4::vector, $5)
       RETURNING id, created_at`,
      [title, source, content, embeddingStr, metadata]
    );

    res.status(201).json({
      id: rows[0].id,
      created_at: rows[0].created_at,
    });
  } catch (err) {
    console.error('[ingest] error:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});
