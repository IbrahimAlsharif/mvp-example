"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AuthCard, Field, SubmitButton, Alert } from "../ui";

export default function SigninPage() {
  return (
    <Suspense>
      <SigninInner />
    </Suspense>
  );
}

function SigninInner() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const justReset = params.get("reset") === "1";
  const alreadyExists = params.get("exists") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!data.ok) {
      setError(t("signinFailed"));
      return;
    }
    router.push("/timeline");
  }

  return (
    <AuthCard title={t("signinTitle")} subtitle={t("signinSubtitle")}>
      {justReset && (
        <div className="mb-4">
          <Alert tone="success">{t("resetDoneHint")}</Alert>
        </div>
      )}
      {alreadyExists && (
        <div className="mb-4">
          <Alert tone="info">{t("accountExists")}</Alert>
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <SubmitButton busy={busy} busyLabel={t("submitting")}>
          {t("submit")}
        </SubmitButton>
      </form>

      <div className="mt-5 flex items-center justify-between text-sm">
        <Link href="/reset" className="text-neutral-600 underline-offset-2 hover:underline">
          {t("forgotPassword")}
        </Link>
        <Link href="/signup" className="font-medium text-neutral-900 underline-offset-2 hover:underline">
          {t("noAccount")}
        </Link>
      </div>
    </AuthCard>
  );
}
