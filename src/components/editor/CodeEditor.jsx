/**
 * CodeEditor Component — Monaco Editor
 *
 * Full Monaco Editor with syntax highlighting, minimap, autocomplete.
 * Remote cursors from Liveblocks displayed as overlay.
 */

import React, { useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { CURSOR_COLORS } from '../../utils/constants';

export function CodeEditor({
  content,
  onChange,
  language = 'javascript',
  theme = 'dark',
  collaborators = [],
  readOnly = false,
  fontSize = 14,
  tabSize = 2,
}) {
  const containerRef = useRef(null);

  const handleEditorMount = useCallback((editor, monaco) => {
    // Update tab size
    editor.getModel()?.updateOptions({ tabSize });

    // Keyboard shortcut: Ctrl+/ → toggle comment (Monaco already supports this)
  }, [tabSize]);

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <div ref={containerRef} className="relative h-full">
      {/* Remote cursors overlay (Liveblocks presence) */}
      {collaborators.map((collab, i) => (
        <RemoteCursor
          key={collab.id}
          name={collab.name}
          cursor={collab.cursor}
          color={collab.color || CURSOR_COLORS[(i + 1) % CURSOR_COLORS.length]}
          fontSize={fontSize}
        />
      ))}

      <Editor
        height="100%"
        language={language}
        value={content}
        theme={monacoTheme}
        onChange={(value) => onChange(value ?? '')}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: true },
          fontSize,
          tabSize,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          readOnly,
          cursorStyle: 'line',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          renderLineHighlight: 'line',
          selectOnLineNumbers: true,
          roundedSelection: true,
          padding: { top: 8 },
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
          fontLigatures: true,
        }}
      />
    </div>
  );
}

function RemoteCursor({ name, cursor, color, fontSize }) {
  if (!cursor) return null;

  const lineHeight = fontSize * 1.5;
  const charWidth = fontSize * 0.6;

  return (
    <div
      className="absolute z-20 pointer-events-none"
      style={{
        top: `${(cursor.line - 1) * lineHeight + 8}px`,
        left: `${50 + cursor.col * charWidth}px`,
      }}
    >
      <div
        className="w-0.5 animate-pulse"
        style={{ height: `${lineHeight - 4}px`, backgroundColor: color }}
      />
      <div
        className="text-xs px-1.5 py-0.5 rounded -mt-5 ml-1 text-white whitespace-nowrap shadow-lg"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  );
}
