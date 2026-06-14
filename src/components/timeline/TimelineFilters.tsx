"use client";

import { useTranslations } from "next-intl";
import type { PrivacyCircle } from "@prisma/client";
import type { TimelineFilters as Filters } from "@/lib/events/filter";

const CIRCLES: { value: PrivacyCircle; icon: string; label: string }[] = [
  { value: "ME_ONLY", icon: "🔒", label: "أنا فقط" },
  { value: "FAMILY", icon: "👪", label: "العائلة" },
  { value: "PUBLIC_UNLISTED", icon: "🔗", label: "رابط خاص" },
];

export type View = "timeline" | "map";

/**
 * Timeline toolbar: view switch (timeline / map), circle multi-select,
 * date-range from/to, and has-photo / has-location toggles. Stateless — all
 * filter state lives in the parent TimelineView; this only renders + emits.
 */
export function TimelineFilters({
  filters,
  onChange,
  view,
  onViewChange,
  shown,
  total,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  view: View;
  onViewChange: (v: View) => void;
  shown: number;
  total: number;
}) {
  const t = useTranslations("timeline");

  function toggleCircle(c: PrivacyCircle) {
    const circles = new Set(filters.circles);
    if (circles.has(c)) circles.delete(c);
    else circles.add(c);
    onChange({ ...filters, circles });
  }

  function setTri(key: "hasMedia" | "hasLocation") {
    // cycle: null (either) → true (only with) → false (only without) → null
    const cur = filters[key];
    const next = cur === null ? true : cur === true ? false : null;
    onChange({ ...filters, [key]: next });
  }

  const dirty =
    filters.circles.size > 0 ||
    filters.from !== null ||
    filters.to !== null ||
    filters.hasMedia !== null ||
    filters.hasLocation !== null;

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-neutral-200/70 bg-white/80 p-4 shadow-card backdrop-blur">
      {/* view switch + count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-neutral-100 p-1" role="tablist">
          <ViewTab active={view === "timeline"} onClick={() => onViewChange("timeline")} label={t("viewTimeline")} icon="📊" />
          <ViewTab active={view === "map"} onClick={() => onViewChange("map")} label={t("viewMap")} icon="🗺️" />
        </div>
        <span className="text-xs font-medium text-neutral-600" data-testid="timeline-count">
          {t("showing", { count: shown, total })}
        </span>
      </div>

      {/* circle chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-neutral-500">{t("filterCircle")}:</span>
        {CIRCLES.map((c) => {
          const on = filters.circles.has(c.value);
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => toggleCircle(c.value)}
              data-testid={`filter-circle-${c.value}`}
              aria-pressed={on}
              className={`tap-target inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                on ? "bg-brand-gradient text-white shadow-brand" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <span aria-hidden>{c.icon}</span>
              {c.label}
            </button>
          );
        })}
      </div>

      {/* date range + toggles */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          {t("filterFrom")}
          <input
            type="date"
            value={filters.from ?? ""}
            onChange={(e) => onChange({ ...filters, from: e.target.value || null })}
            data-testid="filter-from"
            className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs text-neutral-700"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          {t("filterTo")}
          <input
            type="date"
            value={filters.to ?? ""}
            onChange={(e) => onChange({ ...filters, to: e.target.value || null })}
            data-testid="filter-to"
            className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs text-neutral-700"
          />
        </label>

        <TriToggle on={filters.hasMedia} onClick={() => setTri("hasMedia")} label={t("filterHasMedia")} testid="filter-has-media" />
        <TriToggle on={filters.hasLocation} onClick={() => setTri("hasLocation")} label={t("filterHasLocation")} testid="filter-has-location" />

        {dirty && (
          <button
            type="button"
            onClick={() =>
              onChange({ circles: new Set(), from: null, to: null, hasMedia: null, hasLocation: null })
            }
            data-testid="filter-clear"
            className="ms-auto rounded-lg px-2.5 py-1 text-xs font-semibold text-accent-600 hover:bg-accent-50"
          >
            {t("clearFilters")}
          </button>
        )}
      </div>
    </div>
  );
}

function ViewTab({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`tap-target flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-all ${
        active ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
      }`}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </button>
  );
}

// Tri-state toggle: gray (either) → blue solid (only with) → outline (only without).
function TriToggle({ on, onClick, label, testid }: { on: boolean | null; onClick: () => void; label: string; testid: string }) {
  const cls =
    on === true
      ? "bg-brand-gradient text-white shadow-brand"
      : on === false
        ? "border border-brand-300 text-brand-700"
        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200";
  const mark = on === true ? "✓ " : on === false ? "✕ " : "";
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      data-state={on === null ? "either" : on ? "only" : "exclude"}
      className={`tap-target inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${cls}`}
    >
      {mark}
      {label}
    </button>
  );
}
