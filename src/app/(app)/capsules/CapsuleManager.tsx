"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Lock, Trash2, Send } from "lucide-react";

type Capsule = { id: string; type: string; recipientCircle: string; unlockLocalDay: string; status: string };
const TYPES = ["MESSAGE", "VIDEO", "LETTER", "GOAL", "PLAN"] as const;

/**
 * Future Capsule manager (US-4.2, J6). Create + seal a date-triggered capsule
 * (type, content, future unlock date, recipient circle) and view/cancel pending
 * ones. Only a FUTURE date is accepted (the server re-validates). The owner's
 * seal-time UTC offset is sent so the unlock instant resolves timezone-correctly.
 */
export function CapsuleManager({ initial }: { initial: Capsule[] }) {
  const t = useTranslations("capsules");
  const [list, setList] = useState(initial);
  const [type, setType] = useState<(typeof TYPES)[number]>("LETTER");
  const [note, setNote] = useState("");
  const [recipientCircle, setRecipientCircle] = useState("FAMILY");
  const [unlockLocalDay, setUnlockLocalDay] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function seal(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          note: note.trim() || null,
          recipientCircle,
          unlockLocalDay,
          // Owner's seal-time offset (minutes east of UTC) — the authoritative
          // resolver for the unlock instant (AC-7).
          unlockOffsetMin: -new Date().getTimezoneOffset(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.reason === "not_future" ? t("errFuture") : t("errFailed"));
        return;
      }
      // Refresh the pending list.
      const listRes = await fetch("/api/capsules");
      if (listRes.ok) setList((await listRes.json()).capsules);
      setNote("");
      setUnlockLocalDay("");
    } catch {
      setError(t("errFailed"));
    }
  }

  async function cancel(id: string) {
    if (!window.confirm(t("cancelConfirm"))) return; // explicit action (AC-11)
    const res = await fetch(`/api/capsules/${id}`, { method: "DELETE" });
    if (res.ok) setList((l) => l.filter((c) => c.id !== id));
  }

  // The unlock date must be STRICTLY future — the server rejects today as
  // `not_future`. Constrain the picker to tomorrow onward so the UI rule matches
  // the server rule (no confusing "pick today → rejected").
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Human label for a capsule's recipient circle (shown on each pending row so a
  // misconfigured recipient is visible before unlock — AC-8).
  const recipientLabel = (circle: string) =>
    circle === "ME_ONLY" ? t("recipient_me") : t("recipient_family");

  return (
    <main className="mx-auto max-w-2xl px-5 py-8" dir="rtl">
      <Link href="/timeline" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:underline">
        <ArrowRight className="h-4 w-4" aria-hidden /> {t("back")}
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-neutral-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>

      {error && (
        <p role="alert" aria-live="assertive" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={seal} className="mt-6 flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
        <label className="text-sm font-semibold text-neutral-700" htmlFor="cap-type">{t("type")}</label>
        <select id="cap-type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className="rounded-xl border border-neutral-300 px-3.5 py-2.5">
          {TYPES.map((ty) => <option key={ty} value={ty}>{t(`type_${ty.toLowerCase()}` as "type_message")}</option>)}
        </select>

        <label className="text-sm font-semibold text-neutral-700" htmlFor="cap-note">{t("content")}</label>
        <textarea id="cap-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t("contentPlaceholder")} className="rounded-xl border border-neutral-300 px-3.5 py-2.5" />

        <label className="text-sm font-semibold text-neutral-700" htmlFor="cap-recipient">{t("recipient")}</label>
        <select id="cap-recipient" value={recipientCircle} onChange={(e) => setRecipientCircle(e.target.value)} className="rounded-xl border border-neutral-300 px-3.5 py-2.5">
          <option value="ME_ONLY">{t("recipient_me")}</option>
          <option value="FAMILY">{t("recipient_family")}</option>
        </select>

        <label className="text-sm font-semibold text-neutral-700" htmlFor="cap-date">{t("unlockDate")}</label>
        <input id="cap-date" type="date" required min={tomorrow} value={unlockLocalDay} onChange={(e) => setUnlockLocalDay(e.target.value)} className="rounded-xl border border-neutral-300 px-3.5 py-2.5" />

        <button type="submit" className="tap-target inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent-gradient px-5 py-2.5 font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/40">
          <Send className="h-4 w-4" aria-hidden /> {t("seal")}
        </button>
      </form>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold text-neutral-700">{t("pendingTitle")}</h2>
        {list.length === 0 ? (
          <p className="text-sm text-neutral-400">{t("pendingNone")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                  {t(`type_${c.type.toLowerCase()}` as "type_message")} · {c.unlockLocalDay} · {recipientLabel(c.recipientCircle)}
                  {c.status === "UNDELIVERABLE" && <span className="text-amber-600"> · {t("undeliverable")}</span>}
                </span>
                <button type="button" onClick={() => cancel(c.id)} className="tap-target inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600">
                  <Trash2 className="h-3.5 w-3.5" /> {t("cancel")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
