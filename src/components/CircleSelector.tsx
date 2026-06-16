"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PrivacyCircle } from "@prisma/client";
import { Lock, Globe, Link2, Users } from "lucide-react";
import { PublicWarningDialog } from "./PublicWarningDialog";

/**
 * Privacy-circle selector (US-3.1 AC-1/AC-4/AC-5, G1/G6).
 *
 * Offers four circles with Me-Only pre-selected (G1). Each option states who can
 * see the memory, in unambiguous Arabic, RTL-correct (G6, perceived-trust).
 * Selecting either public circle (PUBLIC_UNLISTED link-only, or PUBLIC directly
 * viewable by any signed-in user) on a media-bearing event opens the blocking
 * child-media warning before the change is applied (AC-4, content-blind). PUBLIC
 * is the widest reach, so it is warned at least as strongly as PUBLIC_UNLISTED.
 */
const ORDER: PrivacyCircle[] = ["ME_ONLY", "FAMILY", "PUBLIC_UNLISTED", "PUBLIC"];
const KEY: Record<PrivacyCircle, string> = {
  ME_ONLY: "me_only",
  FAMILY: "family",
  PUBLIC_UNLISTED: "public_unlisted",
  PUBLIC: "public",
};
/** Circles that expose a media-bearing event beyond the owner+family roster and
 *  must trigger the blocking child-media warning (AC-4, content-blind). */
const PUBLIC_CIRCLES: PrivacyCircle[] = ["PUBLIC_UNLISTED", "PUBLIC"];

/** Icon per circle for the pill variant (matches the moment-popup mockup). */
const PILL_ICON: Record<PrivacyCircle, typeof Lock> = {
  ME_ONLY: Lock,
  FAMILY: Users,
  PUBLIC_UNLISTED: Link2,
  PUBLIC: Globe,
};

export function CircleSelector({
  value,
  onChange,
  hasMedia,
  compact = false,
  variant = compact ? "dropdown" : "cards",
}: {
  value: PrivacyCircle;
  onChange: (c: PrivacyCircle) => void;
  hasMedia: boolean;
  /**
   * Compact mode renders a single-line dropdown instead of the four-card list
   * — for space-constrained surfaces like the cosmic quick-add popup, where the
   * full cards push the Save button off-screen. The public-media warning (AC-4)
   * still fires identically, so the privacy guarantee is unchanged.
   * @deprecated prefer `variant`; kept for back-compat (compact → dropdown).
   */
  compact?: boolean;
  /**
   * Visual variant. `cards` = the full four-card list (full forms); `dropdown` =
   * single-line select (space-constrained); `pills` = horizontal icon pills, the
   * "من يراها؟" row in the redesigned moment popup (FEAT-JZW). All three route
   * selection through the same `select()`, so the AC-4 public-media warning fires
   * identically regardless of variant.
   */
  variant?: "cards" | "dropdown" | "pills";
}) {
  const t = useTranslations("circle");
  // Holds the public circle awaiting child-media-warning acknowledgement, or
  // null when no warning is pending (AC-4). Tracks WHICH public circle so the
  // dialog applies the one the owner actually picked.
  const [pendingPublic, setPendingPublic] = useState<PrivacyCircle | null>(null);

  function select(c: PrivacyCircle) {
    if (PUBLIC_CIRCLES.includes(c) && hasMedia) {
      // Defer applying any public circle until the blocking warning is
      // acknowledged (AC-4).
      setPendingPublic(c);
      return;
    }
    onChange(c);
  }

  if (variant === "pills") {
    return (
      <div className="flex flex-wrap items-center gap-1.5" data-testid="circle-selector" role="radiogroup">
        {ORDER.map((c) => {
          const Icon = PILL_ICON[c];
          const selected = value === c;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => select(c)}
              data-testid={`circle-pill-${KEY[c]}`}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60 ${
                selected
                  ? "border-cosmic-amber bg-cosmic-amber/15 text-cosmic-amber"
                  : "border-cosmic-border text-cosmic-muted hover:bg-cosmic-surface2 hover:text-cosmic-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {t(KEY[c])}
            </button>
          );
        })}
        <span role="status" aria-live="polite" className="sr-only">
          {t("selectedAnnounce", { circle: t(KEY[value]) })}
        </span>
        <PublicWarningDialog
          open={pendingPublic !== null}
          onConfirm={() => {
            const next = pendingPublic;
            setPendingPublic(null);
            if (next) onChange(next);
          }}
          onCancel={() => setPendingPublic(null)}
        />
      </div>
    );
  }

  if (variant === "dropdown") {
    return (
      <div className="flex items-center gap-2" data-testid="circle-selector">
        <label htmlFor="circle-compact" className="shrink-0 text-[13px] font-bold text-cosmic-muted">
          {t("label")}
        </label>
        <select
          id="circle-compact"
          value={value}
          onChange={(e) => select(e.target.value as PrivacyCircle)}
          data-testid="circle-select"
          className="min-h-[44px] flex-1 rounded-lg border border-cosmic-border bg-cosmic-surface/60 px-2 py-2 text-sm font-semibold text-cosmic-ink focus:outline-none focus:ring-2 focus:ring-cosmic-blue/60"
        >
          {ORDER.map((c) => (
            <option key={c} value={c}>
              {t(KEY[c])}
            </option>
          ))}
        </select>

        {/* Announce the current circle to assistive tech (US-0.4 AC-9). */}
        <span role="status" aria-live="polite" className="sr-only">
          {t("selectedAnnounce", { circle: t(KEY[value]) })}
        </span>

        <PublicWarningDialog
          open={pendingPublic !== null}
          onConfirm={() => {
            const next = pendingPublic;
            setPendingPublic(null);
            if (next) onChange(next);
          }}
          onCancel={() => setPendingPublic(null)}
        />
      </div>
    );
  }

  return (
    <fieldset className="flex flex-col gap-2" data-testid="circle-selector">
      <legend className="mb-1 text-sm font-semibold text-neutral-700">{t("label")}</legend>
      {ORDER.map((c) => {
        const k = KEY[c];
        const selected = value === c;
        return (
          <label
            key={c}
            data-testid={`circle-option-${k}`}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all duration-200 ${
              selected
                ? "border-brand bg-brand-50 ring-2 ring-brand/15"
                : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            <input
              type="radio"
              name="circle"
              value={c}
              checked={selected}
              onChange={() => select(c)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
            />
            <span className="flex flex-col">
              <span className="font-semibold text-neutral-800">{t(k)}</span>
              <span className="text-sm text-neutral-600">{t(`${k}_help`)}</span>
            </span>
          </label>
        );
      })}

      {/* Announce the current circle to assistive tech, not by color/position
          alone (US-0.4 AC-9). Polite so it follows the user's selection. */}
      <span role="status" aria-live="polite" className="sr-only">
        {t("selectedAnnounce", { circle: t(KEY[value]) })}
      </span>

      <PublicWarningDialog
        open={pendingPublic !== null}
        onConfirm={() => {
          const next = pendingPublic;
          setPendingPublic(null);
          if (next) onChange(next); // apply the exact public circle the owner picked
        }}
        onCancel={() => setPendingPublic(null)} // leaves circle unchanged (AC-4)
      />
    </fieldset>
  );
}
