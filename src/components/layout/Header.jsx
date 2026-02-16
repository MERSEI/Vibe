/**
 * Header Component
 *
 * Top navigation bar with logo, collaborators, and controls
 */

import React from 'react';
import { CURSOR_COLORS } from '../../utils/constants';
import { useVibeUser } from '../../api/clerk/provider';

export function Header({
  theme,
  lang,
  t,
  onToggleTheme,
  onToggleLang,
  collaborators,
}) {
  const borderClass = theme === 'dark' ? 'border-slate-800' : 'border-gray-200';
  const bgClass = theme === 'dark' ? 'bg-slate-900' : 'bg-white';

  return (
    <header className={`h-12 border-b ${borderClass} flex items-center justify-between px-3 sm:px-4 ${bgClass}`}>
      {/* Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-lg shadow-lg shrink-0">
          ⚡
        </div>
        <div className="hidden sm:block">
          <h1 className="text-sm font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Collaborators */}
        <CollaboratorAvatars
          collaborators={collaborators}
          theme={theme}
          t={t}
        />

        {/* Language toggle */}
        <button
          onClick={onToggleLang}
          className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            theme === 'dark'
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {lang === 'en' ? '🇬🇧' : '🇷🇺'}{' '}
          <span className="hidden sm:inline">{lang.toUpperCase()}</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            theme === 'dark'
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {theme === 'dark' ? '🌙' : '☀️'}{' '}
          <span className="hidden sm:inline">{theme === 'dark' ? t.darkMode : t.lightMode}</span>
        </button>
      </div>
    </header>
  );
}

function CollaboratorAvatars({ collaborators, theme, t }) {
  const { name, avatar } = useVibeUser();

  return (
    <div className="flex items-center gap-1">
      {/* Self */}
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="w-7 h-7 rounded-full ring-2 ring-purple-400/50 object-cover"
          title={`${name} — ${t.youAreHere}`}
        />
      ) : (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white font-medium ring-2 ring-purple-400/50"
          style={{ backgroundColor: CURSOR_COLORS[0] }}
          title={`${name} — ${t.youAreHere}`}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Others */}
      {collaborators.map((c, i) => (
        c.avatar ? (
          <img
            key={c.id}
            src={c.avatar}
            alt={c.name}
            className="w-7 h-7 rounded-full ring-2 ring-white/30 -ml-2 object-cover"
            title={`${c.name} ${t.editing}`}
          />
        ) : (
          <div
            key={c.id}
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white font-medium ring-2 ring-white/30 -ml-2"
            style={{ backgroundColor: c.color || CURSOR_COLORS[(i + 1) % CURSOR_COLORS.length] }}
            title={`${c.name} ${t.editing}`}
          >
            {c.name.charAt(0)}
          </div>
        )
      ))}

      {/* Count — hidden on small screens */}
      <span className={`text-xs ml-2 hidden md:inline ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
        {collaborators.length + 1} {t.collaborators}
      </span>
    </div>
  );
}
