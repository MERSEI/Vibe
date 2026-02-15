/**
 * Mock Event Generator для NATS Event Bus
 *
 * Генерирует реалистичные события когда NATS сервер недоступен.
 * Используется как fallback в client.js.
 */

import { EVENT_CHANNELS } from '../../utils/constants';

const EVENT_TYPES = {
  agents: ['agent.start', 'agent.complete', 'agent.error', 'agent.step'],
  rag: ['rag.query', 'rag.embed', 'rag.search', 'rag.result'],
  llm: ['llm.request', 'llm.stream', 'llm.complete', 'llm.error'],
  tools: ['tool.invoke', 'tool.execute', 'tool.result', 'tool.error'],
  system: ['system.init', 'system.ready', 'system.shutdown'],
};

const DATA_TEMPLATES = {
  'agent.start': () => ({ agent: 'CodeReviewer', task: 'analyze' }),
  'agent.complete': () => ({ status: 'success', duration: Math.floor(Math.random() * 2000) }),
  'agent.error': () => ({ error: 'Timeout exceeded', agent: 'SQLGenerator' }),
  'agent.step': () => ({ step: 'parse_input', progress: Math.floor(Math.random() * 100) }),
  'rag.query': () => ({ query: 'API documentation', k: 5 }),
  'rag.embed': () => ({ model: 'text-embedding-004', dims: 768 }),
  'rag.search': () => ({ results: Math.floor(Math.random() * 10), latency: Math.floor(Math.random() * 100) }),
  'rag.result': () => ({ docs: Math.floor(Math.random() * 5), score: (Math.random() * 0.5 + 0.5).toFixed(3) }),
  'llm.request': () => ({ model: 'gemini-2.0-flash', tokens: Math.floor(Math.random() * 2000) }),
  'llm.stream': () => ({ chunk: Math.floor(Math.random() * 50), total: Math.floor(Math.random() * 500) }),
  'llm.complete': () => ({ tokens: Math.floor(Math.random() * 1500), cost: (Math.random() * 0.02).toFixed(4) }),
  'llm.error': () => ({ error: 'Rate limit exceeded', retryAfter: 30 }),
  'tool.invoke': () => ({ tool: 'code_analysis', params: {} }),
  'tool.execute': () => ({ status: 'running' }),
  'tool.result': () => ({ tool: 'code_analysis', exitCode: 0 }),
  'tool.error': () => ({ tool: 'shell', error: 'Permission denied' }),
  'system.init': () => ({ version: '0.1.0', env: 'development' }),
  'system.ready': () => ({ uptime: Math.floor(Math.random() * 3600) }),
  'system.shutdown': () => ({ reason: 'graceful', code: 0 }),
};

function generateMockData(type) {
  const fn = DATA_TEMPLATES[type];
  return fn ? fn() : { event: type };
}

export function generateMockEvent() {
  const channels = Object.keys(EVENT_CHANNELS);
  const channel = channels[Math.floor(Math.random() * channels.length)];
  const types = EVENT_TYPES[channel] || ['unknown'];
  const type = types[Math.floor(Math.random() * types.length)];

  return {
    id: Date.now() + Math.random(),
    channel,
    type,
    timestamp: new Date().toISOString().substr(11, 12),
    data: generateMockData(type),
  };
}

/**
 * Запустить генерацию мок-событий с интервалом.
 * @param {function} callback — вызывается для каждого события
 * @param {number} intervalMs — интервал в мс (по умолчанию 1500)
 * @returns {function} cleanup — вызвать для остановки
 */
export function startMockStream(callback, intervalMs = 1500) {
  const interval = setInterval(() => {
    callback(generateMockEvent());
  }, intervalMs);

  return () => clearInterval(interval);
}
