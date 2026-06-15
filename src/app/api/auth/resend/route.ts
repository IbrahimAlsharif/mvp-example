import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { resendConfirmation } from "@/lib/auth/accounts";
import { sendEmail, confirmEmailBody } from "@/lib/auth/email";
import { emit } from "@/lib/telemetry";

/**
 * Resend account-confirmation link (US-0.1 AC-8). The confirm page lands here
 * when a link is expired/invalid and the user asks to be re-sent one.
 *
 * Anti-enumeration: like the reset-request path, this always returns 200 with
 * the same shape whether or not an unconfirmed account exists for the email —
 * an attacker cannot probe which addresses have pending accounts. A fresh
 * non-guessable, single-use, expiring token is minted only when there really is
 * an unconfirmed account; already-ACTIVE accounts mint nothing (no-op success).
 */
const Body = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  emit("account_confirmation_resend_requested", {});

  const result = await resendConfirmation(parsed.data.email);
  if (result.ok) {
    const confirmUrl = `${env.APP_URL}/api/auth/confirm?token=${result.confirmToken}`;
    const body = confirmEmailBody(confirmUrl);
    await sendEmail({ to: parsed.data.email, subject: body.subject, text: body.text });
    emit("account_confirmation_sent", { trigger: "resend" });
    return NextResponse.json({
      ok: true,
      // Dev/e2e only: surface the link so the flow is testable without a mail
      // provider. Never exposed in production.
      devConfirmUrl: process.env.NODE_ENV !== "production" ? confirmUrl : undefined,
    });
  }

  // No unconfirmed account for this email — same response as the success case
  // so the endpoint reveals nothing about account existence (anti-enumeration).
  return NextResponse.json({ ok: true });
}
