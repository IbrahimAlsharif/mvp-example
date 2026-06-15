# Media-URL Security (US-3.3)

Privacy Circles (US-3.1) decide *who is allowed*; this layer enforces that
decision *on the bytes*. The named risk: "guessable/leaky media URLs bypass
circle controls entirely." So the media layer is a second, independent line of
enforcement under every circle and every unlisted link.

## How bytes are served

1. The S3/MinIO bucket is **private** — no anonymous policy, no CDN in front of
   it. There is no public path to any object.
2. Clients reference media only by the **non-guessable `Media.publicId`** (≥128
   bits). The internal content-addressed `storageKey` is **never** returned in any
   response body and never disclosed to an unauthorized party. (It does appear,
   by design, inside the authorized owner's own short-lived signed Location URL —
   every S3 presigned URL contains its object key; that URL requires a valid
   signature and expires in ≤10 min, so it is not a durable or guessable handle.)
3. `GET /api/media/<publicId>[?share=<token>]` → `resolveMediaAccess()`:
   - **owner / Family member** → via `canViewEvent()` (US-3.1), re-checked against
     the event's **current** circle on every request (AC-3), so a US-3.2
     downgrade is honored immediately;
   - **valid unlisted share token** whose event is still `PUBLIC_UNLISTED` (AC-2/5/6/7).
   - Media must be `PERSISTED` and not soft-deleted.
4. On **allow** → 302 redirect to a freshly minted **presigned GET that expires
   ≤ 10 min** (`MEDIA_GET_TTL_SECONDS`, capped in `env.ts`). On every non-allow
   outcome (missing, not-persisted, denied, expired, revoked) → a **uniform 404**,
   so a prober cannot distinguish "exists but you can't see it" from "doesn't
   exist" (no existence oracle, consistent with `getViewableEvent`). The precise
   reason is recorded in content-blind telemetry only. The bytes never leave the
   server on a denial; the storageKey never leaves on either path.

## Why this satisfies the ACs
- **AC-1 non-guessable**: publicId + share token are `randomBytes(16)` base64url (128 bits); no sequential ids or predictable paths; storageKey never exposed.
- **AC-2/AC-8 auth**: URL possession alone never authorizes — a non-member with a Me-Only/Family media URL is denied server-side.
- **AC-3 re-authorization**: every request re-reads `event.circle`; a downgrade revokes link/media access live.
- **AC-4 no CDN leakage**: private bucket, no CDN, per-request short-lived presign → no shared/cross-user cache; no object outlives its grant.
- **AC-5/AC-7 links**: unlisted tokens are non-guessable, non-discoverable, and carry a bounded expiry (owner-set or `SHARE_LINK_DEFAULT_TTL_HOURS` default) — no permanent bearer credential.
- **AC-6 revocable**: `revokeShareLink` + downgrade both stop access within one presign TTL (each GET re-validates).
- **AC-11 honest copy**: the Arabic revoke copy (`messages/ar.json` → `share.revokeHonestCopy`) states revocation stops future access but cannot recall already-downloaded copies.

## Shared-location precision & EXIF stripping (US-2.2 AC-6)

A coarsened *displayed* location is not enough if the downloadable file still
carries exact GPS EXIF. Two coordinated controls protect shared (`PUBLIC_UNLISTED`)
exposure, with the safe state as the **default** (never opt-in):

1. **Displayed location coarsening.** `locationForViewer()`
   (`src/lib/events/location.ts`) returns *exact* coordinates only to the owner
   and authenticated Family members (AC-7). Any anonymous viewer reaching the
   event via a share link gets the location coarsened to a 0.1° (~11 km,
   city/region) grid, or omitted. `GET /api/share/<token>` returns only this
   coarsened/omitted value — exact coordinates never leave the server on the
   shared path.
2. **Served-file EXIF stripping.** On the `share_link` byte path, `/api/media`
   does **not** 302-redirect to the original object (which carries EXIF). It
   fetches the bytes server-side, runs `stripJpegMetadata()`
   (`src/lib/media/exif-strip.ts`) to drop APP1 (EXIF/XMP) + APPn + COM segments
   from JPEGs, and streams the result with `Cache-Control: private, no-store` so
   no edge caches a copy (AC-11). Owner/Family keep the fast 302-to-original
   path. JPEG is the only allowlisted format carrying camera GPS EXIF; others
   pass through unchanged.

Telemetry: `shared_location_precision_applied` (reason enum reduced/omitted) and
`media_exif_stripped` — structural only, **never** a coordinate (G4 + child-data
minimization).

## Key files
- `src/lib/events/location.ts` — `coarsenCoordinate()` / `locationForViewer()` shared-location precision.
- `src/lib/media/exif-strip.ts` — dependency-free JPEG metadata stripper for the share-link path.
- `src/lib/media/access.ts` — `resolveMediaAccess()` byte-authz decision (now also yields `mimeType`).
- `src/lib/media/share.ts` — create/revoke/resolve share links with bounded expiry.
- `src/app/api/media/[publicId]/route.ts` — the only path to bytes (authz → 302 presign / 403).
- `src/app/api/share/[token]/route.ts` — unlisted-link resolution (downgrade/expiry/revoke honored).
- `src/lib/storage/presign.ts` — `presignGet` (≤600s, signed).
