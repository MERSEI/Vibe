/**
 * RAG Client — фронтенд-обёртка для backend API
 *
 * Логика:
 * 1. Health-check бекенда (кеш 30с)
 * 2. Бекенд доступен → реальный поиск через PostgreSQL + pgvector
 * 3. Бекенд недоступен → fallback на мок-данные
 */

import { RAG_MOCK_RESULTS } from '../anthropic/client';

// В dev Vite проксирует /api/rag → localhost:3001/api/rag
// В production задать VITE_RAG_BACKEND_URL
const RAG_BASE = import.meta.env.VITE_RAG_BACKEND_URL
  ? `${import.meta.env.VITE_RAG_BACKEND_URL}/api/rag`
  : '/api/rag';

let _backendAvailable = null;

async function checkBackendHealth() {
  if (_backendAvailable !== null) return _backendAvailable;
  try {
    const res = await fetch(`${RAG_BASE}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    _backendAvailable = res.ok;
  } catch {
    _backendAvailable = false;
  }
  // Сбросить кеш через 30с — если бекенд перезапустили, обнаружим
  setTimeout(() => { _backendAvailable = null; }, 30_000);
  return _backendAvailable;
}

/**
 * Проверить статус бекенда (для UI-бейджа)
 * @returns {Promise<{status: string, documents?: number}>}
 */
export async function getBackendStatus() {
  try {
    const res = await fetch(`${RAG_BASE}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return await res.json();
  } catch {
    return { status: 'error', db: 'disconnected' };
  }
}

/**
 * Поиск в RAG. Fallback на мок если бекенд недоступен.
 *
 * @param {string} query
 * @param {{ mode?: 'hybrid'|'vector'|'bm25', limit?: number, vectorWeight?: number, bm25Weight?: number }} options
 * @returns {Promise<Array>}
 */
export async function ragSearch(query, options = {}) {
  const isAvailable = await checkBackendHealth();

  if (!isAvailable) {
    const mockRaw = RAG_MOCK_RESULTS(query.slice(0, 40));
    return JSON.parse(mockRaw);
  }

  try {
    const res = await fetch(`${RAG_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, ...options }),
    });

    if (!res.ok) {
      console.warn('[ragSearch] Ошибка бекенда, fallback на мок:', res.status);
      return JSON.parse(RAG_MOCK_RESULTS(query.slice(0, 40)));
    }

    return await res.json();
  } catch (err) {
    console.warn('[ragSearch] Сеть недоступна, fallback на мок:', err.message);
    return JSON.parse(RAG_MOCK_RESULTS(query.slice(0, 40)));
  }
}

/**
 * Загрузить документ в RAG.
 * @param {{ title: string, source: string, content: string, metadata?: object }} doc
 * @returns {Promise<{ id: string, created_at: string }|null>} null если бекенд недоступен
 */
export async function ragIngest(doc) {
  const isAvailable = await checkBackendHealth();
  if (!isAvailable) {
    console.warn('[ragIngest] Бекенд недоступен — документ не сохранён');
    return null;
  }

  const res = await fetch(`${RAG_BASE}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown' }));
    throw new Error(`ragIngest failed: ${err.error}`);
  }

  return await res.json();
}
