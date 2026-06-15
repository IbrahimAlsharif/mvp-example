"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

/**
 * First-run + revisit nudge for the cosmic timeline (J1.9 — the "come back" half
 * of the bet starts in session 1).
 *
 *  - mode="welcome": shown once after email-confirm lands on /timeline?welcome=1.
 *    A celebratory banner that orients a brand-new user and points at "add your
 *    first event" — the activation nudge the timeline previously lacked.
 *  - mode="revisit": a gentle "welcome back" for a returning user with a
 *    populated timeline, inviting them to add today's memory or browse.
 *
 * Dismissible, and a dismissal is remembered for the session (sessionStorage) so
 * it doesn't reappear on every client re-render / navigation within the session.
 * Purely additive UI — it never blocks the timeline.
 */
export function WelcomeNudge({ mode }: { mode: "welcome" | "revisit" }) {
  const t = useTranslations("cosmic");
  const storageKey = `htn:nudge-dismissed:${mode}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Read dismissal after mount so SSR/CSR markup matches (avoids hydration mismatch).
    try {
      if (sessionStorage.getItem(storageKey) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [storageKey]);

  if (!open) return null;

  function dismiss() {
    setOpen(false);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      /* sessionStorage unavailable — dismissal just won't persist */
    }
  }

  const title = mode === "welcome" ? t("welcomeTitle") : t("revisitTitle");
  const body = mode === "welcome" ? t("welcomeBody") : t("revisitBody");
  const cta = mode === "welcome" ? t("welcomeCta") : t("revisitCta");

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={`welcome-nudge-${mode}`}
      dir="rtl"
      className="mx-auto mt-3 flex w-full max-w-[1500px] items-start gap-3 rounded-2xl border border-cosmic-teal/40 bg-cosmic-teal/10 px-4 py-3 text-cosmic-ink shadow-glow-teal"
    >
      <span aria-hidden className="text-xl leading-none">
        {mode === "welcome" ? "🎉" : "👋"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-cosmic-ink/80">{body}</p>
        <Link
          href="/events/new"
          data-testid="welcome-nudge-cta"
          className="mt-2 inline-flex items-center gap-1 rounded-xl bg-gradient-to-l from-cosmic-blue to-cosmic-purple px-3 py-1.5 text-xs font-bold text-white shadow-glow-blue transition-transform hover:-translate-y-0.5"
        >
          {cta}
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("welcomeDismiss")}
        data-testid="welcome-nudge-dismiss"
        className="shrink-0 rounded-full p-1 text-cosmic-muted transition-colors hover:bg-cosmic-surface2 hover:text-cosmic-ink"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
