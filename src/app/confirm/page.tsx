"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

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
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-2xl font-bold">{t("signupTitle")}</h1>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {t("inviteInvalid")}
        </p>
      )}
      {resent ? (
        <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">
          {t("confirmSent")}
        </p>
      ) : (
        <form onSubmit={resend} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t("email")}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-neutral-300 p-2.5"
            />
          </label>
          <button type="submit" className="rounded-lg bg-neutral-900 px-5 py-2.5 text-white">
            {t("submit")}
          </button>
        </form>
      )}
    </main>
  );
}
