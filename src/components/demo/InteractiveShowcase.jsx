/**
 * InteractiveShowcase — Auto-advancing tour guide for Vibe IDE demo
 * Displays a floating panel that walks through each major feature tab.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

const AUTO_ADVANCE_MS = 6500;

const TOUR_STEPS = [
  {
    tab: 'editor',
    icon: '📝',
    title: 'Monaco Code Editor',
    description:
      'Full-featured editor powered by Monaco — the engine behind VS Code. Multi-file tabs, syntax highlighting for 15+ languages, and live preview.',
    features: [
      'Syntax highlighting & code folding',
      'Multi-file tab management',
      'Live HTML/CSS preview pane',
      'Real-time collaborator cursors',
    ],
    accent: '#3b82f6',
    accentDim: 'rgba(59, 130, 246, 0.12)',
    tabLabel: 'Editor',
  },
  {
    tab: 'agents',
    icon: '🤖',
    title: 'AI Agent Builder',
    description:
      'Design multi-step AI pipelines with a drag-and-drop DAG interface. Compose chains of Claude agents with visual connections, templates, and live execution.',
    features: [
      'Visual DAG pipeline editor',
      '4 ready-made templates',
      'Claude 3 model selection',
      'Full OTEL span tracing',
    ],
    accent: '#a855f7',
    accentDim: 'rgba(168, 85, 247, 0.12)',
    tabLabel: 'Agents',
  },
  {
    tab: 'rag',
    icon: '🔍',
    title: 'RAG Playground',
    description:
      'Hybrid retrieval combining BM25 keyword search with vector similarity. Backed by pgvector + PostgreSQL, with configurable chunking strategies and TTL.',
    features: [
      'Hybrid BM25 + vector search',
      'Semantic & recursive chunking',
      'Real-time relevance scores',
      'pgvector / PostgreSQL backend',
    ],
    accent: '#10b981',
    accentDim: 'rgba(16, 185, 129, 0.12)',
    tabLabel: 'RAG',
  },
  {
    tab: 'debug',
    icon: '📊',
    title: 'OpenTelemetry Debug Viewer',
    description:
      'Full observability into every AI operation. Track token usage, costs, latency, and span timelines for each LLM call — in the browser, in real time.',
    features: [
      'Live OTEL trace stream',
      'Token & cost per call',
      'Span waterfall timeline',
      'Error classification & stats',
    ],
    accent: '#f97316',
    accentDim: 'rgba(249, 115, 22, 0.12)',
    tabLabel: 'Debug',
  },
];

export function InteractiveShowcase({ activeTab, onTabChange, onClose }) {
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [entering, setEntering] = useState(true);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setEntering(false), 50);
    return () => clearTimeout(t);
  }, []);

  // Change tab when step changes
  useEffect(() => {
    onTabChange(current.tab);
    setProgress(0);
    startTimeRef.current = performance.now();
  }, [step, current.tab, onTabChange]);

  // Auto-advance loop
  useEffect(() => {
    if (!autoPlay) return;
    startTimeRef.current = performance.now();

    const tick = (now) => {
      const elapsed = now - startTimeRef.current;
      const p = Math.min(elapsed / AUTO_ADVANCE_MS, 1);
      setProgress(p);

      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        if (!isLast) {
          setStep((s) => s + 1);
        } else {
          setAutoPlay(false);
        }
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [step, autoPlay, isLast]);

  const goTo = useCallback((i) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setStep(i);
    setAutoPlay(true);
    setProgress(0);
  }, []);

  const next = () => !isLast && goTo(step + 1);
  const prev = () => step > 0 && goTo(step - 1);

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 300);
  };

  const toggleAutoPlay = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!autoPlay) startTimeRef.current = performance.now() - progress * AUTO_ADVANCE_MS;
    setAutoPlay((p) => !p);
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-[1000] w-[320px] rounded-2xl overflow-hidden
        transition-all duration-300"
      style={{
        background: 'rgba(10, 10, 26, 0.97)',
        border: `1px solid ${current.accent}35`,
        boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 40px ${current.accent}18`,
        backdropFilter: 'blur(24px)',
        opacity: exiting ? 0 : entering ? 0 : 1,
        transform: exiting
          ? 'translateY(16px)'
          : entering
          ? 'translateY(16px)'
          : 'translateY(0)',
      }}
    >
      {/* Accent progress bar */}
      <div className="h-[3px] relative overflow-hidden" style={{ background: '#1e1e3a' }}>
        <div
          className="absolute inset-y-0 left-0 transition-none"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${current.accent}99, ${current.accent})`,
            boxShadow: `0 0 8px ${current.accent}80`,
          }}
        />
      </div>

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: current.accentDim }}
          >
            {current.icon}
          </div>
          <span className="text-xs font-mono text-slate-400">
            Demo Tour · {step + 1}/{TOUR_STEPS.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleAutoPlay}
            title={autoPlay ? 'Pause auto-advance' : 'Resume auto-advance'}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs
              transition-colors hover:bg-slate-800 text-slate-500 hover:text-slate-300"
          >
            {autoPlay ? '⏸' : '▶'}
          </button>
          <button
            onClick={handleClose}
            title="Close tour"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs
              transition-colors hover:bg-slate-800 text-slate-500 hover:text-slate-300"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Tab chip */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium"
            style={{
              background: current.accentDim,
              color: current.accent,
              border: `1px solid ${current.accent}30`,
            }}
          >
            /{current.tabLabel}
          </span>
          <span className="text-[10px] text-slate-600 font-mono">active panel</span>
        </div>

        {/* Title */}
        <h3
          className="text-sm font-bold leading-tight"
          style={{ color: current.accent }}
        >
          {current.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-400 leading-relaxed">{current.description}</p>

        {/* Feature list */}
        <ul className="space-y-1.5">
          {current.features.map((f, i) => (
            <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: current.accent,
                  boxShadow: `0 0 4px ${current.accent}80`,
                }}
              />
              {f}
            </li>
          ))}
        </ul>

        {/* Dots navigation */}
        <div className="flex justify-center gap-1.5 pt-1">
          {TOUR_STEPS.map((s, i) => (
            <button
              key={s.tab}
              onClick={() => goTo(i)}
              title={s.title}
              className="rounded-full transition-all duration-300 hover:opacity-80"
              style={{
                width: i === step ? '22px' : '6px',
                height: '6px',
                background: i === step ? current.accent : '#2d2d50',
                boxShadow: i === step ? `0 0 6px ${current.accent}60` : 'none',
              }}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={prev}
            disabled={step === 0}
            className="flex-1 py-2 rounded-lg text-xs font-mono transition-all
              disabled:opacity-25 disabled:cursor-not-allowed
              bg-slate-800/80 hover:bg-slate-700 text-slate-300"
          >
            ← Prev
          </button>
          {!isLast ? (
            <button
              onClick={next}
              className="flex-1 py-2 rounded-lg text-xs font-mono font-medium
                transition-all text-white hover:opacity-90 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${current.accent}cc, ${current.accent})`,
                boxShadow: `0 4px 14px ${current.accent}40`,
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="flex-1 py-2 rounded-lg text-xs font-mono font-medium
                transition-all text-white hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #059669cc, #10b981)',
                boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
              }}
            >
              Finish ✓
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 flex items-center justify-center gap-1.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#fb923c', animation: 'splash-pulse 2s ease-in-out infinite' }}
        />
        <span className="text-[10px] text-slate-700 font-mono">Built by Claude · Anthropic</span>
      </div>
    </div>
  );
}
