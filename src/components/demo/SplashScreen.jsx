/**
 * SplashScreen — Cinematic intro for Vibe IDE demo presentation
 * Designed to wow the audience at the start of the demo
 */

import React, { useEffect, useState } from 'react';

const CODE_PARTICLES = [
  'const vibe = new IDE()',
  'agent.run()',
  'await rag.search()',
  'trace.span()',
  '<VibeIDE />',
  'useAgent()',
  'claude.send()',
  'otel.trace()',
  'yjs.sync()',
  'vector.embed()',
  'pgvector.query()',
  'liveblocks.room()',
  'async/await',
  'zustand.store()',
  '// built by claude',
  'hybrid.search()',
  'dag.execute()',
  'ANTHROPIC_API_KEY',
];

const FEATURES_EN = [
  { label: 'Monaco Editor', color: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
  { label: 'AI Agents DAG', color: 'bg-purple-500/10 border-purple-500/30 text-purple-400' },
  { label: 'RAG Pipeline', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  { label: 'OTEL Tracing', color: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
  { label: 'Live Collaboration', color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' },
  { label: 'pgvector Search', color: 'bg-pink-500/10 border-pink-500/30 text-pink-400' },
];

export function SplashScreen({ lang = 'en', t = {}, onStart }) {
  const [leaving, setLeaving] = useState(false);
  const [typed, setTyped] = useState('');

  // Localized content
  const TAGLINE = t.splashTagline || 'AI-Powered Development Environment';

  // Map translated feature names to colors
  const getFeatures = () => {
    const featureKeys = ['editor', 'agents', 'rag', 'tracing', 'collaboration', 'search'];
    const colors = [
      'bg-blue-500/10 border-blue-500/30 text-blue-400',
      'bg-purple-500/10 border-purple-500/30 text-purple-400',
      'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      'bg-orange-500/10 border-orange-500/30 text-orange-400',
      'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
      'bg-pink-500/10 border-pink-500/30 text-pink-400',
    ];
    return featureKeys.map((key, i) => ({
      label: t.splashFeatures?.[key] || FEATURES_EN[i].label,
      color: colors[i],
    }));
  };

  // Typewriter effect starts immediately
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= TAGLINE.length) {
        setTyped(TAGLINE.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    setLeaving(true);
    setTimeout(onStart, 700);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 30% 50%, #0d0a24 0%, #080818 40%, #050510 100%)',
        opacity: leaving ? 0 : 1,
        transition: 'opacity 0.7s ease',
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      {/* Floating code particles */}
      {CODE_PARTICLES.map((text, i) => (
        <div
          key={i}
          className="absolute font-mono text-xs select-none whitespace-nowrap pointer-events-none"
          style={{
            left: `${(i * 11 + 3) % 92}%`,
            top: `${(i * 17 + 5) % 88}%`,
            color: 'rgba(167, 139, 250, 0.12)',
            animation: `splash-float ${5 + (i % 5)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.37) % 4}s`,
            transform: `rotate(${-12 + (i * 6) % 24}deg)`,
          }}
        >
          {text}
        </div>
      ))}

      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            top: '10%',
            left: '5%',
            background:
              'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
            animation: 'splash-pulse 5s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            bottom: '5%',
            right: '5%',
            background:
              'radial-gradient(circle, rgba(6, 182, 212, 0.06) 0%, transparent 70%)',
            animation: 'splash-pulse 7s ease-in-out infinite',
            animationDelay: '1.5s',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            top: '40%',
            right: '20%',
            background:
              'radial-gradient(circle, rgba(168, 85, 247, 0.05) 0%, transparent 70%)',
            animation: 'splash-pulse 6s ease-in-out infinite',
            animationDelay: '3s',
          }}
        />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 text-center px-8 max-w-2xl w-full animate-fadeIn">
        {/* Claude badge */}
        <div
          className="flex items-center gap-2.5 px-5 py-2 rounded-full text-xs font-mono animate-pulse-soft"
          style={{
            border: '1px solid rgba(251, 146, 60, 0.3)',
            background: 'rgba(251, 146, 60, 0.07)',
            color: '#fb923c',
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              background: '#fb923c',
            }}
          />
          {t.splashBuiltBy || 'Built entirely by Claude · Anthropic'}
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">

          <h1
            className="font-black tracking-tight leading-none"
            style={{
              fontSize: 'clamp(80px, 15vw, 130px)',
              background:
                'linear-gradient(135deg, #a855f7 0%, #7c3aed 35%, #06b6d4 65%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '300% 300%',
              animation: 'splash-gradient 5s ease-in-out infinite',
            }}
          >
            VIBE
          </h1>

          {/* Typewriter tagline */}
          <div className="flex items-center gap-3 text-slate-400 font-mono text-sm tracking-widest uppercase">
            <span className="w-10 h-px bg-slate-700" />
            <span className="min-w-[20ch] text-center">
              {typed}
              <span
                className="inline-block w-0.5 h-3.5 bg-purple-400 ml-0.5 align-middle"
                style={{ animation: 'splash-blink 1s step-end infinite' }}
              />
            </span>
            <span className="w-10 h-px bg-slate-700" />
          </div>
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {getFeatures().map((f) => (
            <span
              key={f.label}
              className={`px-3 py-1 rounded-full border text-xs font-mono ${f.color}`}
            >
              {f.label}
            </span>
          ))}
        </div>

        {/* CTA Button */}
        <div>
          <button
            onClick={handleStart}
            className="group relative px-12 py-4 rounded-xl font-bold text-white text-base overflow-hidden
              transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none"
            style={{
              background:
                'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #06b6d4 100%)',
              boxShadow:
                '0 0 40px rgba(139, 92, 246, 0.35), 0 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            {/* Shine sweep */}
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background:
                  'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                backgroundSize: '200% 100%',
                animation: 'splash-shine 0.5s ease',
              }}
            />
            <span className="relative flex items-center gap-3 z-10">
              <span>{t.splashStartDemo || 'Start Interactive Demo'}</span>
              <span className="text-xl transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-slate-700 text-xs font-mono">
          {t.splashFooter || 'Vibe IDE · Demo v1.0 · 2025 · claude-sonnet-4-5'}
        </p>
      </div>
    </div>
  );
}
