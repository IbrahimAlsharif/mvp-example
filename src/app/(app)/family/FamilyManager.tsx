"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, UserPlus, Check, X, Trash2, Clock } from "lucide-react";

type Pending = { id: string; tier: string; fromEmail: string | null };
type Sent = { id: string; tier: string; toEmail: string | null };
type Member = { id: string; tier: string; memberAccountId: string; memberEmail: string | null };

/**
 * Family invitation + roster manager (US-3.5). Invite by email, accept/decline
 * pending requests, and revoke members. Revoke shows a confirmation that states
 * the access loss is immediate and that no memory is deleted (G2). Roster-removal
 * propagation is automatic server-side (the read authz re-checks the roster live).
 *
 * Accessibility: invite uses a labeled field + assertive error region; each
 * action is a keyboard-operable button with an accessible name (US-0.4).
 */
export function FamilyManager({
  initialPending,
  initialSent,
  initialMembers,
}: {
  initialPending: Pending[];
  initialSent: Sent[];
  initialMembers: Member[];
}) {
  const t = useTranslations("family");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"FAMILY" | "GENERAL">("FAMILY");
  const [pending, setPending] = useState(initialPending);
  const [sent, setSent] = useState(initialSent);
  const [members, setMembers] = useState(initialMembers);
  const [sentOk, setSentOk] = useState(false);
  const [error, setError] = useState(false);

  // Re-pull the whole roster from the server so every list (incoming, sent,
  // members) reflects the new state without a manual page reload (AC-5 / the
  // post-accept staleness fix).
  async function refresh() {
    const res = await fetch("/api/connections");
    if (!res.ok) return;
    const data = await res.json();
    setPending(data.pending ?? []);
    setSent(data.sent ?? []);
    setMembers(data.members ?? []);
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    setSentOk(false);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tier }),
      });
      if (!res.ok) return setError(true);
      setSentOk(true);
      setEmail("");
      await refresh(); // surface the new outgoing invite immediately
    } catch {
      setError(true);
    }
  }

  async function act(id: string, action: "accept" | "decline") {
    const res = await fetch(`/api/connections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    // Refetch so an accepted request moves out of "pending" and INTO "members"
    // in the same interaction — no manual reload needed.
    if (res.ok) await refresh();
    else setError(true);
  }

  async function revoke(id: string) {
    if (!window.confirm(t("revokeConfirm"))) return; // confirmation before applying (AC-9)
    const res = await fetch(`/api/connections/${id}`, { method: "DELETE" });
    if (res.ok) setMembers((m) => m.filter((x) => x.id !== id));
    else setError(true);
  }

  const tierLabel = (ti: string) => t(ti === "FAMILY" ? "tierFamily" : "tierGeneral");

  return (
    <main className="mx-auto max-w-2xl px-5 py-8" dir="rtl">
      <Link href="/timeline" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:underline">
        <ArrowRight className="h-4 w-4" aria-hidden /> {t("back")}
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-neutral-900">{t("title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>

      {error && (
        <p role="alert" aria-live="assertive" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {t("failed")}
        </p>
      )}

      {/* Invite */}
      <form onSubmit={invite} className="mt-6 flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
        <label className="text-sm font-semibold text-neutral-700" htmlFor="invite-email">{t("inviteLabel")}</label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("invitePlaceholder")}
          className="rounded-xl border border-neutral-300 px-3.5 py-2.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
        <label className="text-sm font-semibold text-neutral-700" htmlFor="invite-tier">{t("inviteTier")}</label>
        <select
          id="invite-tier"
          value={tier}
          onChange={(e) => setTier(e.target.value as "FAMILY" | "GENERAL")}
          className="rounded-xl border border-neutral-300 px-3.5 py-2.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
        >
          <option value="FAMILY">{t("tierFamily")}</option>
          <option value="GENERAL">{t("tierGeneral")}</option>
        </select>
        <button
          type="submit"
          className="tap-target inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-gradient px-5 py-2.5 font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
        >
          <UserPlus className="h-4 w-4" aria-hidden /> {t("inviteSend")}
        </button>
        <p role="status" aria-live="polite" className="text-xs text-emerald-700">
          {sentOk ? t("inviteSent") : ""}
        </p>
      </form>

      {/* Sent (outgoing) invitations — so the inviter can tell it worked (AC-5) */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold text-neutral-700">{t("sentTitle")}</h2>
        {sent.length === 0 ? (
          <p className="text-sm text-neutral-400">{t("sentNone")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sent.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-neutral-800">{s.toEmail ?? t("unknownAccount")}</span>
                  <span className="text-xs text-neutral-500">{tierLabel(s.tier)}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  <Clock className="h-3.5 w-3.5" aria-hidden /> {t("statusPending")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending incoming */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold text-neutral-700">{t("pendingTitle")}</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-neutral-400">{t("pendingNone")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-neutral-800">{p.fromEmail ?? t("unknownAccount")}</span>
                  <span className="text-xs text-neutral-500">{tierLabel(p.tier)}</span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => act(p.id, "accept")} className="tap-target inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white">
                    <Check className="h-3.5 w-3.5" /> {t("accept")}
                  </button>
                  <button type="button" onClick={() => act(p.id, "decline")} className="tap-target inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700">
                    <X className="h-3.5 w-3.5" /> {t("decline")}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Members */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold text-neutral-700">{t("membersTitle")}</h2>
        {members.length === 0 ? (
          <p className="text-sm text-neutral-400">{t("membersNone")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-neutral-800">{m.memberEmail ?? t("unknownAccount")}</span>
                  <span className="text-xs text-neutral-500">{tierLabel(m.tier)}</span>
                </span>
                <button type="button" onClick={() => revoke(m.id)} className="tap-target inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">
                  <Trash2 className="h-3.5 w-3.5" /> {t("revoke")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
