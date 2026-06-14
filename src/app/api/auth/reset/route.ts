import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { requestPasswordReset, resetPassword } from "@/lib/auth/accounts";
import { sendEmail, resetEmailBody } from "@/lib/auth/email";
import { emit } from "@/lib/telemetry";

/**
 * Password reset (US-0.1 AC-12). Two actions on one endpoint:
 *  - { email }            => request a reset (always 200, no account enumeration)
 *  - { token, password }  => complete a reset (single-use, expiring token)
 * Never creates a second account; an expired/used token is a clear failure and
 * never silently resets.
 */
const RequestBody = z.object({ email: z.string().email() });
const CompleteBody = z.object({ token: z.string().min(1), password: z.string().min(8) });

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);

  const complete = CompleteBody.safeParse(json);
  if (complete.success) {
    const result = await resetPassword(complete.data.token, complete.data.password);
    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
    }
    emit("password_reset_completed", {});
    return NextResponse.json({ ok: true });
  }

  const request = RequestBody.safeParse(json);
  if (request.success) {
    const { resetToken } = await requestPasswordReset(request.data.email);
    emit("password_reset_requested", {});
    if (resetToken) {
      const link = `${env.APP_URL}/reset?token=${resetToken}`;
      const body = resetEmailBody(link);
      await sendEmail({ to: request.data.email, subject: body.subject, text: body.text });
      return NextResponse.json({
        ok: true,
        devResetUrl: process.env.NODE_ENV !== "production" ? link : undefined,
      });
    }
    // Same response whether or not the account exists (anti-enumeration).
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
}
