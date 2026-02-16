/**
 * LivePreview Component
 *
 * Iframe-based live preview supporting all IDE languages:
 * - HTML → direct srcDoc render
 * - CSS → sample elements with user styles
 * - JS/TS → script execution with console capture
 * - JSX/TSX → Babel + React CDN compilation
 * - Markdown → marked.js rendering
 * - JSON → pretty-print viewer
 * - Python/Rust/Go/SQL/Dockerfile/YAML → styled code viewer
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';

// Detect if JS code contains JSX
function isJSX(code) {
  return /from\s+['"]react['"]|<[A-Z][A-Za-z]*[\s/>]|React\.createElement|\.jsx/.test(code);
}

function detectFramework(code, language) {
  if (language === 'html') return 'html';
  if (language === 'css') return 'css';
  if (language === 'markdown') return 'md';
  if (language === 'json') return 'json';
  if (language === 'typescript' && isJSX(code)) return 'tsx';
  if (language === 'typescript') return 'ts';
  if (language === 'javascript' && isJSX(code)) return 'jsx';
  if (language === 'javascript') return 'js';
  return language;
}

const FRAMEWORK_META = {
  html:       { icon: '🌐', label: 'HTML' },
  css:        { icon: '🎨', label: 'CSS' },
  js:         { icon: '🟨', label: 'JS' },
  ts:         { icon: '🔷', label: 'TS' },
  jsx:        { icon: '⚛️', label: 'JSX' },
  tsx:        { icon: '⚛️', label: 'TSX' },
  md:         { icon: '📝', label: 'Markdown' },
  json:       { icon: '📦', label: 'JSON' },
  python:     { icon: '🐍', label: 'Python' },
  rust:       { icon: '🦀', label: 'Rust' },
  go:         { icon: '🐹', label: 'Go' },
  sql:        { icon: '🗄️', label: 'SQL' },
  dockerfile: { icon: '🐳', label: 'Dockerfile' },
  yaml:       { icon: '📋', label: 'YAML' },
};

const CODE_VIEWER_LANGS = ['python', 'rust', 'go', 'sql', 'dockerfile', 'yaml'];
const CODE_LANG_BADGE = {
  python:     { icon: '🐍', name: 'Python', note: 'Use a Python environment to run' },
  rust:       { icon: '🦀', name: 'Rust',   note: 'Use rustc/cargo to compile' },
  go:         { icon: '🐹', name: 'Go',     note: 'Use go run to execute' },
  sql:        { icon: '🗄️', name: 'SQL',    note: 'Run against a database' },
  dockerfile: { icon: '🐳', name: 'Docker', note: 'Build with docker build' },
  yaml:       { icon: '📋', name: 'YAML',   note: 'Configuration file' },
};

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const IFRAME_BASE_STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 8px; background: #0f172a; color: #e2e8f0;
         font-family: monospace; font-size: 12px; line-height: 1.5; }
  pre { white-space: pre-wrap; word-break: break-all; }
`;

const CONSOLE_SCRIPT = `
(function() {
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmt(a) { return Array.from(a).map(function(x){
    return typeof x==='object'&&x!==null?JSON.stringify(x,null,2):String(x);
  }).join(' '); }
  function out(type, args) {
    var colors = {error:'#f87171',warn:'#fbbf24',info:'#60a5fa',log:'#e2e8f0'};
    var icons  = {error:'❌ ',warn:'⚠️ ',info:'ℹ️ '};
    var el = document.createElement('pre');
    el.style.cssText = 'margin:1px 0;color:'+( colors[type]||colors.log )+';padding:1px 0';
    el.innerHTML = (icons[type]||'') + esc(fmt(args));
    document.body.appendChild(el);
  }
  window.console = {
    log:   function(){ out('log',  arguments); },
    error: function(){ out('error',arguments); },
    warn:  function(){ out('warn', arguments); },
    info:  function(){ out('info', arguments); },
    table: function(){ out('log',  arguments); },
    clear: function(){ document.body.innerHTML=''; },
  };
  window.onerror = function(msg,_,line,col) {
    var el = document.createElement('pre');
    el.style.cssText = 'color:#f87171;background:#7f1d1d30;padding:6px;border-radius:4px;border:1px solid #f8717140;margin:4px 0';
    el.textContent = '❌ ' + msg + (line ? ' (line ' + line + ':' + col + ')' : '');
    document.body.appendChild(el);
  };
})();
`;

function buildSrcDoc(code, language) {
  const fw = detectFramework(code, language);

  // ── HTML ─────────────────────────────────────────────────────
  if (fw === 'html') {
    return code;
  }

  // ── CSS ──────────────────────────────────────────────────────
  if (fw === 'css') {
    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
body{background:#1e293b;color:#e2e8f0;font-family:sans-serif;padding:16px;font-size:14px}
hr{border-color:#334155;margin:12px 0}
.preview-note{font-size:11px;color:#64748b;margin-bottom:12px;font-family:monospace}
${code}
</style></head><body>
<p class="preview-note">↓ Your styles applied to sample elements below</p>
<h1 class="title">Heading 1</h1>
<h2 class="subtitle">Heading 2</h2>
<p class="text">Paragraph text. <a class="link" href="#">A link</a>.</p>
<button class="btn">Button</button>
<input class="input" value="Input" type="text" style="display:block;margin:8px 0">
<div class="card box" style="margin-top:8px;padding:8px;border:1px solid">Card / Box</div>
<ul class="list"><li class="item">Item 1</li><li class="item">Item 2</li><li class="item">Item 3</li></ul>
<hr>
<span class="badge tag label">Badge</span>
</body></html>`;
  }

  // ── Markdown ──────────────────────────────────────────────────
  if (fw === 'md') {
    const safe = JSON.stringify(code);
    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:16px;max-width:720px;
     background:#0f172a;color:#e2e8f0;line-height:1.7;font-size:14px}
h1,h2,h3{color:#a78bfa;border-bottom:1px solid #334155;padding-bottom:4px}
h4,h5,h6{color:#c4b5fd}
code{background:#1e293b;padding:2px 6px;border-radius:3px;color:#fb923c;font-size:12px}
pre{background:#1e293b;padding:12px;border-radius:6px;overflow:auto}
pre code{background:none;padding:0;color:#e2e8f0}
a{color:#60a5fa}
blockquote{border-left:3px solid #7c3aed;margin-left:0;padding-left:12px;color:#94a3b8}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #334155;padding:6px 10px}
th{background:#1e293b}
hr{border-color:#334155}
img{max-width:100%}
</style></head><body>
<div id="md"></div>
<script>
  try {
    document.getElementById('md').innerHTML = marked.parse(${safe});
  } catch(e) {
    document.getElementById('md').textContent = 'Parse error: ' + e.message;
  }
<\/script>
</body></html>`;
  }

  // ── JSON ──────────────────────────────────────────────────────
  if (fw === 'json') {
    const safe = JSON.stringify(code);
    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<style>
body{margin:0;padding:8px;background:#0f172a;color:#e2e8f0;font-family:monospace;font-size:12px}
.key{color:#60a5fa}.str{color:#a3e635}.num{color:#fb923c}.bool{color:#f472b6}.null_{color:#94a3b8}
pre{white-space:pre-wrap;word-break:break-all;margin:0}
.err{color:#f87171;background:#7f1d1d30;padding:8px;border-radius:4px;border:1px solid #f8717140}
</style></head><body>
<script>
try {
  var raw = JSON.parse(${safe});
  var s = JSON.stringify(raw, null, 2);
  s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  s = s.replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="key">$1</span>$2');
  s = s.replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="str">$1</span>');
  s = s.replace(/:\s*(-?\\d+\\.?\\d*)/g, ': <span class="num">$1</span>');
  s = s.replace(/:\s*(true|false)/g, ': <span class="bool">$1</span>');
  s = s.replace(/:\s*(null)/g, ': <span class="null_">$1</span>');
  document.body.innerHTML = '<pre>' + s + '</pre>';
} catch(e) {
  document.body.innerHTML = '<div class="err">❌ JSON parse error: ' + e.message + '</div>';
}
<\/script>
</body></html>`;
  }

  // ── JSX / TSX → Babel + React ─────────────────────────────────
  if (fw === 'jsx' || fw === 'tsx') {
    const safe = code.replace(/`/g, '\\`').replace(/<\/script>/gi, '<\\/script>');
    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
<style>
body{margin:0;padding:0;background:#0f172a;color:#e2e8f0;font-family:sans-serif}
.preview-error{color:#f87171;background:#7f1d1d30;padding:12px;border-radius:4px;
  border:1px solid #f8717140;margin:8px;font-family:monospace;font-size:12px}
</style></head><body>
<div id="root"></div>
<script type="text/babel" data-presets="react">
${safe}
try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  const comp = typeof App !== 'undefined' ? App
    : typeof default_1 !== 'undefined' ? default_1
    : null;
  if (comp) {
    root.render(React.createElement(comp));
  } else {
    document.getElementById('root').innerHTML = '<div class="preview-error">⚛️ Export a default function named <b>App</b> to render it here</div>';
  }
} catch(e) {
  document.getElementById('root').innerHTML = '<div class="preview-error">❌ ' + e.message + '</div>';
}
<\/script>
</body></html>`;
  }

  // ── JS / TS → script execution ────────────────────────────────
  if (fw === 'js' || fw === 'ts') {
    let sanitized = code
      .replace(/^import\s+.*$/gm, '/* import removed */')
      .replace(/^export\s+default\s+/gm, 'var _default = ')
      .replace(/^export\s+/gm, '');

    if (fw === 'ts') {
      // Strip basic TypeScript annotations
      sanitized = sanitized
        .replace(/:\s*(string|number|boolean|void|any|never|unknown|null|undefined)(\[\])?(?=[\s,;)=])/g, '')
        .replace(/\?:/g, ':')
        .replace(/<[A-Z][A-Za-z<>, ]*>/g, '')
        .replace(/\bas\s+\w+/g, '')
        .replace(/^(interface|type)\s+\w+[^{]*\{[^}]*\}/gm, '')
        .replace(/^declare\s+.*$/gm, '');
    }

    const safeCode = sanitized.replace(/`/g, '\\`').replace(/<\/script>/gi, '<\\/script>');
    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<style>${IFRAME_BASE_STYLE}</style>
</head><body>
<script>${CONSOLE_SCRIPT}
try {
${safeCode}
} catch(e) {
  var el = document.createElement('pre');
  el.style.cssText = 'color:#f87171;background:#7f1d1d30;padding:6px;border-radius:4px;border:1px solid #f8717140;margin:4px 0';
  el.textContent = '❌ ' + e.message;
  document.body.appendChild(el);
}
<\/script>
</body></html>`;
  }

  // ── Code Viewer (Python, Rust, Go, SQL, Dockerfile, YAML) ─────
  if (CODE_VIEWER_LANGS.includes(language)) {
    const meta = CODE_LANG_BADGE[language] || { icon: '📄', name: language, note: 'Code viewer' };
    const highlighted = escapeHtml(code);
    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<style>
${IFRAME_BASE_STYLE}
.badge{display:inline-flex;align-items:center;gap:6px;background:#1e293b;border:1px solid #334155;
  border-radius:6px;padding:4px 10px;font-size:11px;color:#94a3b8;margin-bottom:10px}
.badge strong{color:#e2e8f0}
pre{background:#1e293b;padding:12px;border-radius:6px;border:1px solid #334155;margin:0;
  overflow:auto;font-size:12px;line-height:1.6}
</style></head><body>
<div class="badge">${meta.icon} <strong>${meta.name}</strong> — ${meta.note}</div>
<pre>${highlighted}</pre>
</body></html>`;
  }

  // Fallback
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${IFRAME_BASE_STYLE}</style></head>
<body><pre style="color:#94a3b8;padding:16px">Preview not available for: ${escapeHtml(language)}</pre></body></html>`;
}

export function LivePreview({
  code,
  language = 'javascript',
  theme,
  t,
  autoRun = true,
}) {
  const [iframeKey, setIframeKey] = useState(0);
  const [hmrCount, setHmrCount] = useState(0);
  const prevCodeRef = useRef(code);

  const fw = detectFramework(code, language);
  const fwMeta = FRAMEWORK_META[fw] || FRAMEWORK_META.js;

  // Track HMR-style updates
  useEffect(() => {
    if (prevCodeRef.current !== code && prevCodeRef.current !== '') {
      setHmrCount(c => c + 1);
      prevCodeRef.current = code;
    }
  }, [code]);

  // Auto-refresh iframe on code change
  useEffect(() => {
    if (!autoRun) return;
    const timer = setTimeout(() => setIframeKey(k => k + 1), 500);
    return () => clearTimeout(timer);
  }, [code, autoRun]);

  const iframeSrc = useMemo(() => buildSrcDoc(code, language), [code, language]);

  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';
  const bgClass = theme === 'dark' ? 'bg-slate-900' : 'bg-white';
  const headerBg = theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50';
  const btnClass = theme === 'dark'
    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
    : 'bg-gray-200 hover:bg-gray-300 text-gray-700';

  return (
    <div className={`h-full flex flex-col ${bgClass}`}>
      {/* Header */}
      <div className={`px-3 py-1.5 border-b ${borderClass} ${headerBg} flex flex-wrap items-center gap-1.5`}>
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>

        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
          {t.preview}
        </span>

        {/* Framework badge */}
        <span className={`hidden sm:inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
          theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'
        }`}>
          {fwMeta.icon} {fwMeta.label}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {/* HMR indicator */}
          {hmrCount > 0 && (
            <span className={`hidden sm:inline text-xs ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
              ⚡#{hmrCount}
            </span>
          )}

          <span className="text-xs text-green-500">● {t.live}</span>

          <button
            onClick={() => setIframeKey(k => k + 1)}
            className={`px-2 py-1 rounded text-xs ${btnClass}`}
            title="Refresh preview"
          >
            ↺ <span className="hidden sm:inline">{t.run}</span>
          </button>
        </div>
      </div>

      {/* Iframe */}
      <iframe
        key={iframeKey}
        srcDoc={iframeSrc}
        sandbox="allow-scripts allow-forms allow-modals"
        className="flex-1 w-full border-0"
        title="preview"
      />
    </div>
  );
}
