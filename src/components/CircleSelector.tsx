"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PrivacyCircle } from "@prisma/client";
import { PublicWarningDialog } from "./PublicWarningDialog";

/**
 * Privacy-circle selector (US-3.1 AC-1/AC-4/AC-5, G1/G6).
 *
 * Offers exactly three circles with Me-Only pre-selected (G1). Each option
 * states who can see the memory, in unambiguous Arabic, RTL-correct (G6,
 * perceived-trust). Selecting Public on a media-bearing event opens the blocking
 * child-media warning before the change is applied (AC-4, content-blind).
 */
const ORDER: PrivacyCircle[] = ["ME_ONLY", "FAMILY", "PUBLIC_UNLISTED"];
const KEY: Record<PrivacyCircle, string> = {
  ME_ONLY: "me_only",
  FAMILY: "family",
  PUBLIC_UNLISTED: "public_unlisted",
};

export function CircleSelector({
  value,
  onChange,
  hasMedia,
}: {
  value: PrivacyCircle;
  onChange: (c: PrivacyCircle) => void;
  hasMedia: boolean;
}) {
  const t = useTranslations("circle");
  const [pendingPublic, setPendingPublic] = useState(false);

  function select(c: PrivacyCircle) {
    if (c === "PUBLIC_UNLISTED" && hasMedia) {
      // Defer applying Public until the blocking warning is acknowledged (AC-4).
      setPendingPublic(true);
      return;
    }
    onChange(c);
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
        open={pendingPublic}
        onConfirm={() => {
          setPendingPublic(false);
          onChange("PUBLIC_UNLISTED");
        }}
        onCancel={() => setPendingPublic(false)} // leaves circle unchanged (AC-4)
      />
    </fieldset>
  );
}
