import { Router } from 'express';
import { pool } from '../db.js';
import { getEmbedding } from '../embeddings.js';

export const ingestRouter = Router();

// POST /api/rag/ingest
// Body: { title, source, content, metadata? }
ingestRouter.post('/ingest', async (req, res) => {
  const { title, source, content, metadata = {} } = req.body;

  if (!title || !source || !content) {
    return res.status(400).json({
      error: 'title, source и content обязательны',
    });
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
    console.error('[ingest] ошибка:', err.message);
    res.status(503).json({
      error: err.message,
      hint: 'Убедитесь что PostgreSQL запущен и schema.sql применён',
    });
  }
});
