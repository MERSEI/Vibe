-- Vibe IDE RAG — PostgreSQL + pgvector schema
-- Запуск: psql $DATABASE_URL -f backend/schema.sql
-- Файл идемпотентный — можно запускать повторно без ошибок

-- 1. Включить расширение pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Таблица документов (768 dims = Gemini text-embedding-004)
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  source      TEXT NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(768),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Full-text search колонка (автогенерация из content)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'fts'
  ) THEN
    ALTER TABLE documents ADD COLUMN fts tsvector
      GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
  END IF;
END $$;

-- 4. Индекс для cosine ANN поиска (IVFFlat)
-- NOTE: Эффективен при 100+ документах. С меньшим кол-вом seq scan быстрее
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 5. GIN индекс для полнотекстового поиска
CREATE INDEX IF NOT EXISTS documents_fts_idx
  ON documents USING gin(fts);

-- 6. Функция гибридного поиска (vector + BM25)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text      TEXT,
  query_embedding vector(768),
  match_count     INT     DEFAULT 5,
  vector_weight   FLOAT   DEFAULT 0.6,
  bm25_weight     FLOAT   DEFAULT 0.4
)
RETURNS TABLE(
  id           UUID,
  title        TEXT,
  source       TEXT,
  content      TEXT,
  score        FLOAT,
  bm25_score   FLOAT,
  vector_score FLOAT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ
) AS $$
  SELECT
    d.id, d.title, d.source, d.content,
    (vector_weight * (1 - (d.embedding <=> query_embedding)) +
     bm25_weight  * ts_rank(d.fts, plainto_tsquery('english', query_text))) AS score,
    ts_rank(d.fts, plainto_tsquery('english', query_text))  AS bm25_score,
    (1 - (d.embedding <=> query_embedding))                 AS vector_score,
    d.metadata,
    d.created_at
  FROM documents d
  WHERE d.fts @@ plainto_tsquery('english', query_text)
     OR (d.embedding <=> query_embedding) < 0.5
  ORDER BY score DESC
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
