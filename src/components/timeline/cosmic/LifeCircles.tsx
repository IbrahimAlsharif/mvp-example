"use client";

import { useTranslations } from "next-intl";

/**
 * "دوائر الحياة" — orbital relationship diagram. PRESENTATIONAL SCAFFOLD: the
 * schema has no relationship model (only the 3 privacy circles), so the people
 * here are placeholder data. Wiring this to real relationships needs a new data
 * model (see plan note). Renders the user at the center with concentric orbits
 * of relations sized/placed by an "importance" ring.
 */

type Relation = { label: string; ring: 1 | 2 | 3; angle: number };

// Placeholder relations mirroring the reference (inner = closest).
const RELATIONS: Relation[] = [
  { label: "زوجة", ring: 1, angle: 90 },
  { label: "أبناء", ring: 1, angle: 210 },
  { label: "أبناء", ring: 1, angle: 330 },
  { label: "عائلة", ring: 2, angle: 60 },
  { label: "إخوة", ring: 2, angle: 0 },
  { label: "أقارب", ring: 2, angle: 300 },
  { label: "اهتمامات", ring: 2, angle: 130 },
  { label: "أقارب", ring: 3, angle: 20 },
  { label: "أصدقاء", ring: 3, angle: 70 },
  { label: "زملاء", ring: 3, angle: 110 },
  { label: "أصدقاء مقرّبون", ring: 3, angle: 160 },
  { label: "معارف", ring: 3, angle: 200 },
  { label: "أطباء", ring: 3, angle: 250 },
  { label: "أطباء", ring: 3, angle: 290 },
];

const RING_RADIUS = { 1: 26, 2: 38, 3: 48 } as const; // % of box

export function LifeCircles() {
  const t = useTranslations("cosmic");
  return (
    <div className="cosmic-panel p-4" data-testid="life-circles">
      <h3 className="mb-3 text-center text-sm font-bold text-cosmic-ink">{t("lifeCircles")}</h3>

      <div className="relative mx-auto aspect-square w-full max-w-[18rem]">
        {/* concentric orbit rings */}
        {[1, 2, 3].map((r) => (
          <span
            key={r}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cosmic-border/70"
            style={{ width: `${RING_RADIUS[r as 1 | 2 | 3] * 2}%`, height: `${RING_RADIUS[r as 1 | 2 | 3] * 2}%` }}
          />
        ))}

        {/* center = the user */}
        <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-cosmic-surface2 text-center shadow-glow-amber ring-1 ring-cosmic-amber/60">
          <span className="text-[10px] font-bold text-cosmic-amber">{t("center")}</span>
        </div>

        {/* relation dots positioned on their orbit */}
        {RELATIONS.map((rel, i) => {
          const rad = (rel.angle * Math.PI) / 180;
          const radius = RING_RADIUS[rel.ring];
          const x = 50 + radius * Math.cos(rad);
          const y = 50 + radius * Math.sin(rad);
          return (
            <div
              key={`${rel.label}-${i}`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-cosmic-amber/80 shadow-glow-amber" />
              <span className="mt-1 whitespace-nowrap text-[9px] text-cosmic-muted">{rel.label}</span>
            </div>
          );
        })}
      </div>

      {/* importance legend */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-cosmic-muted">
        <span>{t("importance")}</span>
        <span className="mx-2 h-1 flex-1 rounded-full bg-gradient-to-l from-cosmic-amber to-cosmic-border" />
        <span>{t("importanceHigh")}</span>
      </div>
      <p className="mt-2 text-center text-[9px] italic text-cosmic-muted/70">{t("scaffoldNote")}</p>
    </div>
  );
}
