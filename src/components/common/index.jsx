/**
 * Common UI Components
 * 
 * Reusable components used across the application
 */

import React, { useEffect } from 'react';

// ============= TOAST =============
export function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const typeStyles = {
    success: 'bg-gradient-to-r from-green-600 to-emerald-600',
    error: 'bg-gradient-to-r from-red-600 to-pink-600',
    info: 'bg-gradient-to-r from-blue-600 to-cyan-600',
    warning: 'bg-gradient-to-r from-yellow-600 to-orange-600',
  };

  return (
    <div
      className={`fixed top-16 right-4 z-50 ${typeStyles[type]} text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-slideIn`}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        className="hover:bg-white/20 rounded px-2 py-0.5 text-sm"
      >
        ✕
      </button>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// ============= BUTTON =============
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  className = '',
  ...props
}) {
  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
    ghost: 'hover:bg-slate-700 text-slate-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-lg font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

// ============= INPUT =============
export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  theme = 'dark',
  className = '',
  ...props
}) {
  const themeStyles = theme === 'dark'
    ? 'bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-purple-500'
    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-purple-500';

  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`
        px-4 py-2 rounded-lg border text-sm outline-none transition-all
        ${themeStyles}
        ${className}
      `}
      {...props}
    />
  );
}

// ============= SELECT =============
export function Select({
  value,
  onChange,
  options,
  theme = 'dark',
  className = '',
  ...props
}) {
  const themeStyles = theme === 'dark'
    ? 'bg-slate-800 border-slate-600 text-slate-200'
    : 'bg-white border-gray-300 text-gray-800';

  return (
    <select
      value={value}
      onChange={onChange}
      className={`
        px-3 py-2 rounded-lg border text-sm outline-none cursor-pointer
        ${themeStyles}
        ${className}
      `}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ============= MODAL =============
export function Modal({ isOpen, onClose, title, children, theme = 'dark' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className={`
        relative max-w-lg w-full mx-4 rounded-xl shadow-2xl overflow-hidden
        ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}
      `}>
        {/* Header */}
        <div className={`
          px-6 py-4 border-b flex items-center justify-between
          ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}
        `}>
          <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============= TOOLTIP =============
export function Tooltip({ children, content, position = 'top' }) {
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative group">
      {children}
      <div className={`
        absolute ${positions[position]} z-50
        bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap
        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
      `}>
        {content}
      </div>
    </div>
  );
}

// ============= BADGE =============
export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-600 text-slate-200',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    error: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ============= LOADING SPINNER =============
export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`${sizes[size]} ${className} animate-spin`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" className="opacity-25" />
        <path d="M12 2a10 10 0 0 1 10 10" className="opacity-75" />
      </svg>
    </div>
  );
}

// ============= EMPTY STATE =============
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-medium text-slate-300 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-4">{description}</p>
      {action}
    </div>
  );
}
