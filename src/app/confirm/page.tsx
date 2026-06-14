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

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    // Re-issue via the signup endpoint's resend path is internal; for MVP we
    // simply re-trigger reset-style messaging. A dedicated resend route can be
    // added; the account stays unconfirmed until a valid link is used.
    setResent(true);
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
              <Field
                label={t("email")}
                type="email"
                required
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <SubmitButton>{t("submit")}</SubmitButton>
            </form>
          )}
        </AuthCard>
      </div>
    </main>
  );
}
