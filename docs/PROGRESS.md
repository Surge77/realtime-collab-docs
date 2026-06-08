# Progress Log

Live status of the build. Updated at the end of every phase (and every meaningful sub-step). Newest entries at the top within each phase.

## Status board

| Phase | Title | Status |
|-------|-------|--------|
| 0 | Repo + docs init | ✅ Done |
| 1 | Foundation — CodeMirror editor | 🚧 In progress |
| 2 | Backend skeleton + hardened auth | ⬜ Not started |
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

## Phase 1 — Foundation 🚧

Goal: a working CodeMirror 6 editor on screen, with Vitest set up and one passing render test.

Tasks:
- [ ] Scaffold `client/` with Vite (React).
- [ ] Install CodeMirror 6 packages.
- [ ] `EditorCore` renders a CodeMirror editor; dark, readable layout.
- [ ] Vitest + Testing Library; passing render test.
- [ ] Checkpoint: typing works, suite green, no console errors.

> Not yet: auth, WebSocket, Yjs, routing, backend.

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
