/**
 * RAGPlayground Component
 *
 * Retrieval-Augmented Generation interface with:
 * - Hybrid BM25 + vector search with mode selector
 * - Document search with relevance scoring
 * - Chunking strategy selection
 * - Source docs viewer
 * - Vector DB stats & embedding model info
 *
 * Production integration points:
 * - pgvector for actual vector search
 * - Embedding API (OpenAI / Voyage AI)
 * - pg_bm25 for keyword search
 */

import React, { useState, useCallback, useEffect } from 'react';
import { CHUNKING_STRATEGIES } from '../../utils/constants';
import { ragSearch, getBackendStatus } from '../../api/rag/client';
import { publishEvent } from '../../api/nats/client';

// Search mode definitions
const SEARCH_MODES = [
  { id: 'hybrid', label: 'Hybrid', icon: '⚡', description: 'BM25 + Vector combined' },
  { id: 'vector', label: 'Vector', icon: '🧮', description: 'Semantic similarity' },
  { id: 'bm25', label: 'BM25', icon: '📝', description: 'Keyword matching' },
];

export function RAGPlayground({ theme, t }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchMode, setSearchMode] = useState('hybrid');
  const [searchLatency, setSearchLatency] = useState(null);

  // Settings
  const [chunkStrategy, setChunkStrategy] = useState('recursive');
  const [chunkSize, setChunkSize] = useState(512);
  const [ttl, setTtl] = useState(3600);

  // Статус подключения к бекенду
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [docCount, setDocCount] = useState(null);

  useEffect(() => {
    getBackendStatus().then(data => {
      setConnectionStatus(data.status === 'ok' ? 'connected' : 'mock');
      if (data.documents != null) setDocCount(data.documents);
    });
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSelectedResult(null);
    setSearchLatency(null);
    const start = performance.now();
    publishEvent('rag.search.start', { query, mode: searchMode });

    try {
      const results = await ragSearch(query, {
        mode: searchMode,
        limit: 5,
        vectorWeight: searchMode === 'hybrid' ? 0.6 : undefined,
        bm25Weight: searchMode === 'hybrid' ? 0.4 : undefined,
      });

      const latencyMs = Math.round(performance.now() - start);
      setResults(Array.isArray(results) ? results : []);
      setSearchLatency(latencyMs);
      publishEvent('rag.search.complete', { query, mode: searchMode, resultCount: Array.isArray(results) ? results.length : 0, latencyMs });
    } catch (err) {
      console.error('RAG search error:', err);
      setResults([]);
      publishEvent('rag.search.error', { query, error: err.message });
    } finally {
      setLoading(false);
    }
  }, [query, searchMode]);

  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';

  return (
    <div className="h-full flex">
      {/* Left Panel - Search & Results */}
      <div className="flex-1 flex flex-col">
        {/* Search Input */}
        <SearchInput
          query={query}
          setQuery={setQuery}
          onSearch={handleSearch}
          loading={loading}
          theme={theme}
          t={t}
        />

        {/* Search Mode Selector */}
        <SearchModeSelector
          mode={searchMode}
          setMode={setSearchMode}
          theme={theme}
        />

        {/* Settings */}
        <SearchSettings
          chunkStrategy={chunkStrategy}
          setChunkStrategy={setChunkStrategy}
          chunkSize={chunkSize}
          setChunkSize={setChunkSize}
          ttl={ttl}
          setTtl={setTtl}
          theme={theme}
          t={t}
        />

        {/* Results */}
        <SearchResults
          results={results}
          selectedResult={selectedResult}
          onSelect={setSelectedResult}
          loading={loading}
          searchMode={searchMode}
          searchLatency={searchLatency}
          theme={theme}
          t={t}
        />

        {/* Vector DB Stats */}
        <VectorDBStats theme={theme} t={t} searchMode={searchMode} connectionStatus={connectionStatus} docCount={docCount} />
      </div>

      {/* Right Panel - Document Viewer */}
      {selectedResult && (
        <DocumentViewer
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
          searchMode={searchMode}
          theme={theme}
          t={t}
        />
      )}
    </div>
  );
}

function SearchInput({ query, setQuery, onSearch, loading, theme, t }) {
  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';
  const inputClass = theme === 'dark'
    ? 'bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-purple-500'
    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-purple-500';

  return (
    <div className={`p-4 border-b ${borderClass}`}>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder={t.query}
          className={`flex-1 px-4 py-2 rounded-lg text-sm outline-none border ${inputClass}`}
        />
        <button
          onClick={onSearch}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
        >
          {loading ? '...' : '🔍 ' + t.search}
        </button>
      </div>
    </div>
  );
}

function SearchModeSelector({ mode, setMode, theme }) {
  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';

  return (
    <div className={`px-4 py-2 border-b ${borderClass} flex items-center gap-2`}>
      <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
        Search mode:
      </span>
      <div className="flex gap-1">
        {SEARCH_MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            title={m.description}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              mode === m.id
                ? 'bg-purple-600 text-white'
                : theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchSettings({ chunkStrategy, setChunkStrategy, chunkSize, setChunkSize, ttl, setTtl, theme, t }) {
  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';
  const selectClass = theme === 'dark'
    ? 'bg-slate-700 text-slate-300 border-slate-600'
    : 'bg-gray-100 text-gray-700 border-gray-300';

  return (
    <div className={`px-4 py-3 border-b ${borderClass} flex flex-wrap gap-4 items-center`}>
      {/* Chunking Strategy */}
      <div className="flex items-center gap-2">
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
          {t.chunkingStrategy}:
        </span>
        <select
          value={chunkStrategy}
          onChange={(e) => setChunkStrategy(e.target.value)}
          className={`text-xs px-2 py-1 rounded border ${selectClass}`}
        >
          {CHUNKING_STRATEGIES.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Chunk Size */}
      <div className="flex items-center gap-2">
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
          Size: {chunkSize}
        </span>
        <input
          type="range"
          min="128"
          max="2048"
          step="128"
          value={chunkSize}
          onChange={(e) => setChunkSize(Number(e.target.value))}
          className="w-20 h-1 accent-purple-500"
        />
      </div>

      {/* TTL */}
      <div className="flex items-center gap-2">
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
          {t.ttl}: {Math.round(ttl / 60)}m
        </span>
        <input
          type="range"
          min="60"
          max="7200"
          step="60"
          value={ttl}
          onChange={(e) => setTtl(Number(e.target.value))}
          className="w-20 h-1 accent-purple-500"
        />
      </div>
    </div>
  );
}

function SearchResults({ results, selectedResult, onSelect, loading, searchMode, searchLatency, theme, t }) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🔍</div>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            Searching ({SEARCH_MODES.find(m => m.id === searchMode)?.label})...
          </p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className={`text-center ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
          <div className="text-4xl mb-3">🔎</div>
          <p className="text-sm">{t.query}</p>
          <p className="text-xs mt-1">{t.hybridSearch}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      {/* Latency info */}
      {searchLatency !== null && (
        <div className={`mb-3 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
          {results.length} results in {searchLatency}ms ({SEARCH_MODES.find(m => m.id === searchMode)?.label} mode)
        </div>
      )}
      <div className="space-y-3">
        {results.map(result => (
          <ResultCard
            key={result.id}
            result={result}
            isSelected={selectedResult?.id === result.id}
            onSelect={() => onSelect(result)}
            searchMode={searchMode}
            theme={theme}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function ResultCard({ result, isSelected, onSelect, searchMode, theme, t }) {
  const getScoreColor = (score) => {
    if (score >= 0.9) return 'bg-green-500/20 text-green-400';
    if (score >= 0.8) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-slate-500/20 text-slate-400';
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'bg-purple-600/20 border-purple-500'
          : theme === 'dark'
            ? 'bg-slate-800/50 hover:bg-slate-800 border-slate-700'
            : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
      } border`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className={`font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
            📄 {result.title}
          </span>
          <span className={`ml-2 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
            {result.source}
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreColor(result.score)}`}>
          {(result.score * 100).toFixed(0)}% {t.relevance}
        </span>
      </div>

      <p className={`text-sm line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
        {result.chunk}
      </p>

      <div className={`mt-2 flex gap-3 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
        <span>🔤 {result.metadata.tokens} tokens</span>
        <span>📅 {result.metadata.lastUpdated}</span>
        {/* Show sub-scores for hybrid mode */}
        {searchMode === 'hybrid' && result.bm25Score != null && result.vectorScore != null && (
          <>
            <span>📝 BM25: {(result.bm25Score * 100).toFixed(0)}%</span>
            <span>🧮 Vec: {(result.vectorScore * 100).toFixed(0)}%</span>
          </>
        )}
      </div>
    </div>
  );
}

function DocumentViewer({ result, onClose, searchMode, theme, t }) {
  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';

  return (
    <div className={`w-96 border-l ${borderClass} flex flex-col ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${borderClass} flex items-center justify-between`}>
        <div>
          <h3 className={`font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
            {result.title}
          </h3>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            {result.source}
          </p>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'}`}>
          <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
            {result.chunk}
          </p>
        </div>

        {/* Score breakdown */}
        {searchMode === 'hybrid' && result.bm25Score != null && result.vectorScore != null && (
          <div className="mt-4">
            <h4 className={`text-xs font-semibold uppercase mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
              Score Breakdown
            </h4>
            <div className="space-y-2">
              <ScoreBar label="Combined" score={result.score} color="purple" theme={theme} />
              <ScoreBar label="BM25" score={result.bm25Score} color="blue" theme={theme} />
              <ScoreBar label="Vector" score={result.vectorScore} color="green" theme={theme} />
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-4 space-y-2">
          <h4 className={`text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            Metadata
          </h4>
          {Object.entries(result.metadata).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>{key}</span>
              <span className={theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className={`p-4 border-t ${borderClass} flex gap-2`}>
        <button className={`flex-1 px-3 py-2 rounded-lg text-sm ${
          theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }`}>
          Open Source
        </button>
        <button className="flex-1 px-3 py-2 rounded-lg text-sm bg-purple-600 hover:bg-purple-700 text-white">
          Use in Query
        </button>
      </div>
    </div>
  );
}

function ScoreBar({ label, score, color, theme }) {
  const bgColors = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs w-16 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{label}</span>
      <div className={`flex-1 h-2 rounded-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}`}>
        <div
          className={`h-full rounded-full ${bgColors[color]}`}
          style={{ width: `${score * 100}%` }}
        />
      </div>
      <span className={`text-xs w-10 text-right ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function VectorDBStats({ theme, t, searchMode, connectionStatus, docCount }) {
  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';
  const bgClass = theme === 'dark' ? 'bg-slate-800/30' : 'bg-gray-50';

  const statusLabel = connectionStatus === 'connected'
    ? `● Connected${docCount != null ? ` (${docCount} docs)` : ''}`
    : connectionStatus === 'mock'
      ? '○ Mock mode'
      : '◌ Checking...';

  const statusColor = connectionStatus === 'connected' ? 'text-green-500'
    : connectionStatus === 'mock' ? 'text-yellow-500' : 'text-slate-400';

  return (
    <div className={`p-4 border-t ${borderClass} ${bgClass}`}>
      <div className="flex justify-between items-center text-xs">
        <div className="flex gap-4">
          <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
            📊 {t.vectorDb}: pgvector
          </span>
          <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
            📐 768 dims
          </span>
          <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
            🧬 text-embedding-004
          </span>
          <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
            🔍 Mode: {SEARCH_MODES.find(m => m.id === searchMode)?.label}
          </span>
        </div>
        <span className={statusColor}>{statusLabel}</span>
      </div>
    </div>
  );
}
