import { Router } from 'express';
import { pool } from '../db.js';

export const healthRouter = Router();

healthRouter.get('/health', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS doc_count FROM documents`
    );
    res.json({
      status: 'ok',
      db: 'connected',
      documents: rows[0].doc_count,
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      message: err.message,
      hint: 'Запустите PostgreSQL и примените schema.sql: psql $DATABASE_URL -f backend/schema.sql',
    });
  }
});
