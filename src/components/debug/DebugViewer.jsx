/**
 * DebugViewer Component
 *
 * OpenTelemetry-powered debugging interface with:
 * - Trace timeline from real API calls
 * - Span breakdown
 * - Token usage charts
 * - Cost tracking
 *
 * Data source: useTraceStore (Zustand) populated by src/api/anthropic/client.js
 */

import React, { useState, useMemo } from 'react';
import { CURSOR_COLORS } from '../../utils/constants';
import { useTraceStore } from '../../api/telemetry/tracer';

export function DebugViewer({ theme, t }) {
  const traces = useTraceStore((s) => s.traces);
  const tokenUsageHistory = useTraceStore((s) => s.tokenUsageHistory);
  const clearTraces = useTraceStore((s) => s.clearTraces);

  const [selectedTrace, setSelectedTrace] = useState(null);
  const [filter, setFilter] = useState('all'); // all, success, error

  const filteredTraces = useMemo(() => {
    if (filter === 'all') return traces;
    return traces.filter((trace) => trace.status === filter);
  }, [filter, traces]);

  const stats = useMemo(() => ({
    traces: traces.length,
    spans: traces.reduce((sum, t) => sum + t.spans.length, 0),
    errors: traces.filter((t) => t.status === 'error').length,
    totalCost: traces.reduce((sum, t) => sum + t.cost, 0),
    totalTokens: traces.reduce((sum, t) => sum + t.tokens.input + t.tokens.output, 0),
  }), [traces]);

  return (
    <div className="h-full flex flex-col">
      {/* Live Controls */}
      <LiveBar onClear={clearTraces} traceCount={traces.length} theme={theme} />

      {/* Stats Bar */}
      <StatsBar stats={stats} theme={theme} t={t} />

      {/* Token Usage Chart */}
      <TokenUsageChart data={tokenUsageHistory} theme={theme} t={t} />

      {/* Filter Tabs */}
      <FilterTabs filter={filter} setFilter={setFilter} stats={stats} theme={theme} />

      {/* Trace Timeline */}
      <TraceTimeline
        traces={filteredTraces}
        selectedTrace={selectedTrace}
        onSelect={setSelectedTrace}
        theme={theme}
        t={t}
      />

      {/* Selected Trace Details */}
      {selectedTrace && (
        <TraceDetails
          trace={traces.find((t) => t.id === selectedTrace)}
          onClose={() => setSelectedTrace(null)}
          theme={theme}
          t={t}
        />
      )}
    </div>
  );
}

function LiveBar({ onClear, traceCount, theme }) {
  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';

  return (
    <div className={`px-4 py-2 border-b ${borderClass} flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
          📡 OTEL Trace Stream
        </span>
        <span className="text-xs text-green-500 animate-pulse">● Live</span>
      </div>
      <button
        onClick={onClear}
        className={`px-2 py-1 rounded text-xs ${
          theme === 'dark'
            ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }`}
      >
        🗑 Clear ({traceCount})
      </button>
    </div>
  );
}

function StatsBar({ stats, theme, t }) {
  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';

  const statItems = [
    { label: t.traces, value: stats.traces, color: 'purple', icon: '📊' },
    { label: t.spans, value: stats.spans, color: 'blue', icon: '⏱️' },
    { label: t.errors, value: stats.errors, color: 'red', icon: '❌' },
    { label: t.tokens, value: stats.totalTokens.toLocaleString(), color: 'green', icon: '🔤' },
    { label: t.cost, value: `$${stats.totalCost.toFixed(4)}`, color: 'yellow', icon: '💰' },
  ];

  return (
    <div className={`p-4 border-b ${borderClass} grid grid-cols-5 gap-4`}>
      {statItems.map((item) => (
        <div
          key={item.label}
          className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span>{item.icon}</span>
            <span className={`text-xl font-bold text-${item.color}-500`}>{item.value}</span>
          </div>
          <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function TokenUsageChart({ data, theme, t }) {
  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';

  if (data.length === 0) {
    return (
      <div className={`p-4 border-b ${borderClass}`}>
        <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
          <span>📈</span> {t.tokenUsage}
        </h3>
        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
          Token usage will appear here after API calls.
        </p>
      </div>
    );
  }

  const maxTokens = Math.max(...data.map((d) => d.input + d.output), 1);

  return (
    <div className={`p-4 border-b ${borderClass}`}>
      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
        <span>📈</span> {t.tokenUsage}
      </h3>

      <div className="flex items-end gap-2 h-20">
        {data.map((d, i) => {
          const inputHeight = (d.input / maxTokens) * 100;
          const outputHeight = (d.output / maxTokens) * 100;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 w-full flex items-end gap-0.5">
                <div
                  className="flex-1 bg-purple-500 rounded-t"
                  style={{ height: `${inputHeight}%` }}
                  title={`Input: ${d.input}`}
                />
                <div
                  className="flex-1 bg-pink-500 rounded-t"
                  style={{ height: `${outputHeight}%` }}
                  title={`Output: ${d.output}`}
                />
              </div>
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                {d.time.slice(0, 5)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>Input</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-pink-500" />
          <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>Output</span>
        </div>
      </div>
    </div>
  );
}

function FilterTabs({ filter, setFilter, stats, theme }) {
  const tabs = [
    { id: 'all', label: 'All', count: stats.traces },
    { id: 'success', label: 'Success', count: stats.traces - stats.errors },
    { id: 'error', label: 'Errors', count: stats.errors },
  ];

  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';

  return (
    <div className={`px-4 py-2 border-b ${borderClass} flex gap-2`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setFilter(tab.id)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            filter === tab.id
              ? 'bg-purple-600 text-white'
              : theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  );
}

function TraceTimeline({ traces, selectedTrace, onSelect, theme, t }) {
  return (
    <div className="flex-1 overflow-auto p-4">
      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
        <span>⏱️</span> {t.traceTimeline}
      </h3>

      {traces.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-12 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
          <div className="text-4xl mb-3">🔭</div>
          <p className="text-sm">No traces yet</p>
          <p className="text-xs mt-1">Run an agent or RAG search to see real traces here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {traces.map((trace, i) => (
            <TraceCard
              key={trace.id}
              trace={trace}
              index={i}
              isSelected={selectedTrace === trace.id}
              onSelect={() => onSelect(selectedTrace === trace.id ? null : trace.id)}
              theme={theme}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TraceCard({ trace, index, isSelected, onSelect, theme, t }) {
  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? theme === 'dark'
            ? 'bg-purple-600/20 border border-purple-500/50'
            : 'bg-purple-100 border border-purple-300'
          : theme === 'dark'
            ? 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700'
            : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${trace.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={`font-mono text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
            {trace.name}
          </span>
        </div>
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
          {trace.timestamp}
        </span>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs">
        <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
          ⏱️ {trace.duration}ms
        </span>
        {(trace.tokens.input + trace.tokens.output) > 0 && (
          <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
            🔤 {trace.tokens.input + trace.tokens.output} tokens
          </span>
        )}
        {trace.cost > 0 && (
          <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
            💰 ${trace.cost.toFixed(4)}
          </span>
        )}
        <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
          📊 {trace.spans.length} spans
        </span>
      </div>

      {/* Error message */}
      {trace.error && (
        <div className="mt-2 p-2 rounded bg-red-500/10 text-red-400 text-xs">
          {trace.error}
        </div>
      )}

      {/* Expanded Spans */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-slate-600/30">
          <SpanTimeline spans={trace.spans} totalDuration={trace.duration} theme={theme} />
        </div>
      )}
    </div>
  );
}

function SpanTimeline({ spans, totalDuration, theme }) {
  return (
    <div className="space-y-1">
      {spans.map((span, i) => {
        const startPercent = (span.start / Math.max(totalDuration, 1)) * 100;
        const widthPercent = Math.max((span.duration / Math.max(totalDuration, 1)) * 100, 5);

        return (
          <div key={span.id} className="flex items-center gap-2">
            <span className={`text-xs w-24 truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
              {span.name}
            </span>
            <div className="flex-1 h-4 bg-slate-700/30 rounded relative">
              <div
                className="absolute h-full rounded flex items-center px-1"
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                  backgroundColor: CURSOR_COLORS[i % CURSOR_COLORS.length],
                }}
              >
                <span className="text-xs text-white truncate">
                  {span.duration}ms
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TraceDetails({ trace, onClose, theme, t }) {
  if (!trace) return null;

  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';

  return (
    <div className={`border-t ${borderClass} p-4 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
          Trace Details: {trace.name}
        </h3>
        <button
          onClick={onClose}
          className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <span className={`block text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Status</span>
          <span className={trace.status === 'success' ? 'text-green-500' : 'text-red-500'}>
            {trace.status}
          </span>
        </div>
        <div>
          <span className={`block text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{t.duration}</span>
          <span className={theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}>{trace.duration}ms</span>
        </div>
        <div>
          <span className={`block text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{t.tokens}</span>
          <span className={theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}>
            {trace.tokens.input} in / {trace.tokens.output} out
          </span>
        </div>
        <div>
          <span className={`block text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{t.cost}</span>
          <span className={theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}>${trace.cost.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}
