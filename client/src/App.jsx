import { EditorCore } from './components/editor/editor-core.jsx';

const PLACEHOLDER_DOC = `# Welcome to CollabDocs

Start typing. In later phases this document syncs in real time across users.
`;

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-logo">CollabDocs</span>
        <span className="app-tag">Phase 1 · local editor</span>
      </header>
      <main className="app-main">
        <EditorCore initialDoc={PLACEHOLDER_DOC} />
      </main>
    </div>
  );
}
