import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAccount, Unauthorized } from "@/lib/auth/session";
import { buildPlaybackSequence } from "@/lib/playback/sequence";
import { emit } from "@/lib/telemetry";

/**
 * Build a Life Playback sequence for the authenticated viewer (US-2.3). The
 * sequence is assembled SERVER-SIDE from only the viewer's permitted events
 * (AC-5) — circle filtering is enforced here, never by client-side hiding. A
 * downgrade / roster removal / deletion is reflected because the sequence is
 * re-resolved on every request (AC-9/AC-10). Source media is read-only (G2).
 */
const Query = z.object({ span: z.enum(["year", "decade", "life"]).default("year") });

export async function GET(req: NextRequest) {
  let account;
  try {
    account = await requireAccount();
  } catch (e) {
    if (e instanceof Unauthorized) return NextResponse.json({ ok: false }, { status: 401 });
    throw e;
  }

  const parsed = Query.safeParse({ span: req.nextUrl.searchParams.get("span") ?? "year" });
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  const frames = await buildPlaybackSequence({
    viewerAccountId: account.id,
    span: parsed.data.span,
    endMs: Date.now(),
  });

  emit("playback_started", { mode: parsed.data.span });
  return NextResponse.json({ ok: true, span: parsed.data.span, frameCount: frames.length, frames });
}
