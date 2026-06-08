# Context & Decisions

Durable context for anyone (human or AI) picking up this project. Captures *why* things are the way they are — decisions, constraints, and rejected alternatives. Not derivable from the code.

## Project goal

Ship a data-safe, secure, testable MVP of a real-time collaborative editor. Correctness and not-losing-user-data rank above features.

## Locked decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Scale target | **Single-instance MVP** | Simplicity. In-memory room state + single-row binary snapshot per doc is fine for one server. Documented ceiling below. |
| Stack flexibility | **Open to libs that fix root causes** | Added zod, `@node-rs/argon2`, node-pg-migrate, pino vs hand-rolling. |
| Testing | **TDD per phase, 80% gate (100% on auth/perm/validation)** | Original plan had zero tests. |
| Docker | **Deferred** | User decision. Run Postgres/Redis natively or via Neon/Upstash. Compose comes later. |
| Password hashing | **`@node-rs/argon2`** | Native `argon2`/`bcrypt` fail node-gyp builds on the Windows 11 dev box; this ships prebuilt binaries. |
| Persistence | **Postgres binary snapshot via y-websocket `setPersistence`** | One datastore for durable data; avoids dual doc-instance bug. Redis is non-durable only. |
| Version history | **Deferred (post-MVP)** | Incompatible with Yjs `gc: true`. Would need `gc: false` + append-only log. |

## External services / API keys

- **MVP: zero paid API keys.** Need only a Postgres connection string and a Redis connection string.
  - Postgres: Neon free tier (recommended, no install) or local Postgres 16.
  - Redis: Upstash free tier (recommended, no install) or Memurai (Windows-native).
- JWT secrets: generated locally (`openssl rand -hex 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
- **Post-MVP optional:** email provider (Resend/SendGrid) for invite/reset emails — would require an API key.

## Hardening notes (bugs we are explicitly avoiding)

Tracked in detail in `ARCHITECTURE.md` as D1–D10. Highlights:
- **D1** dual doc-instance split → use `setPersistence`, not a parallel Map.
- **D2** empty-doc load race → `await` DB load inside `bindState` before socket binds.
- **D3** WS ticket replay → bind ticket to `{userId, documentId}`.
- **D4** client-only read-only = privilege escalation → enforce viewer read-only server-side.
- **D5** cross-origin cookie → CORS `credentials:true` + axios `withCredentials`; prod cross-domain needs `SameSite=None`+CSRF.
- **D6** native module build fail on Windows → `@node-rs/argon2`.
- **D7** Redis is a hard dep from Phase 6; `/healthz` checks both stores, fail fast at startup.
- **D8** graceful-shutdown ordering: flush rooms *before* closing pg pool.

## Scaling ceiling (known MVP limitation)

Single server only. In-memory room state and a single-row `document_updates` snapshot mean a second instance would not share Y.Docs and would clobber snapshots. To scale: y-redis for cross-instance fan-out + Redis awareness, append-only update log, LB with sticky sessions / shared pub/sub. Out of scope.

## Accepted limitations (MVP)

- Logout does not instantly revoke the access token (stateless JWT valid up to its 15m TTL). Acceptable with short TTL.
- A mid-session permission revoke does not kick an already-connected socket.

## Accepted dependency-audit findings

- **vite ≤6.4.1 — path traversal in optimized-deps `.map` handling (moderate, GHSA-4w7w-66w2-5vf9).** Dev-server only; not present in the production build or exposed to end users. Fix requires a vite 8 major bump (cascades to `@vitejs/plugin-react` v5 + config). Deferred to Phase 8 hardening. Mitigated meanwhile by not running `vite dev` while browsing untrusted sites.
- Cleared in Phase 1: vitest RCE (critical) → vitest 4.1.8; esbuild dev-server request leak (moderate) → `overrides.esbuild` 0.25.10.

## Environments

- Dev: client `http://localhost:5173`, server `http://localhost:4000`. Same-site (both `localhost`) so `SameSite=Strict` refresh cookie works across ports.
- OS: Windows 11. Use PowerShell-compatible commands; prefer cross-platform npm scripts.
