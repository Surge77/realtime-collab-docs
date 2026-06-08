# Progress Log

Live status of the build. Updated at the end of every phase (and every meaningful sub-step). Newest entries at the top within each phase.

## Status board

| Phase | Title | Status |
|-------|-------|--------|
| 0 | Repo + docs init | ✅ Done |
| 1 | Foundation — CodeMirror editor | ✅ Done |
| 2 | Backend skeleton + hardened auth | ✅ Done |
| 3 | Frontend auth + document list | ⬜ Not started |
| 4 | Yjs + WebSocket (single user) | ⬜ Not started |
| 5 | Crash-safe persistence | ⬜ Not started |
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
