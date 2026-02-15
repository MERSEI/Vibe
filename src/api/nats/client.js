/**
 * NATS Event Bus Client
 *
 * Подключается к NATS через WebSocket (nats.ws).
 * Если NATS недоступен — fallback на мок-генератор событий.
 *
 * Env: VITE_NATS_URL=ws://localhost:9222
 */

import { generateMockEvent, startMockStream } from './mockEvents';

const NATS_URL = import.meta.env.VITE_NATS_URL || 'ws://localhost:9222';

// Маппинг каналов → NATS subjects
const CHANNEL_SUBJECTS = {
  agents: 'agents.>',
  rag: 'rag.>',
  llm: 'llm.>',
  tools: 'tools.>',
  system: 'system.>',
};

let _natsConnection = null;
let _connectionStatus = 'disconnected'; // 'connected' | 'disconnected' | 'mock'

/**
 * Получить текущий статус подключения
 * @returns {'connected'|'disconnected'|'mock'}
 */
export function getConnectionStatus() {
  return _connectionStatus;
}

/**
 * Попробовать подключиться к NATS.
 * @returns {Promise<object|null>} NATS connection или null
 */
async function tryConnect() {
  try {
    // Динамический импорт — nats.ws не загружается если не нужен
    const { connect, JSONCodec } = await import('nats.ws');
    const nc = await connect({
      servers: NATS_URL,
      timeout: 3000,
      reconnect: true,
      maxReconnectAttempts: 5,
      reconnectTimeWait: 2000,
    });

    _natsConnection = nc;
    _connectionStatus = 'connected';

    nc.closed().then(() => {
      _connectionStatus = 'disconnected';
      _natsConnection = null;
    });

    return { nc, codec: JSONCodec() };
  } catch (err) {
    console.warn('[nats] Подключение не удалось, используем мок-события:', err.message);
    _connectionStatus = 'mock';
    return null;
  }
}

/**
 * Подписаться на поток событий.
 * Если NATS доступен — реальные события.
 * Если нет — мок-генератор.
 *
 * @param {function} onEvent — callback(event) для каждого события
 * @param {object} options
 * @param {string} options.channel — фильтр канала ('all' или имя канала)
 * @param {number} options.mockIntervalMs — интервал мок-событий (по умолчанию 1500)
 * @returns {Promise<function>} cleanup — вызвать для отписки
 */
export async function subscribeToEvents(onEvent, options = {}) {
  const { channel = 'all', mockIntervalMs = 1500 } = options;

  const conn = await tryConnect();

  if (!conn) {
    // Fallback на мок
    _connectionStatus = 'mock';
    return startMockStream(onEvent, mockIntervalMs);
  }

  const { nc, codec } = conn;

  // Определить subject для подписки
  const subject = channel === 'all' ? '>' : (CHANNEL_SUBJECTS[channel] || `${channel}.>`);

  try {
    const sub = nc.subscribe(subject);

    // Асинхронная итерация по сообщениям
    const running = { active: true };
    (async () => {
      for await (const msg of sub) {
        if (!running.active) break;
        try {
          const data = codec.decode(msg.data);
          const subjectParts = msg.subject.split('.');
          onEvent({
            id: Date.now() + Math.random(),
            channel: subjectParts[0] || 'system',
            type: msg.subject,
            timestamp: new Date().toISOString().substr(11, 12),
            data,
          });
        } catch {
          // Пропускаем невалидные сообщения
        }
      }
    })();

    return () => {
      running.active = false;
      sub.unsubscribe();
    };
  } catch (err) {
    console.warn('[nats] Ошибка подписки, fallback на мок:', err.message);
    _connectionStatus = 'mock';
    return startMockStream(onEvent, mockIntervalMs);
  }
}

/**
 * Опубликовать событие в NATS.
 * @param {string} subject — NATS subject (например 'agents.codereviewer.result')
 * @param {object} data — JSON данные
 * @returns {Promise<boolean>} true если опубликовано, false если NATS недоступен
 */
export async function publishEvent(subject, data) {
  if (!_natsConnection) {
    console.warn('[nats] Не подключен, событие не опубликовано');
    return false;
  }

  try {
    const { JSONCodec } = await import('nats.ws');
    const codec = JSONCodec();
    _natsConnection.publish(subject, codec.encode(data));
    return true;
  } catch (err) {
    console.error('[nats] Ошибка публикации:', err.message);
    return false;
  }
}

/**
 * Закрыть NATS подключение.
 */
export async function disconnect() {
  if (_natsConnection) {
    await _natsConnection.drain();
    _natsConnection = null;
    _connectionStatus = 'disconnected';
  }
}
