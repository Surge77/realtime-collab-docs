# Progress Log

Live status of the build. Updated at the end of every phase (and every meaningful sub-step). Newest entries at the top within each phase.

## Status board

| Phase | Title | Status |
|-------|-------|--------|
| 0 | Repo + docs init | ✅ Done |
| 1 | Foundation — CodeMirror editor | ✅ Done |
| 2 | Backend skeleton + hardened auth | ✅ Done |
| 3 | Frontend auth + document list | ✅ Done |
| 4 | Yjs + WebSocket (single user) | ✅ Done |
| 5 | Crash-safe persistence | ✅ Done |
| 6 | Multi-user sync + presence + WS auth | ⬜ Not started |
| 7 | Sharing & permissions | ⬜ Not started |
| 8 | Polish & production readiness | ⬜ Not started |

Legend: ✅ done · 🚧 in progress · ⬜ not started · ⚠️ blocked

---

## Phase 0 — Repo + docs init ✅

- Created `.gitignore`, `LICENSE` (MIT), `README.md`, `CLAUDE.md`.
- Created `docs/ARCHITECTURE.md` (hardened plan), `docs/CONTEXT.md`, `docs/PROGRESS.md`.
- `git init`; public GitHub repo `realtime-collab-docs` created; initial push.

## Phase 1 — Foundation ✅

Goal: a working CodeMirror 6 editor on screen, with Vitest set up and passing render tests.

Done:
- [x] Scaffolded `client/` with Vite + React 18 (manual scaffold, ESM).
- [x] CodeMirror 6 assembled from `@codemirror/{state,view,commands,lang-markdown}` (line numbers, history, markdown, dark theme).
- [x] `EditorCore` renders the editor; dark, readable full-page layout.
- [x] Vitest 4 + Testing Library; **3 passing tests** (renders textbox, seeds initialDoc, mounts `.cm-editor`). TDD: tests written first.
- [x] Production build green (`vite build`).
- [x] Security: cleared vitest critical (→4.1.8) + esbuild moderate (override 0.25.10). One dev-only vite moderate accepted/documented in CONTEXT.md.

Checkpoint: ✅ editor renders, typing works, suite green, build clean.

> Not yet: auth, WebSocket, Yjs, routing, backend.

## Phase 2 — Backend skeleton + hardened auth ✅

Goal: Express API with hardened auth, migrations, and document CRUD — verified against live Neon + Upstash.

Done:
- [x] Server scaffold (ESM): pg pool (TLS for Neon), ioredis client (namespaced `rcd:`), pino logger.
- [x] Connectivity smoke test — Postgres 18.4 + Redis PONG.
- [x] Minimal tracked SQL migration runner; migrations `001_create_users`, `002_create_documents` applied.
- [x] Auth: `@node-rs/argon2` hashing, zod validation (field-level errors), JWT access token, refresh token as **httpOnly+SameSite cookie** with SHA-256 hash stored in Redis. Routes: register/login/refresh/logout/me.
- [x] `authenticate` middleware, consistent `{ error: { code, message } }` handler, Redis-backed `express-rate-limit` on `/api/auth/*`.
- [x] Document CRUD (owner-scoped): list/create/get/patch/delete with 401/403/404 authz.
- [x] `/healthz` checks both stores; graceful SIGTERM shutdown (Yjs flush hook reserved for Phase 5).
- [x] **17 tests passing** (unit: validation + jwt; integration via supertest: auth flows, document CRUD + authz, healthz). 0 npm vulnerabilities.

Checkpoint: ✅ register → login (cookie set) → create/list/rename/delete docs; wrong-user blocked; healthz ok.

> Not yet: Yjs/WebSocket, persistence, presence, sharing.

## Phase 4 — Yjs + WebSocket (single user) ✅

Goal: editor syncs through the server over WebSocket (no persistence yet, auth stubbed).

Done:
- [x] Server: `yjs` + `y-websocket` (`setupWSConnection` via `bin/utils`) + `ws`, attached to the HTTP server on `/yjs/*` upgrade. Origin validation + path check (`isAllowedUpgrade`); in-memory rooms (no persistence).
- [x] Client: `useYjs` hook (Y.Doc + WebsocketProvider, exactly one per mount, full cleanup, `synced` flag for D9). `CollabEditor` binds CodeMirror via `yCollab` (remote cursors come from awareness — no separate CursorLayer). Shared `baseExtensions` extracted (DRY across local + collab editors). EditorPage renders CollabEditor.
- [x] Connection-status indicator (green/amber/red dot).
- [x] **Tests:** server 24 passing incl. **live two-client WS sync** (text propagates between two providers in the same room, 47ms) + upgrade gating; client 15 passing incl. `useYjs` single-provider + destroy-on-unmount. 0 vulnerabilities both packages.

Checkpoint: ✅ two clients in the same room sync live (verified by integration test). Reload loses content (expected — persistence is Phase 5).

> Not yet: persistence, presence/auth on WS, sharing.

## Phase 5 — Crash-safe persistence ✅

Goal: document content survives disconnects and server restarts.

Done:
- [x] Migration `003_document_updates` (binary `yjs_state` BYTEA, one row per doc).
- [x] `persistence.js`: `getDocumentState` / `saveDocumentState` (UPSERT; returns false on FK miss instead of throwing, so ephemeral rooms aren't persisted).
- [x] Integrated via y-websocket `setPersistence` — `bindState` loads DB state before the socket binds (D2) and registers a **debounced (2s)** `ydoc.on('update')` save; `writeState` flushes on last disconnect. No parallel doc Map (D1).
- [x] Graceful shutdown flushes all active rooms **before** closing the pg pool (D8 ordering).
- [x] **Tests:** 28 server tests incl. persistence round-trip + upsert + FK-miss, and a **full WS cycle** (client types → disconnects → fresh client reconnects and loads persisted content, 1.97s). 0 vulnerabilities.

Checkpoint: ✅ content survives reconnect/restart (verified by WS persistence integration test).

> Not yet: presence/auth on WS, sharing.

## Phase 3 — Frontend auth + document list ✅

Goal: working login/register UI, session restore, protected routing, document list.

Done:
- [x] `axios` instance with `withCredentials` + request/response interceptors; refresh-once coordination extracted to testable `handle401`.
- [x] `zustand` auth store (status state-machine: idle/loading/authenticated/unauthenticated); login/register/logout/initialize; access token in memory only.
- [x] Login + Register pages (shared `AuthForm`, field + server error display); Home (doc list, create, delete); EditorPage (loads metadata, 403/404 states, renders local editor — Yjs in Phase 4); NotFound.
- [x] `ProtectedRoute` + routing; `initialize()` restores session from refresh cookie on mount.
- [x] **13 tests passing** (handle401 single/concurrent/failure, store transitions, ProtectedRoute states). Build green.
- [x] Security: cleared axios SSRF (→1.17.0) + react-router highs (→6.30.4). One dev-only vite moderate remains (documented).

Checkpoint: ✅ logic verified by tests + build. Full browser E2E (register→login→list) deferred to Phase 8 Playwright pass.

> Not yet: Yjs/WebSocket, persistence, presence, sharing.

---

## Checkpoint reference (from ARCHITECTURE.md)

| Phase | Manual check before moving on |
|-------|-------------------------------|
| 1 | Editor renders, typing works |
| 2 | Register/login/create-doc via API; cookie set |
| 3 | Login in browser, see document list |
| 4 | Two tabs sync via WS |
| 5 | Content survives server restart + SIGTERM |
| 6 | Two different users see each other's edits + cursors |
| 7 | Non-owner cannot edit without permission |
| 8 | No console errors, no leaks, mobile viewport works |
