/**
 * DemoTourButton — Floating button to re-launch the interactive tour
 */

import React, { useState } from 'react';

export function DemoTourButton({ onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Launch Demo Tour"
      className="fixed bottom-6 left-6 z-[999] flex items-center gap-2 rounded-full
        font-mono text-xs font-medium text-white overflow-hidden
        transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none"
      style={{
        padding: hovered ? '10px 18px 10px 14px' : '10px 14px',
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4), 0 2px 8px rgba(0,0,0,0.3)',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <span className="text-base leading-none">🚀</span>
      <span
        className="overflow-hidden whitespace-nowrap"
        style={{
          maxWidth: hovered ? '100px' : '0px',
          opacity: hovered ? 1 : 0,
          transition: 'max-width 0.3s ease, opacity 0.2s ease',
        }}
      >
        Demo Tour
      </span>
    </button>
  );
}
