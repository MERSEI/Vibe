/**
 * CodeEditor — Monaco Editor + Yjs CRDT via Liveblocks
 *
 * Manual Yjs ↔ Monaco sync (avoids y-monaco dual-instance issue).
 * Falls back gracefully when no Liveblocks room is available.
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
  const cleanupRef = useRef(null);
  const applyingRemote = useRef(false);

  const handleEditorMount = useCallback(async (editor) => {
    editorRef.current = editor;
    editor.getModel()?.updateOptions({ tabSize });

    if (!room) return; // no Liveblocks key — plain Monaco

    const [{ default: LiveblocksProvider }, Y] = await Promise.all([
      import('@liveblocks/yjs'),
      import('yjs'),
    ]);

    const ydoc = new Y.Doc();
    const provider = new LiveblocksProvider(room, ydoc);
    const yText = ydoc.getText('monaco');

    // Seed document once initial sync completes
    const seed = () => {
      if (yText.toString() === '') {
        ydoc.transact(() => yText.insert(0, content));
      }
    };
    if (provider.synced) {
      seed();
    } else {
      provider.once('sync', seed);
    }

    // Monaco → Yjs: apply local edits to shared doc
    const disposable = editor.onDidChangeModelContent((event) => {
      if (applyingRemote.current) return;
      ydoc.transact(() => {
        for (const change of [...event.changes].reverse()) {
          if (change.rangeLength > 0) yText.delete(change.rangeOffset, change.rangeLength);
          if (change.text)            yText.insert(change.rangeOffset, change.text);
        }
      });
      onChange?.(editor.getValue());
    });

    // Yjs → Monaco: apply remote edits to editor
    const yObserver = (yEvent) => {
      if (yEvent.transaction.local) return;
      applyingRemote.current = true;
      const model = editor.getModel();
      if (!model) return;
      const edits = [];
      let offset = 0;
      for (const [type, len, content] of yEvent.changes.delta) {
        if (type === 'retain') {
          offset += len;
        } else if (type === 'delete') {
          const start = model.getPositionAt(offset);
          const end   = model.getPositionAt(offset + len);
          edits.push({ range: { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column }, text: '' });
          // don't advance offset — deleted chars are gone
        } else if (type === 'insert') {
          const pos = model.getPositionAt(offset);
          edits.push({ range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column }, text: content });
          offset += content.length;
        }
      }
      if (edits.length > 0) editor.executeEdits('yjs-remote', edits);
      applyingRemote.current = false;
    };
    yText.observe(yObserver);

    cleanupRef.current = () => {
      disposable.dispose();
      yText.unobserve(yObserver);
      provider.destroy();
      ydoc.destroy();
    };
  }, [room, content, tabSize, onChange]);

  useEffect(() => () => cleanupRef.current?.(), []);

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
