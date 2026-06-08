# Architecture

## Overview

```
┌─────────────┐   REST (Bearer access token)    ┌──────────────────┐
│   Browser   │ ──────────────────────────────► │  Express API     │
│  React/Vite │ ◄────────────────────────────── │  /api/auth       │
│  CodeMirror │   httpOnly refresh cookie        │  /api/documents  │
│   + Yjs     │                                  ├──────────────────┤
│             │   WebSocket (single-use ticket)  │  WebSocket server│
│             │ ◄──────────────────────────────► │  (Yjs sync)      │
└─────────────┘   Yjs sync + awareness           └────────┬─────────┘
                                                           │
                                       ┌───────────────────┴────────────┐
                                       │                                │
                                ┌──────▼──────┐                  ┌──────▼──────┐
                                │ PostgreSQL  │                  │   Redis     │
                                │ users,      │                  │ ws tickets, │
                                │ documents,  │                  │ refresh     │
                                │ permissions,│                  │ tokens,     │
                                │ doc state   │                  │ rate limits │
                                └─────────────┘                  └─────────────┘
```

## Principles

- **Yjs is the source of truth for document text.** PostgreSQL stores the binary
  Yjs state (`Y.encodeStateAsUpdate`) only — never plaintext. Titles and metadata
  are ordinary relational columns.
- **Two independent authorization checks.** REST endpoints verify a Bearer access
  token; the WebSocket connection verifies a short-lived ticket on upgrade. Neither
  is skipped.
- **The access token never travels in a URL.** The WebSocket handshake uses an
  opaque, short-lived ticket bound to a specific user and document.

## Data model

```sql
users(id, email, username, password_hash, avatar_color, created_at, updated_at)

documents(id, title, owner_id → users, is_public, created_at, updated_at)

document_permissions(id, document_id → documents, user_id → users,
                     role ∈ {viewer, editor, owner}, unique(document_id, user_id))

document_updates(document_id → documents PK, yjs_state BYTEA, updated_at)
```

`document_updates` holds one compacted binary snapshot per document.

## Authentication

- **Access token** — short-lived JWT, held in memory on the client and sent as a
  `Bearer` header.
- **Refresh token** — stored in an httpOnly, `SameSite` cookie; its hash is kept in
  Redis. Refreshing rotates the token (the previous one is invalidated), and reuse
  of a rotated token revokes the session.
- **Password hashing** — Argon2id.
- **Rate limiting** — applied to authentication routes, backed by Redis.

## Real-time editing

1. The client requests a WebSocket ticket for a document via an authenticated REST
   call. The server confirms the user's access and returns a short-lived ticket
   bound to `{ userId, documentId }`.
2. The client opens a WebSocket using the ticket. On upgrade the server validates
   the ticket, checks the document binding and origin, and attaches the user's role.
3. Editing uses the Yjs sync protocol over the socket. Presence (cursors, names) is
   carried via Yjs awareness.

**Viewer enforcement.** A viewer connection is wrapped so inbound document-mutating
messages are dropped at the server; viewers receive updates but cannot write.
Read-only state in the editor UI is presentation only — authority is server-side.

## Persistence

Document state is integrated through the WebSocket server's persistence hooks:

- On the first connection to a document, the persisted state is loaded from
  PostgreSQL and applied **before** the socket is bound, so a client can never sync
  against an empty document and then have stored content merged on top.
- Document updates are written back on a short debounce, coalescing bursts of edits.
- The latest state is flushed when the last client disconnects and during graceful
  shutdown (before connection pools are closed).

## Operational notes

- `GET /healthz` reports PostgreSQL and Redis connectivity.
- The server shuts down gracefully on `SIGTERM`/`SIGINT`, flushing active documents
  before exit.
- In production the Express server also serves the built client and applies a
  Content Security Policy.

## Scaling

The current design targets a single application instance: active documents are held
in memory and persisted as one snapshot per document. Horizontal scaling would
introduce a shared Yjs backend (e.g. a Redis-backed provider) for cross-instance
fan-out and an append-only update log.
