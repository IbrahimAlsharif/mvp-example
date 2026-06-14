"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AuthCard, Field, SubmitButton, Alert } from "../(auth)/ui";

/**
 * Confirmation error / resend screen (US-0.1 AC-8). The happy path never lands
 * here — /api/auth/confirm redirects straight to the timeline on success. This
 * page only shows when a link is invalid/expired, and offers a resend.
 */
export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmInner />
    </Suspense>
  );
}

function ConfirmInner() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const error = params.get("error");
  const [email, setEmail] = useState("");
  const [resent, setResent] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setFailed(false);
    try {
      // Re-issue a fresh single-use confirmation link (US-0.1 AC-8). The route is
      // anti-enumeration: it returns ok whether or not an unconfirmed account
      // exists, so we always show the same "sent" confirmation on a 2xx.
      const res = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      setResent(true);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <AuthCard title={t("signupTitle")}>
          {error && (
            <div className="mb-4">
              <Alert tone="error">{t("inviteInvalid")}</Alert>
            </div>
          )}
          {resent ? (
            <Alert tone="success">{t("confirmSent")}</Alert>
          ) : (
            <form onSubmit={resend} className="flex flex-col gap-4">
              <p className="text-sm text-neutral-600">{t("resendSubtitle")}</p>
              {failed && <Alert tone="error">{t("resetFailed")}</Alert>}
              <Field
                label={t("email")}
                type="email"
                required
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <SubmitButton busy={pending} busyLabel={t("submitting")}>
                {t("submit")}
              </SubmitButton>
            </form>
          )}
        </AuthCard>
      </div>
    </main>
  );
}
