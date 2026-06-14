"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AuthCard, Field, SubmitButton, Alert } from "../ui";

export default function ResetPage() {
  return (
    <Suspense>
      <ResetInner />
    </Suspense>
  );
}

function ResetInner() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");

  const [value, setValue] = useState(""); // email (request) or new password (complete)
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = token ? { token, password: value } : { email: value };
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!data.ok) {
      setError(t("resetFailed"));
      return;
    }
    if (token) {
      router.push("/signin?reset=1");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AuthCard title={t("resetTitle")}>
        <Alert tone="success">{t("resetSent")}</Alert>
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
    <AuthCard
      title={t("resetTitle")}
      subtitle={token ? t("resetSubtitleComplete") : t("resetSubtitleRequest")}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          label={token ? t("newPassword") : t("email")}
          type={token ? "password" : "email"}
          required
          minLength={token ? 8 : undefined}
          autoComplete={token ? "new-password" : "email"}
          placeholder={token ? undefined : t("emailPlaceholder")}
          hint={token ? t("passwordHint") : undefined}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <SubmitButton busy={busy} busyLabel={t("submitting")}>
          {t("submit")}
        </SubmitButton>
      </form>

      <Link
        href="/signin"
        className="mt-6 block text-center text-sm text-neutral-600 underline-offset-2 hover:underline"
      >
        {t("backToSignin")}
      </Link>
    </AuthCard>
  );
}
