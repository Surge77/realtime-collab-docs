# CLAUDE.md — realtime-collab-docs

Project-local instructions for Claude Code. **This file overrides global rules where they conflict.**

## What this project is

A real-time collaborative document editor (Google-Docs-style). CRDT-based conflict resolution via Yjs over WebSocket. See `README.md` for the pitch and `docs/ARCHITECTURE.md` for the full design + hardened build plan.

## Hard constraints (do not violate)

1. **Yjs is the only source of truth for body text.** Store binary Yjs state (`Y.encodeStateAsUpdate`) in Postgres — NEVER plaintext document content.
2. **Tokens never travel in a URL.** WebSocket auth uses a single-use Redis ticket bound to `{userId, documentId}`, not the JWT. Verify + delete on `upgrade`.
3. **Access token in memory only; refresh token in httpOnly+Secure+SameSite cookie.** Never localStorage for the refresh token.
4. **Permission checked twice — never skip the WS check.** REST on metadata + WS on `upgrade` (DB role lookup).
5. **Viewer read-only must be enforced server-side.** Client `EditorState.readOnly` is cosmetic; a viewer can still emit Yjs updates. Drop inbound update messages on viewer sockets, or defer the viewer role.
6. **Own the Y.Doc via y-websocket `setPersistence`** — do NOT keep a parallel `rooms` Map (causes dual doc-instance split). Load state inside `bindState` *before* the socket binds.
7. **No Docker for now** (user decision). Run Postgres + Redis natively or via Neon/Upstash cloud. Docker Compose is deferred to a later milestone.
8. **All API errors return** `{ error: { code, message } }`.

## Conventions

- **Language:** JavaScript (ESM) on both client and server. `"type": "module"`.
- **Files:** kebab-case. Hard size limit **300 lines** — split by responsibility before exceeding.
- **Naming:** camelCase vars/functions, PascalCase components/types, UPPER_SNAKE_CASE constants. Booleans `is`/`has`/`can`/`should`.
- **Imports:** named exports over default. Order: external → internal absolute → relative, blank line between groups.
- **React:** functional components only, hooks prefixed `use`, always return cleanup from effects that subscribe/start timers.
- **No magic numbers** — extract named constants (e.g. `PERSIST_DEBOUNCE_MS`).

## Testing (TDD — enforced)

- **Write the failing test first**, then minimum code to pass.
- Run the type gate after every change: client `tsc --noEmit` (JS checked via jsconfig), server `node --test`.
- **≥80% coverage** on new code. **100%** on auth, permission, and validation logic.
- No real network/DB in unit tests — stub at the boundary or use a transactional test DB. Clean up temp state.
- CRDT merge tests: use two in-memory `Y.Doc`s, apply updates both ways, assert convergence (no network needed).

## Git workflow

- Conventional commits: `feat(scope):`, `fix(scope):`, `test(scope):`, `docs(scope):`, `chore(scope):`.
- Commit per logical change; **push regularly** (after each working sub-step).
- Never commit `.env`, keys, `node_modules`, `dist`, coverage.
- Branch `main` is the working branch for this solo MVP; commits stay green (tests pass before commit).

## Phase discipline

Complete each phase fully (code + tests + manual checkpoint) before starting the next. Current phase + checkpoints tracked in `docs/PROGRESS.md`. Update `PROGRESS.md` at the end of every phase.

## Key files (once scaffolded)

- `server/src/index.js` — entry: Express + HTTP server + WS upgrade routing
- `server/src/services/yjs-server.js` — y-websocket + `setPersistence`
- `server/src/services/persistence.js` — Postgres binary state load/save
- `client/src/hooks/use-yjs.js` — Y.Doc + provider lifecycle
- `client/src/components/editor/editor-core.jsx` — CodeMirror + yCollab binding
