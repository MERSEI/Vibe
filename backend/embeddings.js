import 'dotenv/config';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

/**
 * Gemini Embedding API — возвращает float[768]
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function getEmbedding(text) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY не задан в backend/.env — эмбеддинги недоступны'
    );
  }

  const response = await fetch(`${EMBEDDING_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini embedding error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;

  if (!Array.isArray(values)) {
    throw new Error('Неожиданный формат ответа Gemini embedding');
  }

  return values;
}
