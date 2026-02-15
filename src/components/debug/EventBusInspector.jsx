/**
 * EventBusInspector Component
 *
 * Real-time event stream visualization with:
 * - NATS WebSocket connection (nats.ws) with mock fallback
 * - Channel filtering
 * - Event replay functionality
 * - Live/pause toggle
 * - Connection status badge (Live NATS / Mock)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EVENT_CHANNELS } from '../../utils/constants';
import { subscribeToEvents, getConnectionStatus } from '../../api/nats/client';

export function EventBusInspector({ theme, t }) {
  const [events, setEvents] = useState([]);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayEvents, setReplayEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const containerRef = useRef(null);
  const replayTimerRef = useRef(null);

  // Subscribe to events (NATS or mock fallback)
  useEffect(() => {
    if (!isLive) return;

    let cleanup = null;

    subscribeToEvents(
      (event) => setEvents(prev => [...prev.slice(-50), event]),
      { mockIntervalMs: 1500 }
    ).then((cleanupFn) => {
      cleanup = cleanupFn;
      setConnectionStatus(getConnectionStatus());
    });

    return () => {
      if (cleanup) cleanup();
    };
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
            connectionStatus === 'connected' ? (
              <span className="text-xs text-green-500 animate-pulse">● Live NATS</span>
            ) : (
              <span className="text-xs text-yellow-500 animate-pulse">● Mock</span>
            )
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
