# Architecture & Build Plan

The hardened design for realtime-collab-docs. This is the source of truth for *how* the system is built. Decisions and rationale live in `CONTEXT.md`; live status in `PROGRESS.md`.

## System overview

```
┌─────────────┐     REST (Bearer access token)      ┌──────────────────┐
│   Browser   │ ──────────────────────────────────► │  Express API     │
│  React/Vite │ ◄────────────────────────────────── │  /api/auth       │
│  CodeMirror │     httpOnly refresh cookie          │  /api/documents  │
│   + Yjs     │                                      │  /api/users      │
│             │     WebSocket (single-use ticket)    ├──────────────────┤
│             │ ──────────────────────────────────► │  y-websocket     │
│             │ ◄────────────────────────────────── │  + setPersistence│
└─────────────┘     Yjs sync + awareness            └────────┬─────────┘
                                                              │
                                          ┌───────────────────┴────────────┐
                                          │                                │
                                   ┌──────▼──────┐                  ┌──────▼──────┐
                                   │ PostgreSQL  │                  │   Redis     │
                                   │ users, docs,│                  │ ws-tickets, │
                                   │ permissions,│                  │ presence,   │
                                   │ yjs_state   │                  │ refresh,    │
                                   │ (BYTEA)     │                  │ rate-limit  │
                                   └─────────────┘                  └─────────────┘
```

## Core architecture rules

- **Yjs is the only source of truth for body text.** Postgres stores binary state (`Y.encodeStateAsUpdate`) only; never plaintext. Title is plain metadata.
- **Two auth checks, never skip the WS one.** REST Bearer check for metadata + WS ticket check on `upgrade` (DB role lookup for `documentId`).
- **Y.Doc lifecycle owned by y-websocket**, integrated via `setPersistence({ bindState, writeState })`. No parallel rooms Map.
- **Cleanup is mandatory** — every `useYjs`/`EditorView`/awareness listener destroys itself in its `useEffect` cleanup.
- **All API errors:** `{ error: { code, message } }`.

## Database schema

```sql
-- 001_users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_color VARCHAR(7) DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 002_documents (+ permissions)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL DEFAULT 'Untitled Document',
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) CHECK (role IN ('viewer','editor','owner')),
  UNIQUE(document_id, user_id)
);

-- 003_document_updates (binary Yjs state; single row per doc — MVP)
CREATE TABLE document_updates (
  document_id UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  yjs_state BYTEA,
  updated_at TIMESTAMP DEFAULT NOW()
);
-- document_history table DEFERRED (incompatible with gc:true).
```

## Second-Pass Hardening (D1–D10)

Non-obvious defects this design explicitly avoids:

- **D1 — Dual doc-instance split.** A custom rooms Map + `setupWSConnection`'s own `getYDoc` map = two `Y.Doc`s per room; edits silently vanish. Own the doc through `setPersistence`/`getYDoc`.
- **D2 — Empty-doc load race.** `await` the DB load inside `bindState` before the socket binds, else a client syncs an empty doc and persisted state merges on top (duplicated content).
- **D3 — Ticket not bound to document.** Bind ticket → `{userId, documentId}`; assert URL `documentId` matches on `upgrade`.
- **D4 — Client-only read-only = privilege escalation.** Viewers can emit Yjs updates regardless of `EditorState.readOnly`. Enforce server-side (drop inbound update messages on viewer sockets) or defer the viewer role.
- **D5 — Cross-origin cookie + CORS credentials.** Needs `cors({ origin: CLIENT_ORIGIN, credentials: true })` + axios `withCredentials: true`. Dev is same-site. Prod cross-domain needs `SameSite=None; Secure` + CSRF token.
- **D6 — Native-module build failure on Windows.** Use `@node-rs/argon2` (prebuilt), not native `argon2`/`bcrypt`.
- **D7 — Redis hard dep from Phase 6.** `/healthz` checks Postgres + Redis; fail fast at startup if either is down.
- **D8 — Graceful-shutdown ordering.** SIGTERM: (1) stop accepting connections, (2) flush every room via `writeState`, (3) close WS, (4) drain HTTP, (5) close pg pool + Redis. Flush before closing the pool.
- **D9 — First-sync UX flash.** Gate a loading state on the provider's `synced` event so users don't type into a momentarily-blank doc.
- **D10 — Snapshot, not append log.** `Y.encodeStateAsUpdate` is already compacted, so the single-row snapshot does not grow unbounded. Never switch to append semantics without compaction.

## Phase plan (TDD baked in)

Each phase ends with: type gate green, tests written **before** implementation, ≥80% coverage on new logic (100% on auth/permission/validation), and the manual checkpoint.

### Phase 1 — Foundation
Vite + React; `EditorCore` renders CodeMirror 6; dark layout; Vitest + one render test. *Not yet:* auth, WS, Yjs, routing, backend.

### Phase 2 — Backend skeleton + hardened auth
Express + helmet + cors(locked, credentials) + morgan + `express-rate-limit` on `/api/auth/*`. `node-pg-migrate` runner; migrations 001+002. `@node-rs/argon2` hashing. `zod` schemas. Refresh token in httpOnly Secure SameSite cookie + Redis hash; access token in JSON body. `authenticate` middleware; consistent error handler. Document CRUD (no sharing). **Tests first**, 100% on auth.

### Phase 3 — Frontend auth + document list
zustand store; axios instance with refresh-on-401 interceptor (`isRefreshing` flag). Login/Register pages w/ field-level validation; ProtectedRoute; routing. **Tests first** on store/interceptor/route.

### Phase 4 — Yjs + WebSocket (single user, no persistence)
Server `yjs`/`y-websocket`/`ws`; `upgrade` routes `/yjs/*`, validates Origin (auth stubbed). Client `useYjs` (Y.Doc in ref, provider, `yText`, status, `synced` for D9, full cleanup). `EditorCore` uses `yCollab`. **Tests first:** provider created/destroyed once; upgrade rejects bad Origin.

### Phase 5 — Crash-safe persistence
Migration 003. `persistence.js` get/save. Integrate via `setPersistence` (D1); `bindState` awaits DB load (D2), registers debounced (~2s) update→save; `writeState` final flush. SIGTERM flush (D8). `/healthz` checks both stores (D7). **Tests first:** round-trip, debounce coalesce, shutdown flush.

### Phase 6 — Multi-user sync + presence + WS auth
WS ticket endpoint (single-use Redis, TTL ~30s, bound to {userId,documentId} — D3). `usePresence` (awareness, dedup by userId). `CollaboratorList` avatars. **No CursorLayer** (yCollab draws cursors). **Tests first:** ticket issue/verify/single-use/expiry; presence dedup.

### Phase 7 — Sharing & permissions
`POST /:id/share` (email+role, 404 if absent, block self-share, role enum). Collaborator list/remove routes. Permission middleware canView/canEdit/isOwner. WS `upgrade` role enforcement (4003 no access); viewer read-only enforced server-side (D4). Share modal. **Tests first, 100% on permission logic.**

### Phase 8 — Polish & production readiness
Refresh-token rotation + reuse detection. Title auto-save (1s debounce). Connection status indicator; toasts; skeletons; 403/404 pages; error boundaries. `docker-compose.yml` (deferred — added here, not used during build). Prod: serve client build from Express, `wss://`, helmet CSP. **Tests first** on rotation/debounce/error-boundary.

## Dependency additions vs naive plan

`zod` (validation) · `@node-rs/argon2` (hashing, prebuilt) · `pino` (logging) · `node-pg-migrate` (migrations) · `express-rate-limit`+`rate-limit-redis` · `cookie-parser` · Vitest + Testing Library (client) · node:test + supertest (server).

## End-to-end verification

1. Provision Postgres + Redis (Neon + Upstash or local); run `node-pg-migrate up`.
2. Start server + client; `GET /healthz` ok.
3. Full test suite both packages; ≥80% overall, 100% auth/permission/validation.
4. Two users → owner shares editor role by email → both edit in separate browsers → cursors + avatars sync.
5. Crash-safety: type → SIGTERM → restart → last edits present.
6. Security: refresh token only in httpOnly cookie; no token/ticket in any logged URL; WS rejects bad Origin + invalid ticket (4001); viewer cannot mutate via WS.
7. Permission negative: non-collaborator → 403 REST + 4003 WS.
