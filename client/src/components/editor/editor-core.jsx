import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { baseExtensions } from './editor-extensions.js';

/**
 * Local (non-collaborative) CodeMirror surface. Used for the standalone editor
 * and as the base in tests. The collaborative editor lives in collab-editor.jsx.
 *
 * @param {{ initialDoc?: string }} props
 */
export function EditorCore({ initialDoc = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const view = new EditorView({
      state: EditorState.create({ doc: initialDoc, extensions: baseExtensions() }),
      parent: containerRef.current,
    });
    return () => view.destroy();
  }, [initialDoc]);

  return <div ref={containerRef} className="editor-surface" />;
}
