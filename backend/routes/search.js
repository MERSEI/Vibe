import { Router } from 'express';
import { pool } from '../db.js';
import { getEmbedding } from '../embeddings.js';

export const searchRouter = Router();

const MAX_QUERY_LENGTH = 1000;
const MAX_LIMIT = 50;

searchRouter.post('/search', async (req, res) => {
  const {
    query,
    mode = 'hybrid',
    limit = 5,
    vectorWeight = 0.6,
    bm25Weight = 0.4,
  } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query обязателен и должен быть строкой' });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ error: `Query too long (max ${MAX_QUERY_LENGTH} chars)` });
  }

  // Clamp numeric parameters to safe ranges
  const safeLimit = Math.min(Math.max(parseInt(limit) || 5, 1), MAX_LIMIT);
  const safeVectorWeight = Math.max(0, Math.min(1, parseFloat(vectorWeight) || 0.6));
  const safeBm25Weight = Math.max(0, Math.min(1, parseFloat(bm25Weight) || 0.4));

  try {
    let rows;

    if (mode === 'bm25') {
      // Чистый полнотекстовый поиск — без вызова Gemini
      const result = await pool.query(
        `SELECT id, title, source, content,
                ts_rank(fts, plainto_tsquery('english', $1)) AS score,
                ts_rank(fts, plainto_tsquery('english', $1)) AS bm25_score,
                NULL::float AS vector_score,
                metadata, created_at
         FROM documents
         WHERE fts @@ plainto_tsquery('english', $1)
         ORDER BY score DESC
         LIMIT $2`,
        [query, safeLimit]
      );
      rows = result.rows;
    } else {
      // vector или hybrid — нужен эмбеддинг
      const embedding = await getEmbedding(query);
      const embeddingStr = `[${embedding.join(',')}]`;

      if (mode === 'vector') {
        const result = await pool.query(
          `SELECT id, title, source, content,
                  (1 - (embedding <=> $1::vector)) AS score,
                  NULL::float AS bm25_score,
                  (1 - (embedding <=> $1::vector)) AS vector_score,
                  metadata, created_at
           FROM documents
           ORDER BY embedding <=> $1::vector
           LIMIT $2`,
          [embeddingStr, safeLimit]
        );
        rows = result.rows;
      } else {
        // hybrid (по умолчанию)
        const result = await pool.query(
          'SELECT * FROM hybrid_search($1, $2::vector, $3, $4, $5)',
          [query, embeddingStr, safeLimit, safeVectorWeight, safeBm25Weight]
        );
        rows = result.rows;
      }
    }

    // Нормализуем в формат фронтенда
    const normalized = rows.map((r, i) => ({
      id: i + 1,
      title: r.title,
      source: r.source,
      score: parseFloat(r.score) || 0,
      bm25Score: r.bm25_score != null ? parseFloat(r.bm25_score) : null,
      vectorScore: r.vector_score != null ? parseFloat(r.vector_score) : null,
      chunk: r.content.length > 400 ? r.content.slice(0, 400) + '...' : r.content,
      metadata: {
        tokens: Math.round(r.content.split(/\s+/).length * 1.3),
        lastUpdated: r.metadata?.lastUpdated ?? new Date(r.created_at ?? Date.now()).toISOString().slice(0, 10),
        embedding: 'text-embedding-004',
        ...r.metadata,
      },
    }));

    res.json(normalized);
  } catch (err) {
    console.error('[search] error:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});
