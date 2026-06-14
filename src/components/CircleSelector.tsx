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
      <legend className="mb-1 text-sm font-medium">{t("label")}</legend>
      {ORDER.map((c) => {
        const k = KEY[c];
        const selected = value === c;
        return (
          <label
            key={c}
            data-testid={`circle-option-${k}`}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
              selected ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
            }`}
          >
            <input
              type="radio"
              name="circle"
              value={c}
              checked={selected}
              onChange={() => select(c)}
              className="mt-1"
            />
            <span className="flex flex-col">
              <span className="font-medium">{t(k)}</span>
              <span className="text-sm text-neutral-600">{t(`${k}_help`)}</span>
            </span>
          </label>
        );
      })}

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
