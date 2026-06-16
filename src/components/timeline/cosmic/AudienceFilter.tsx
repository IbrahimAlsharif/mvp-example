"use client";

import { useTranslations } from "next-intl";
import type { OwnerScope } from "@/lib/events/filter";

/**
 * Audience filter (FEAT-BVK) — the mockup's segmented الكل / لي / مَن تحب control.
 * Scopes the timeline by ownership (all / mine / others) via EventVM.isOwn. This
 * single 3-way segment subsumes the mockup's separate لحظاتك / لحظات مَن تحب
 * radio (same axis), so there's one place to set audience rather than two
 * redundant controls. Rendered as a radiogroup for assistive tech.
 */
const OPTIONS: { key: OwnerScope; labelKey: string }[] = [
  { key: "all", labelKey: "audienceAll" },
  { key: "mine", labelKey: "audienceMine" },
  { key: "others", labelKey: "audienceOthers" },
];

export function AudienceFilter({
  value,
  onChange,
}: {
  value: OwnerScope;
  onChange: (v: OwnerScope) => void;
}) {
  const t = useTranslations("cosmic");
  return (
    <div
      role="radiogroup"
      aria-label={t("audienceLabel")}
      data-testid="audience-filter"
      className="inline-flex items-center gap-1 rounded-full border border-cosmic-border bg-cosmic-surface/60 p-1"
    >
      {OPTIONS.map((o) => {
        const selected = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.key)}
            data-testid={`audience-${o.key}`}
            className={`rounded-full px-3.5 py-1 text-[12px] font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cosmic-blue/60 ${
              selected
                ? "bg-gradient-to-l from-cosmic-blue to-cosmic-purple text-white shadow-glow-blue"
                : "text-cosmic-muted hover:text-cosmic-ink"
            }`}
          >
            {t(o.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
