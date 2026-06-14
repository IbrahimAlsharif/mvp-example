# AI Compose (events/new)

Lets a user turn an idea (a short prompt) into a written memory, or polish a
rough draft, before saving an event. The user always edits the result — the AI
proposes, the user disposes. Part of the `/events/new` 2030 redesign (FEAT-JXQ).

## Flow

1. **Generate** — user types a prompt → `runAi("generate")` → suggestion card.
2. **Improve** — user has a draft in the note → `runAi("improve")` → suggestion.
3. The suggestion appears in a card with **Use this** / **Discard**. *Use this*
   copies the text into the editable note `<textarea>`; the user can then edit
   freely before saving.

The note field is the single source of truth that gets saved via the unchanged
`POST /api/events` contract — AI compose only ever writes into that field.

## Endpoint — `POST /api/ai/compose`

`src/app/api/ai/compose/route.ts`. Auth-gated (`requireAccount` → 401 if not
signed in; composing costs money and must not be anonymous).

Request: `{ mode: "generate" | "improve", text: string, date?, hasMedia? }`
Response: `{ ok: true, text, engine: "claude" | "stub" }` or `{ ok: false, reason }`.

Validation (zod): `text` 1–4000 chars. Errors map to 400 (bad request), 422
(`ComposeError`: empty/too long/sdk missing), 502 (unexpected).

## Swappable engine — `src/lib/ai/compose.ts`

One contract, two engines, chosen by whether `ANTHROPIC_API_KEY` is set:

- **stub** (default, no key): a deterministic local heuristic that wraps the
  prompt/draft into a first-person Arabic memory. Fully usable in dev and CI
  with no network and no key. The UI shows a "تجريبي / experimental" badge when
  `engine === "stub"` so the user knows it isn't real AI yet.
- **claude** (key set): calls the Anthropic Messages API (`env.AI_MODEL`,
  default `claude-haiku-4-5`) with an Arabic system prompt that produces a short,
  warm, first-person paragraph and **invents no facts**. The SDK
  (`@anthropic-ai/sdk`) is imported dynamically so it's optional until a key
  exists; if the key is set but the package is missing, the route returns
  `ComposeError("sdk_missing")`.

> Note: the coding agent cannot *be* the runtime backend. Real AI requires this
> server route calling a provider — `compose.ts` is that caller.

## Enabling real Claude

1. `npm install @anthropic-ai/sdk`
2. Set `ANTHROPIC_API_KEY` (and optionally `AI_MODEL`) in `.env`.
3. Restart. `isAiLive` flips to `true`; the endpoint returns `engine: "claude"`
   and the experimental badge disappears. No UI or contract change.

## Telemetry

`emit("ai_compose", { mode, engine })`. `mode` and `engine` are bounded enum
tokens added to `ENUM_FIELDS` in `src/lib/telemetry.ts`, so they pass the G4
content-blind guard. No prompt or generated text is ever emitted.
