"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AuthCard, Field, SubmitButton, Alert, Divider } from "../ui";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const router = useRouter();
  const invite = params.get("invite") ?? "";
  const socialMismatch = params.get("social") === "mismatch";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, invite: invite || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.status === 409) {
      // duplicate account => route to sign-in (AC-5)
      router.push("/signin?exists=1");
      return;
    }
    if (!data.ok) {
      setError(reasonText(data.reason));
      return;
    }
    setSent(true);
    // Dev convenience: in non-prod the confirm link is returned so you can click through.
    if (data.devConfirmUrl) {
      // eslint-disable-next-line no-console
      console.info("[dev] confirm:", data.devConfirmUrl);
    }
  }

  function reasonText(reason: string): string {
    if (reason === "duplicate_account") return t("alreadyHaveAccount");
    if (reason?.startsWith("invite") || reason === "no_invite" || reason === "email_mismatch") {
      return t("inviteInvalid");
    }
    return t("inviteInvalid");
  }

  if (sent) {
    return (
      <AuthCard title={t("signupTitle")}>
        <Alert tone="success">{t("confirmSent")}</Alert>
        <Link
          href="/signin"
          className="mt-5 block text-center text-sm text-neutral-600 underline-offset-2 hover:underline"
        >
          {t("backToSignin")}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("signupTitle")} subtitle={t("inviteOnly")}>
      {socialMismatch && (
        <div className="mb-4">
          <Alert tone="info">{t("inviteInvalid")}</Alert>
        </div>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          label={t("email")}
          type="email"
          required
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label={t("password")}
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          hint={t("passwordHint")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <SubmitButton busy={busy} busyLabel={t("submitting")}>
          {t("submit")}
        </SubmitButton>
      </form>

      <div className="mt-5">
        <Divider label={t("orDivider")} />
        <a
          href="/api/auth/oauth/google"
          className="mt-4 flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 py-2.5 font-medium text-neutral-800 transition hover:bg-neutral-50"
        >
          {t("withGoogle")}
        </a>
      </div>

      <Link
        href="/signin"
        className="mt-6 block text-center text-sm text-neutral-600 underline-offset-2 hover:underline"
      >
        {t("alreadyHaveAccount")}
      </Link>
    </AuthCard>
  );
}
