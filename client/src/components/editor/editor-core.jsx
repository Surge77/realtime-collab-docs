import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';

const editorTheme = EditorView.theme(
  {
    '&': { height: '100%', fontSize: '15px' },
    '.cm-content': {
      fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
      caretColor: '#e2e8f0',
    },
    '.cm-scroller': { lineHeight: '1.7' },
    '&.cm-focused': { outline: 'none' },
  },
  { dark: true },
);

/**
 * Plain-text CodeMirror 6 surface. Phase 1 is local-only; the Yjs binding
 * (yCollab extension + provider) is layered on in Phase 4 without changing
 * this component's shape.
 *
 * @param {{ initialDoc?: string }} props
 */
export function EditorCore({ initialDoc = '' }) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);

  useEffect(() => {
    const view = new EditorView({
      state: EditorState.create({
        doc: initialDoc,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown(),
          editorTheme,
        ],
      }),
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [initialDoc]);

  return <div ref={containerRef} className="editor-surface" />;
}
