import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signInWithEmail } from "@/lib/auth/accounts";
import { createSession } from "@/lib/auth/session";
import { emit } from "@/lib/telemetry";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const result = await signInWithEmail(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 401 });
  }

  await createSession(result.account.id);
  emit("signin_completed", { method: "email" });
  return NextResponse.json({ ok: true });
}
