/**
 * EventBusInspector Component
 *
 * Real-time event stream visualization with:
 * - Channel filtering (implemented)
 * - Event replay functionality (implemented)
 * - Live/pause toggle
 *
 * Production integration points:
 * - NATS message bus connection
 * - WebSocket-based live streaming
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EVENT_CHANNELS } from '../../utils/constants';

// Mock events for demo
const generateMockEvent = () => {
  const channels = Object.keys(EVENT_CHANNELS);
  const channel = channels[Math.floor(Math.random() * channels.length)];
  
  const eventTypes = {
    agents: ['agent.start', 'agent.complete', 'agent.error', 'agent.step'],
    rag: ['rag.query', 'rag.embed', 'rag.search', 'rag.result'],
    llm: ['llm.request', 'llm.stream', 'llm.complete', 'llm.error'],
    tools: ['tool.invoke', 'tool.execute', 'tool.result', 'tool.error'],
    system: ['system.init', 'system.ready', 'system.shutdown'],
  };

  const type = eventTypes[channel][Math.floor(Math.random() * eventTypes[channel].length)];
  
  return {
    id: Date.now() + Math.random(),
    channel,
    type,
    timestamp: new Date().toISOString().substr(11, 12),
    data: generateMockData(type),
  };
};

const generateMockData = (type) => {
  const dataTemplates = {
    'agent.start': { agent: 'CodeReviewer', task: 'analyze' },
    'agent.complete': { status: 'success', duration: Math.floor(Math.random() * 2000) },
    'rag.query': { query: 'API documentation', k: 5 },
    'rag.search': { results: Math.floor(Math.random() * 10), latency: Math.floor(Math.random() * 100) },
    'llm.request': { model: 'claude-3-opus', tokens: Math.floor(Math.random() * 2000) },
    'llm.complete': { tokens: Math.floor(Math.random() * 1500), cost: (Math.random() * 0.02).toFixed(4) },
    'tool.invoke': { tool: 'code_analysis', params: {} },
    'tool.execute': { status: 'running' },
  };
  
  return dataTemplates[type] || { event: type };
};

export function EventBusInspector({ theme, t }) {
  const [events, setEvents] = useState([]);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayEvents, setReplayEvents] = useState([]);
  const containerRef = useRef(null);
  const replayTimerRef = useRef(null);

  // Simulate incoming events
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const newEvent = generateMockEvent();
      setEvents(prev => [...prev.slice(-50), newEvent]); // Keep last 50 events
    }, 1500);

    return () => clearInterval(interval);
  }, [isLive]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current && isLive) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, isLive]);

  // Replay events from history
  const startReplay = useCallback(() => {
    if (events.length === 0) return;
    setIsLive(false);
    setIsReplaying(true);
    setReplayEvents([]);

    let idx = 0;
    const snapshot = [...events];
    replayTimerRef.current = setInterval(() => {
      if (idx >= snapshot.length) {
        clearInterval(replayTimerRef.current);
        setIsReplaying(false);
        return;
      }
      setReplayEvents(prev => [...prev, { ...snapshot[idx], id: Date.now() + Math.random(), timestamp: new Date().toISOString().substr(11, 12) }]);
      idx++;
    }, 300);
  }, [events]);

  const stopReplay = useCallback(() => {
    clearInterval(replayTimerRef.current);
    setIsReplaying(false);
  }, []);

  // Cleanup replay on unmount
  useEffect(() => () => clearInterval(replayTimerRef.current), []);

  const displayEvents = isReplaying ? replayEvents : events;
  const filteredEvents = filter === 'all'
    ? displayEvents
    : displayEvents.filter(e => e.channel === filter);

  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';
  const bgClass = theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50';

  return (
    <div className={`h-48 flex flex-col ${bgClass}`}>
      {/* Header */}
      <div className={`px-4 py-2 border-b ${borderClass} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            📡 NATS Event Bus
          </span>
          {isLive ? (
            <span className="text-xs text-green-500 animate-pulse">● Live</span>
          ) : (
            <span className="text-xs text-yellow-500">⏸ Paused</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Channel filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={`text-xs px-2 py-1 rounded ${
              theme === 'dark'
                ? 'bg-slate-700 text-slate-300 border-slate-600'
                : 'bg-white text-gray-700 border-gray-300'
            } border`}
          >
            <option value="all">All channels</option>
            {Object.entries(EVENT_CHANNELS).map(([id, { label }]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>

          {/* Pause/Play */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-2 py-1 rounded text-xs ${
              theme === 'dark'
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            {isLive ? '⏸ Pause' : '▶ Resume'}
          </button>

          {/* Replay */}
          <button
            onClick={isReplaying ? stopReplay : startReplay}
            disabled={events.length === 0 && !isReplaying}
            className={`px-2 py-1 rounded text-xs disabled:opacity-50 ${
              isReplaying
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : theme === 'dark'
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            {isReplaying ? '⏹ Stop Replay' : '🔄 Replay'}
          </button>

          {/* Clear */}
          <button
            onClick={() => { setEvents([]); stopReplay(); }}
            className={`px-2 py-1 rounded text-xs ${
              theme === 'dark'
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Event stream */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-3 font-mono text-xs space-y-0.5"
      >
        {filteredEvents.length === 0 ? (
          <div className={`text-center py-4 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
            Waiting for events...
          </div>
        ) : (
          filteredEvents.map(event => (
            <EventLine key={event.id} event={event} theme={theme} />
          ))
        )}
      </div>
    </div>
  );
}

function EventLine({ event, theme }) {
  const channelConfig = EVENT_CHANNELS[event.channel] || { color: 'gray', label: event.channel };
  
  const colorClasses = {
    purple: 'text-purple-400 bg-purple-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-green-400 bg-green-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    gray: 'text-gray-400 bg-gray-500/10',
  };

  return (
    <div className="flex items-start gap-2 py-0.5 hover:bg-slate-800/30 rounded px-1">
      {/* Timestamp */}
      <span className={theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}>
        {event.timestamp}
      </span>

      {/* Channel badge */}
      <span className={`px-1.5 py-0.5 rounded text-xs ${colorClasses[channelConfig.color]}`}>
        {channelConfig.label}
      </span>

      {/* Event type */}
      <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>
        {event.type}
      </span>

      {/* Data */}
      <span className={theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}>
        {JSON.stringify(event.data)}
      </span>
    </div>
  );
}
