# realtime-collab-docs

A Google-Docs-style **real-time collaborative text editor**. Multiple users edit the same document simultaneously, see each other's cursors, and never lose data — even on reconnect or server restart.

> **Status:** 🚧 In active development. Built phase-by-phase. See [`docs/PROGRESS.md`](docs/PROGRESS.md) for the live status.

---

## Why this exists

Real-time collaboration is hard because of **conflict resolution** — two people editing the same line at the same time. This project solves it with a **CRDT** (Conflict-free Replicated Data Type) via [Yjs](https://github.com/yjs/yjs), so merges are automatic and deterministic. No operational-transform server logic to hand-roll.

## Tech stack

| Layer | Choice |
|-------|--------|
| Conflict resolution | **Yjs** (CRDT) |
| Transport | **WebSocket** via `y-websocket` |
| Editor | **CodeMirror 6** + `y-codemirror.next` |
| Frontend | **React 18 + Vite** |
| Backend | **Node.js + Express + ws** |
| Database | **PostgreSQL 16** (metadata + binary Yjs state) |
| Cache / sessions | **Redis** (WS tickets, presence, refresh tokens, rate limiting) |
| Auth | **JWT** (in-memory access token + httpOnly refresh cookie) |
| Password hashing | `@node-rs/argon2` |
| Validation | `zod` |
| Tests | Vitest (client) · node:test + supertest (server) |

## Architecture at a glance

- **Yjs is the only source of truth for document body text.** Postgres stores the *binary* Yjs state (`Y.encodeStateAsUpdate`), never plaintext.
- **Two auth checks, never skipped:** REST (Bearer access token) for metadata + a single-use **WebSocket ticket** (bound to `{userId, documentId}`) for the editing socket. Tokens never travel in a URL.
- **Crash-safe persistence:** state loads before the socket binds, writes debounce on every Yjs update, and a `SIGTERM` handler flushes all rooms before exit.

Full design + the hardened build plan: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## External services / API keys

**MVP needs zero paid API keys.** You only need a Postgres and a Redis instance reachable via connection string. No Docker required for this build:

| Need | Zero-install option | Local option |
|------|---------------------|--------------|
| PostgreSQL 16 | [Neon](https://neon.tech) free tier | Postgres installer |
| Redis | [Upstash](https://upstash.com) free tier | Memurai (Windows-native Redis) |

JWT secrets are generated locally. An email provider (Resend/SendGrid) is only needed **post-MVP** for invite/reset emails.

## Repository layout

```
client/   React + Vite frontend (CodeMirror + Yjs binding)
server/   Express API + y-websocket server + persistence
docs/     ARCHITECTURE.md · PROGRESS.md · CONTEXT.md
```

## Getting started

> Detailed setup arrives with each phase. Quick version:

```bash
# 1. Provision Postgres + Redis (Neon + Upstash, or local), copy connection strings
cp server/.env.example server/.env   # fill in DATABASE_URL, REDIS_URL, JWT secrets
cp client/.env.example client/.env

# 2. Install
cd server && npm install
cd ../client && npm install

# 3. Run (separate terminals)
npm run dev   # in server/  → http://localhost:4000
npm run dev   # in client/  → http://localhost:5173
```

## Roadmap (8 phases)

1. Foundation — CodeMirror editor renders
2. Backend skeleton + hardened auth
3. Frontend auth + document list
4. Yjs + WebSocket (single user)
5. Crash-safe persistence
6. Multi-user sync + presence + WS auth
7. Sharing & permissions
8. Polish & production readiness

Live status in [`docs/PROGRESS.md`](docs/PROGRESS.md).

## License

[MIT](LICENSE)
