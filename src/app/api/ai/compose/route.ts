import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAccount, Unauthorized } from "@/lib/auth/session";
import { compose, ComposeError } from "@/lib/ai/compose";
import { emit } from "@/lib/telemetry";

const Body = z.object({
  mode: z.enum(["generate", "improve"]),
  text: z.string().min(1).max(4000),
  date: z.string().optional(),
  hasMedia: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  // Auth-gated: composing is a user action; never anonymous (cost + abuse).
  try {
    await requireAccount();
  } catch (e) {
    if (e instanceof Unauthorized) return NextResponse.json({ ok: false }, { status: 401 });
    throw e;
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  try {
    const result = await compose(parsed.data);
    emit("ai_compose", { mode: parsed.data.mode, engine: result.engine });
    return NextResponse.json({ ok: true, text: result.text, engine: result.engine });
  } catch (e) {
    if (e instanceof ComposeError) {
      return NextResponse.json({ ok: false, reason: e.message }, { status: 422 });
    }
    return NextResponse.json({ ok: false, reason: "ai_failed" }, { status: 502 });
  }
}
