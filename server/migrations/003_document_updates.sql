-- Binary Yjs state, one compacted snapshot per document (single-instance MVP).
-- Y.encodeStateAsUpdate produces a compacted update, so this row does not grow
-- unbounded (see ARCHITECTURE.md D10). document_history is intentionally deferred.
CREATE TABLE IF NOT EXISTS document_updates (
  document_id UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  yjs_state BYTEA,
  updated_at TIMESTAMP DEFAULT NOW()
);
