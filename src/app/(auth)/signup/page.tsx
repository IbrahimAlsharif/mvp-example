"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";

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
      <main className="mx-auto max-w-md p-8">
        <h1 className="mb-4 text-2xl font-bold">{t("signupTitle")}</h1>
        <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">
          {t("confirmSent")}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-2 text-2xl font-bold">{t("signupTitle")}</h1>
      <p className="mb-6 text-sm text-neutral-600">{t("inviteOnly")}</p>
      {socialMismatch && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {t("inviteInvalid")}
        </p>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t("password")}</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-neutral-300 p-2.5"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-white disabled:opacity-50"
        >
          {t("submit")}
        </button>
      </form>
      <a
        href="/api/auth/oauth/google"
        className="mt-3 block rounded-lg border border-neutral-300 px-5 py-2.5 text-center"
      >
        {t("withGoogle")}
      </a>
      <Link href="/signin" className="mt-6 block text-sm text-neutral-600 underline">
        {t("alreadyHaveAccount")}
      </Link>
    </main>
  );
}
