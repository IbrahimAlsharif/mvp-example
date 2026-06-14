import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { signupWithEmail } from "@/lib/auth/accounts";
import { sendEmail, confirmEmailBody } from "@/lib/auth/email";
import { emit } from "@/lib/telemetry";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  invite: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const { email, password, invite } = parsed.data;

  emit("signup_started", { method: "email", invite_present: Boolean(invite) });

  const result = await signupWithEmail({ inviteToken: invite, email, password });
  if (!result.ok) {
    emit("signup_failed", { method: "email", failure_reason: enumReason(result.reason) });
    // duplicate_account => the UI routes the user to sign-in (AC-5).
    const status = result.reason === "duplicate_account" ? 409 : 403;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  const confirmUrl = `${env.APP_URL}/api/auth/confirm?token=${result.confirmToken}`;
  const body = confirmEmailBody(confirmUrl);
  await sendEmail({ to: email, subject: body.subject, text: body.text });
  emit("account_confirmation_sent", {});

  return NextResponse.json({
    ok: true,
    // Surface the link to the client ONLY outside production so e2e/dev can
    // confirm without a mail provider. Never exposed in production.
    devConfirmUrl: process.env.NODE_ENV !== "production" ? confirmUrl : undefined,
  });
}

// Map an internal reason to the content-blind telemetry enum (G4).
function enumReason(r: string): string {
  const allowed = new Set([
    "no_invite",
    "invite_expired",
    "invite_used",
    "duplicate_account",
    "email_mismatch",
  ]);
  return allowed.has(r) ? r : "no_invite";
}
