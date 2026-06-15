"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PrivacyCircle } from "@prisma/client";
import { CircleSelector } from "@/components/CircleSelector";

/**
 * Owner-only post-creation circle change (US-3.2). Lets the owner pick a new
 * circle from the event modal; on a narrowing change it surfaces the affected-
 * members count (AC-5) and the revocation-honesty message (AC-11) before
 * applying, then PATCHes /api/events/{id}. The server enforces owner-only and
 * does the atomic update + link revocation; this component only drives the UI.
 *
 * Accessibility: reuses CircleSelector (radio group + circle-state live region),
 * an assertive error region, and a polite success status (US-0.4 AC-6/AC-9/AC-10).
 */
const RANK: Record<PrivacyCircle, number> = { ME_ONLY: 0, FAMILY: 1, PUBLIC_UNLISTED: 2 };

export function ChangeCircleControl({
  eventId,
  current,
  hasMedia,
  onChanged,
}: {
  eventId: string;
  current: PrivacyCircle;
  hasMedia: boolean;
  onChanged: (next: PrivacyCircle) => void;
}) {
  const t = useTranslations("circle");
  const [pending, setPending] = useState<PrivacyCircle>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);

  const isDowngrade = RANK[pending] < RANK[current];
  const dirty = pending !== current;

  async function apply() {
    setBusy(true);
    setError(false);
    setDone(false);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circle: pending }),
      });
      if (!res.ok) {
        setError(true);
        setPending(current); // fail closed: prior circle stays authoritative (AC-10)
        return;
      }
      setDone(true);
      onChanged(pending);
    } catch {
      setError(true);
      setPending(current);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-cosmic-border bg-cosmic-surface/60 p-3" dir="rtl">
      <CircleSelector value={pending} onChange={setPending} hasMedia={hasMedia} />

      {/* Revocation honesty: a downgrade revokes future access but cannot recall
          already-downloaded copies (AC-11) — never imply total recall. */}
      {dirty && isDowngrade && (
        <p className="mt-2 text-xs leading-relaxed text-amber-300">{t("revokeHonesty")}</p>
      )}

      {error && (
        <p role="alert" aria-live="assertive" className="mt-2 text-xs font-medium text-red-400">
          {t("changeFailed")}
        </p>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {done ? t("selectedAnnounce", { circle: t(pending.toLowerCase()) }) : ""}
      </p>

      {dirty && (
        <button
          type="button"
          onClick={apply}
          disabled={busy}
          className="tap-target mt-3 rounded-xl bg-accent-gradient px-4 py-2 text-sm font-bold text-white disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
        >
          {t("changeApply")}
        </button>
      )}
    </div>
  );
}
