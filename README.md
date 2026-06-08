# realtime-collab-docs

A real-time collaborative text editor. Multiple users edit the same document simultaneously with automatic conflict resolution, live cursors and presence, and durable persistence across reconnects and restarts.

## Features

- **Real-time collaboration** — concurrent editing with conflict-free merges (CRDT).
- **Live presence** — see who else is in a document and where their cursor is.
- **Authentication** — email/password with short-lived access tokens and rotating refresh tokens.
- **Sharing & permissions** — invite collaborators by email as **editor** or **viewer**; viewer access is read-only and enforced on the server.
- **Durable documents** — content is persisted continuously and survives reconnects and server restarts.
- **Document management** — create, rename (auto-saved), list, and delete documents.

## Tech stack

| Layer | Technology |
|-------|------------|
| Conflict resolution | Yjs (CRDT) |
| Realtime transport | WebSocket (`y-websocket`) |
| Editor | CodeMirror 6 (`y-codemirror.next`) |
| Frontend | React 18 + Vite |
| Backend | Node.js + Express + `ws` |
| Database | PostgreSQL |
| Cache / sessions | Redis |
| Auth | JWT (access) + httpOnly refresh cookie |

## Architecture

Document text is stored and merged as a Yjs CRDT; the server persists the binary
document state in PostgreSQL and never stores plaintext content. Editing happens
over an authenticated WebSocket connection, while document metadata and auth use
a REST API. Redis backs sessions, presence tickets, and rate limiting.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for details.

```
client/   React + Vite frontend (CodeMirror editor + Yjs binding)
server/   Express API + WebSocket server + persistence
docs/     Architecture documentation
```

## Prerequisites

- Node.js 20+
- A PostgreSQL database and a Redis instance (connection strings)

## Setup

```bash
# 1. Configure environment
cp server/.env.example server/.env.local      # set DATABASE_URL, REDIS_URL, JWT secrets
cp client/.env.example client/.env.local

# Generate the JWT / WebSocket-ticket secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Apply database migrations (from server/)
npm run migrate
```

## Running

```bash
# Backend (server/) → http://localhost:4000
npm run dev

# Frontend (client/) → http://localhost:5173
npm run dev
```

### Production (single server)

```bash
cd client && npm run build                       # outputs client/dist
cd ../server && NODE_ENV=production npm start     # serves the API and the built client on :4000
```

## Testing

```bash
cd server && npm test     # API + WebSocket integration tests
cd client && npm test     # component and hook tests
```

## License

[MIT](LICENSE)
