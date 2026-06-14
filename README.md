# Human Timeline Network (MVP)

Web-only, invite-only, Arabic-first family life-timeline app. Next.js 15 (App
Router, TS) + PostgreSQL/Prisma + S3-compatible object storage (MinIO) + Vitest/Playwright.

Build specs live in [`user-stories/`](user-stories/) — read
[`user-stories/CONVENTIONS.md`](user-stories/CONVENTIONS.md) first (global
guardrails G1–G9). Work is tracked via Orchestra MCP.

## Local development

### Option A — Docker (recommended)

```bash
npm install
docker compose up -d          # postgres:16 + private MinIO bucket htn-media
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev                   # http://localhost:3000
```

### Option B — no Docker (local Postgres)

If Docker isn't available, use a local Postgres and (for media stories) a local
MinIO/S3:

```bash
# Postgres (Homebrew):
brew services start postgresql@14
createuser htn --createdb --pwprompt        # password: htn
createdb htn -O htn
# .env DATABASE_URL already points at postgresql://htn:htn@localhost:5432/htn

npm install
npm run db:migrate && npm run db:seed
npm run dev
```

Media upload/serving (US-1.2 / US-3.3) needs an S3-compatible endpoint at
`S3_ENDPOINT`. With Docker that's the MinIO service; without it, run a standalone
`minio server` and point `S3_*` env vars at it.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:migrate` / `db:seed` / `db:reset` | Prisma |
| `npm test` / `test:e2e` | Vitest unit / Playwright e2e |
| `npm run reap` | Abandoned-upload reaper (US-1.2) |
| `npm run typecheck` | `tsc --noEmit` |

### Troubleshooting

- **Pages render with no styling (raw inputs, no Tailwind).** The `next dev`
  cache (`.next/`) can go stale if files are added/moved while the dev server is
  running — the CSS bundle then 404s back to the HTML shell. Fix: stop the dev
  server, `rm -rf .next`, then `npm run dev` again.

## Feature docs

- [Design System](docs/design-system.md) — blue/orange identity, gradients, motion, and the shared UI primitives.
- [Architecture Overview](docs/architecture.md) — how the whole slice fits together end to end.
- [Authentication & Sessions (US-0.1)](docs/auth.md) — invite gating, confirmation, social, reset, session model.
- [Privacy Circles & Enforcement (US-3.1)](docs/privacy-circles.md) — the three circles, the canViewEvent chokepoint, the Public child-media warning.
- [Media-URL Security (US-3.3)](docs/media-security.md) — private bucket, authz-gated ≤10-min presigned GETs, non-guessable IDs, revocable unlisted links.
- [Media Capture & Upload (US-1.2)](docs/upload.md) — resumable multipart, server-side checksum verification, IndexedDB buffering, the reaper.
- [Timeline Event Creation (US-1.1)](docs/event-create.md) — the atomic event+media+circle+consent write, idempotent submit, soft-delete.

## Architecture invariants (don't break these)

- **Me-Only default everywhere** (G1) — `Account.defaultCircle` + `Event.circle` default `ME_ONLY`.
- **`canViewEvent()` is the only read-authz gate** ([`src/lib/authz/circle.ts`](src/lib/authz/circle.ts)) — UI hiding never substitutes for it.
- **Media served only via authz-gated, ≤10-min presigned URLs** over a private bucket; clients see only the non-guessable `Media.publicId`, never the `storageKey`.
- **Upload confirms only after server-side checksum match** (US-1.2) — never optimistic.
- **Soft-delete only** (G2) — nothing is hard-deleted by a system event.
- **Content-blind telemetry** (G4) — emit through [`src/lib/telemetry.ts`](src/lib/telemetry.ts), which rejects content-bearing payloads.
