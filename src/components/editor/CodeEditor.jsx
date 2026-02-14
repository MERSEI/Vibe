/**
 * CodeEditor — Monaco Editor + Yjs CRDT via Liveblocks
 *
 * Real-time collaborative editing:
 * - Monaco Editor for the editing experience
 * - Yjs document synced via @liveblocks/yjs (LiveblocksProvider)
 * - MonacoBinding connects Yjs text to Monaco model
 * - Falls back gracefully when Liveblocks key is not set
 */

import React, { useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useRoom } from '../../api/liveblocks/config';

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
  const room = useRoom();
  const editorRef = useRef(null);
  const bindingRef = useRef(null);
  const providerRef = useRef(null);
  const ydocRef = useRef(null);

  const handleEditorMount = useCallback(async (editor) => {
    editorRef.current = editor;
    editor.getModel()?.updateOptions({ tabSize });

    // Only set up CRDT if we have a real Liveblocks room
    if (!room) return;

    const [{ default: LiveblocksProvider }, { MonacoBinding }, Y] = await Promise.all([
      import('@liveblocks/yjs'),
      import('y-monaco'),
      import('yjs'),
    ]);

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new LiveblocksProvider(room, ydoc);
    providerRef.current = provider;

    const yText = ydoc.getText('monaco');

    const onSync = () => {
      if (yText.toString() === '') {
        yText.insert(0, content);
      }
      provider.off('sync', onSync);
    };
    provider.on('sync', onSync);

    const binding = new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      provider.awareness,
    );
    bindingRef.current = binding;
  }, [room, content, tabSize]);

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, []);

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <div className="relative h-full">
      <Editor
        height="100%"
        language={language}
        defaultValue={content}
        theme={monacoTheme}
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
          padding: { top: 8 },
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
          fontLigatures: true,
        }}
      />
    </div>
  );
}
