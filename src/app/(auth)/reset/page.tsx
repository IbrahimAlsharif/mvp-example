"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
      setError(t("inviteInvalid"));
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
      <main className="mx-auto max-w-md p-8">
        <h1 className="mb-4 text-2xl font-bold">{t("resetTitle")}</h1>
        <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">
          {t("resetSent")}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-2xl font-bold">{t("resetTitle")}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm">{token ? t("password") : t("email")}</span>
          <input
            type={token ? "password" : "email"}
            required
            minLength={token ? 8 : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
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
    </main>
  );
}
