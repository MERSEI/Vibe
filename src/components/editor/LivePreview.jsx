/**
 * LivePreview Component
 *
 * Live code execution preview (Sandpack-style) with framework detection and HMR
 *
 * Production integration points:
 * - @codesandbox/sandpack for full sandboxing
 * - Vite HMR plugin for true hot module replacement
 * - Full React/Vue/Svelte rendering via iframe
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// Detect framework from code content
function detectFramework(code) {
  if (/import\s+.*\bReact\b|from\s+['"]react['"]|jsx\b/.test(code)) return 'react';
  if (/import\s+.*\bVue\b|from\s+['"]vue['"]|createApp|defineComponent/.test(code)) return 'vue';
  if (/import\s+.*\bSvelte\b|from\s+['"]svelte['"]|\$:/.test(code)) return 'svelte';
  return 'vanilla';
}

const FRAMEWORK_LABELS = {
  react: { icon: '\u269B\uFE0F', label: 'React' },
  vue: { icon: '\uD83D\uDFE2', label: 'Vue' },
  svelte: { icon: '\uD83D\uDD36', label: 'Svelte' },
  vanilla: { icon: '\uD83D\uDFE8', label: 'JS' },
};

export function LivePreview({
  code,
  language = 'javascript',
  theme,
  t,
  autoRun = true,
}) {
  const [output, setOutput] = useState([]);
  const [error, setError] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hmrCount, setHmrCount] = useState(0);
  const prevCodeRef = useRef(code);

  const framework = useMemo(() => detectFramework(code), [code]);

  // HMR-style: track incremental updates
  useEffect(() => {
    if (prevCodeRef.current !== code && prevCodeRef.current !== '') {
      setHmrCount(c => c + 1);
      prevCodeRef.current = code;
    }
  }, [code]);

  // Execute code when it changes (with debounce)
  useEffect(() => {
    if (!autoRun) return;

    const timer = setTimeout(() => {
      executeCode();
    }, 500);

    return () => clearTimeout(timer);
  }, [code, autoRun]);

  const executeCode = useCallback(() => {
    if (language !== 'javascript' && language !== 'typescript') {
      setOutput([{ type: 'info', content: `// Preview not available for ${language}` }]);
      return;
    }

    setIsRunning(true);
    setError(null);
    const logs = [];

    try {
      // Create mock console
      const mockConsole = {
        log: (...args) => logs.push({ type: 'log', content: formatArgs(args) }),
        error: (...args) => logs.push({ type: 'error', content: formatArgs(args) }),
        warn: (...args) => logs.push({ type: 'warn', content: formatArgs(args) }),
        info: (...args) => logs.push({ type: 'info', content: formatArgs(args) }),
        table: (...args) => logs.push({ type: 'table', content: formatArgs(args) }),
        clear: () => { logs.length = 0; },
      };

      // Strip import/export statements for sandbox execution
      const sanitized = code
        .replace(/^import\s+.*$/gm, '// [import removed for sandbox]')
        .replace(/^export\s+(default\s+)?/gm, '');

      // Execute in sandboxed context
      const fn = new Function('console', sanitized);
      fn(mockConsole);

      if (logs.length > 0) {
        setOutput(logs);
      } else {
        setOutput([{ type: 'success', content: 'Executed successfully (no output)' }]);
      }
    } catch (e) {
      setError({
        message: e.message,
        stack: e.stack,
      });
    } finally {
      setIsRunning(false);
    }
  }, [code, language]);

  const formatArgs = (args) => {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  };

  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';
  const bgClass = theme === 'dark' ? 'bg-slate-900' : 'bg-white';
  const headerBg = theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50';
  const fw = FRAMEWORK_LABELS[framework];

  return (
    <div className={`h-full flex flex-col ${bgClass}`}>
      {/* Header */}
      <div className={`px-4 py-2 border-b ${borderClass} ${headerBg} flex items-center gap-2`}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
          {t.preview}
        </span>

        {/* Framework badge */}
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'
        }`}>
          {fw.icon} {fw.label}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* HMR indicator */}
          {hmrCount > 0 && (
            <span className={`text-xs ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
              HMR #{hmrCount}
            </span>
          )}

          {isRunning ? (
            <span className="text-xs text-blue-500 animate-pulse">Running...</span>
          ) : !error && (
            <span className="text-xs text-green-500">● {t.live}</span>
          )}

          <button
            onClick={executeCode}
            className={`px-2 py-1 rounded text-xs ${
              theme === 'dark'
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            ▶ {t.run}
          </button>
        </div>
      </div>

      {/* Output */}
      <div className={`flex-1 p-4 font-mono text-sm overflow-auto ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
        {error ? (
          <ErrorDisplay error={error} theme={theme} />
        ) : output.length > 0 ? (
          <div className="space-y-1">
            {output.map((log, i) => (
              <LogEntry key={i} log={log} theme={theme} />
            ))}
          </div>
        ) : (
          <EmptyState theme={theme} t={t} />
        )}
      </div>
    </div>
  );
}

function LogEntry({ log, theme }) {
  const colorMap = {
    log: theme === 'dark' ? 'text-slate-300' : 'text-gray-700',
    error: 'text-red-400',
    warn: 'text-yellow-400',
    info: 'text-blue-400',
    success: 'text-green-400',
    table: theme === 'dark' ? 'text-cyan-300' : 'text-cyan-700',
  };

  const iconMap = {
    log: '',
    error: '❌ ',
    warn: '⚠️ ',
    info: 'ℹ️ ',
    success: '',
    table: '📊 ',
  };

  return (
    <pre className={`whitespace-pre-wrap ${colorMap[log.type] || colorMap.log}`}>
      {iconMap[log.type]}{log.content}
    </pre>
  );
}

function ErrorDisplay({ error, theme }) {
  return (
    <div className={`p-4 rounded-lg ${
      theme === 'dark' ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'
    }`}>
      <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
        <span>❌</span>
        <span>Error</span>
      </div>
      <div className="text-red-400 mb-2">{error.message}</div>
      {error.stack && (
        <details className="text-xs text-red-400/70">
          <summary className="cursor-pointer hover:text-red-400">Stack trace</summary>
          <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
        </details>
      )}
    </div>
  );
}

function EmptyState({ theme, t }) {
  return (
    <div className={`text-center py-12 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
      <div className="text-4xl mb-3">▶️</div>
      <p className="text-sm">{t.noOutput}</p>
      <p className="text-xs mt-1">{t.runToSee}</p>
    </div>
  );
}
