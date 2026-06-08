import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';

export const editorTheme = EditorView.theme(
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

/** Extensions shared by the local editor and the collaborative editor. */
export function baseExtensions() {
  return [
    lineNumbers(),
    highlightActiveLine(),
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    markdown(),
    editorTheme,
  ];
}
